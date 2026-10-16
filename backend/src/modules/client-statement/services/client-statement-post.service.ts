import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { FiscalYearsService } from '../../accounting/fiscal-years.service';
import { DetailAccountsService } from '../../accounting/detail-accounts.service';

@Injectable()
export class ClientStatementPostService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
    private detailAccounts: DetailAccountsService,
  ) {}

  private async findAccount(codePrefix: string, label: string) {
    const acc = await this.prisma.account.findFirst({
      where: { code: { startsWith: codePrefix }, isPostable: true, isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!acc) throw new BadRequestException('حساب ' + label + ' (کد ' + codePrefix + '.*) در کدینگ یافت نشد');
    return acc;
  }

  async post(id: string, userId?: string) {
    const s = await this.prisma.clientStatement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true, name: true, clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    if (s.status === 'PAID') throw new BadRequestException('قبلاً پرداخت شده است');
    if (s.journalEntryId) throw new BadRequestException('سند حسابداری قبلاً ثبت شده است');

    const fiscalYear = await this.fiscalYears.assertPeriodOpen(s.periodEnd);

    const receivableAcc = await this.findAccount('1.1.2', 'حساب دریافتنی');
    const prepaidLiabilityAcc = await this.findAccount('2.1', 'پیش‌پرداخت دریافتی');
    const revenueAcc = await this.findAccount('4', 'درآمد');

    const netPayable = Number(s.netPayable);
    const prepaymentDeduction = Number(s.prepaymentDeductionAmount);
    const contractorShare = Number(s.contractorShareAmount);

    //moved

    // ═══════════════════════════════════════════════════════
    // بستن هزینه‌های کارفرما مرتبط با این پروژه و کارفرما
    // ═══════════════════════════════════════════════════════
    const clientId = s.project?.clientId || null;
    let passThroughExpenses: any[] = [];
    let passThroughAmount = 0;
    let passThroughAcc: any = null;

    if (clientId) {
      // حساب واسط اختصاصی این کارفرما
      passThroughAcc = await this.detailAccounts.ensureDetailAccount(this.prisma, {
        detailType: 'PASS_THROUGH_CLIENT' as any,
        entityId: clientId,
        entityName: s.project?.client?.name || 'کارفرما',
      });

      if (passThroughAcc) {
        passThroughExpenses = await this.prisma.expense.findMany({
          where: {
            projectId: s.projectId,
            clientId,
            costType: 'CLIENT_PASS_THROUGH',
            passThroughClosedInStatementId: null,
            status: 'POSTED',
            deletedAt: null,
            expenseDate: { lte: s.periodEnd },
          },
          select: { id: true, totalAmount: true, code: true },
        });
        passThroughAmount = passThroughExpenses.reduce(
          (sum, e) => sum + Number(e.totalAmount),
          0,
        );
      }
    }

    if (netPayable <= 0 && prepaymentDeduction <= 0 && passThroughAmount <= 0) throw new BadRequestException("مبالغ صورت‌وضعیت صفر است — ابتدا ردیف یا هزینه کارفرما اضافه کنید");

    return this.prisma.$transaction(async (tx) => {
      const fyUpdate = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyUpdate.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyUpdate.code + '-' + String(entryNumber).padStart(5, '0');

      const lines: any[] = [];
      let sortOrder = 1;

      // Dr: دریافتنی از کارفرما (شامل هزینه کارفرما)
      const receivableTotal = netPayable + passThroughAmount;
      if (receivableTotal > 0) {
        lines.push({
          accountId: receivableAcc.id,
          description: 'دریافتنی صورت‌وضعیت ' + s.code + ' - ' + (s.project?.name || ''),
          debit: receivableTotal, credit: 0, projectId: s.projectId, sortOrder: sortOrder++,
        });
      }

      // Dr: استهلاک پیش‌پرداخت
      if (prepaymentDeduction > 0) {
        lines.push({
          accountId: prepaidLiabilityAcc.id,
          description: 'استهلاک پیش‌پرداخت ' + s.code,
          debit: prepaymentDeduction, credit: 0, projectId: s.projectId, sortOrder: sortOrder++,
        });
      }

      // Cr: درآمد
      lines.push({
        accountId: revenueAcc.id,
        description: 'درآمد صورت‌وضعیت ' + s.code + ' - ' + (s.project?.name || ''),
        debit: 0, credit: contractorShare, projectId: s.projectId, sortOrder: sortOrder++,
      });

      // Cr: بستن حساب واسط کارفرما
      if (passThroughAmount > 0 && passThroughAcc) {
        lines.push({
          accountId: passThroughAcc.id,
          description: 'بستن هزینه‌های کارفرما — ' + s.code + ' (' + passThroughExpenses.length + ' مورد)',
          debit: 0, credit: passThroughAmount, projectId: s.projectId,
          partnerId: clientId ?? undefined, sortOrder: sortOrder++,
        });
      }

      const totalDebit = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
      const totalCredit = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new BadRequestException(
          'عدم توازن در سند: بدهکار ' + totalDebit.toFixed(2) + ' ≠ بستانکار ' + totalCredit.toFixed(2),
        );
      }

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode, entryNumber, entryDate: s.periodEnd, fiscalYearId: fiscalYear.id,
          description: 'صورت‌وضعیت کارفرما ' + s.code + ' - ' + (s.project?.name || ''),
          reference: s.code, status: 'POSTED', postedAt: new Date(),
          sourceType: 'CLIENT_STATEMENT', sourceId: s.id, createdById: userId,
          totalDebit, totalCredit, lines: { create: lines },
        },
      });

      // علامت‌گذاری هزینه‌های کارفرما به‌عنوان بسته‌شده
      if (passThroughExpenses.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: passThroughExpenses.map((e) => e.id) } },
          data: { passThroughClosedInStatementId: id },
        });
      }

      return tx.clientStatement.update({
        where: { id },
        data: {
          journalEntryId: entry.id,
          passThroughAmount,
          status: s.status === 'DRAFT' || s.status === 'SUBMITTED' ? 'APPROVED' : s.status,
          approvedAt: s.approvedAt || new Date(),
          approvedById: s.approvedById || userId,
        },
        include: { journalEntry: { select: { id: true, code: true } } },
      });
    });
  }
}
