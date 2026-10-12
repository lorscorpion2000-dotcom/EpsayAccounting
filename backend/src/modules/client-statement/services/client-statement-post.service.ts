import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { FiscalYearsService } from '../../accounting/fiscal-years.service';

@Injectable()
export class ClientStatementPostService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
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
      include: { project: { select: { id: true, name: true } } },
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

    if (netPayable <= 0 && prepaymentDeduction <= 0) throw new BadRequestException('مبالغ صورت‌وضعیت صفر است');

    return this.prisma.$transaction(async (tx) => {
      const fyUpdate = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyUpdate.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyUpdate.code + '-' + String(entryNumber).padStart(5, '0');

      const lines: any[] = [];
      if (netPayable > 0) {
        lines.push({
          accountId: receivableAcc.id,
          description: 'دریافتنی صورت‌وضعیت ' + s.code + ' - ' + s.project.name,
          debit: netPayable, credit: 0, projectId: s.projectId, sortOrder: 1,
        });
      }
      if (prepaymentDeduction > 0) {
        lines.push({
          accountId: prepaidLiabilityAcc.id,
          description: 'استهلاک پیش‌پرداخت ' + s.code,
          debit: prepaymentDeduction, credit: 0, projectId: s.projectId, sortOrder: 2,
        });
      }
      lines.push({
        accountId: revenueAcc.id,
        description: 'درآمد صورت‌وضعیت ' + s.code + ' - ' + s.project.name,
        debit: 0, credit: contractorShare, projectId: s.projectId, sortOrder: 3,
      });

      const totalDebit = netPayable + prepaymentDeduction;
      const totalCredit = contractorShare;
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new BadRequestException('عدم توازن در سند: بدهکار ' + totalDebit.toFixed(2) + ' ≠ بستانکار ' + totalCredit.toFixed(2));
      }

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode, entryNumber, entryDate: s.periodEnd, fiscalYearId: fiscalYear.id,
          description: 'صورت‌وضعیت کارفرما ' + s.code + ' - ' + s.project.name,
          reference: s.code, status: 'POSTED', postedAt: new Date(),
          sourceType: 'CLIENT_STATEMENT', sourceId: s.id, createdById: userId,
          totalDebit, totalCredit, lines: { create: lines },
        },
      });

      return tx.clientStatement.update({
        where: { id },
        data: {
          journalEntryId: entry.id,
          status: s.status === 'DRAFT' || s.status === 'SUBMITTED' ? 'APPROVED' : s.status,
          approvedAt: s.approvedAt || new Date(),
          approvedById: s.approvedById || userId,
        },
        include: { journalEntry: { select: { id: true, code: true } } },
      });
    });
  }
}
