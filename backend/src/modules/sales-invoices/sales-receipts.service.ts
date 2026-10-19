import { JournalsService } from '../accounting/journals.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { FiscalYearsService } from '../accounting/fiscal-years.service';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class SalesReceiptsService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
    private journals: JournalsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'salesReceipt', 'code', 'SR-' + year + '-', { pad: 5 });
  }

  async findAll(query?: { customerId?: string; invoiceId?: string }) {
    const where: any = {};
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.invoiceId)  where.invoiceId  = query.invoiceId;
    return this.prisma.salesReceipt.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        invoice:  { select: { id: true, code: true, invoiceNumber: true, totalAmount: true } },
        bankAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: { receiptDate: 'desc' },
    });
  }

  async receipt(dto: CreateReceiptDto, userId?: string) {
    const inv = await this.prisma.salesInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: { customer: true },
    });
    if (!inv) throw new NotFoundException('فاکتور فروش یافت نشد');
    if (inv.status === 'DRAFT') throw new BadRequestException('ابتدا فاکتور را تأیید کنید');
    if (inv.status === 'PAID')  throw new BadRequestException('فاکتور کاملاً دریافت شده');
    if (inv.status === 'CANCELLED') throw new BadRequestException('فاکتور لغو شده');

    const remaining = Number(inv.totalAmount) - Number(inv.receivedAmount);
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(`مبلغ دریافت (${dto.amount}) بیش از مانده (${remaining}) است`);
    }

    // حساب بستانکار (نقد یا بانک)
    let creditAccountId: string;
    if (dto.method === 'CASH') {
      const map = await this.prisma.accountMapping.findUnique({ where: { code: 'SALE_CONTRACT_CASH' } });
      let cash = map?.debitAccountId
        ? await this.prisma.account.findUnique({ where: { id: map.debitAccountId } })
        : null;
      if (!cash) cash = await this.prisma.account.findFirst({ where: { code: { startsWith: '1.1.1.' }, isPostable: true } });
      if (!cash) throw new BadRequestException('حساب نقد پیدا نشد');
      creditAccountId = cash.id;
    } else if (dto.method === 'BANK_TRANSFER') {
      if (!dto.bankAccountId) throw new BadRequestException('برای انتقال بانکی، bankAccountId الزامی است');
      const bank = await this.prisma.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!bank) throw new BadRequestException('حساب بانکی پیدا نشد');
      let glId = bank.glAccountId;
      if (!glId) {
        const detail = await this.prisma.account.findFirst({
          where: { detailId: bank.id, detailType: 'BANK' as any, isPostable: true },
        });
        if (!detail) throw new BadRequestException('تفصیل بانک پیدا نشد: ' + bank.name);
        glId = detail.id;
      }
      creditAccountId = glId;
    } else {
      throw new BadRequestException('روش ' + dto.method + ' فعلاً پشتیبانی نمی‌شود');
    }

    // حساب بدهکار = تفصیل مشتری
    const partnerId = inv.partnerId;
    if (!partnerId) throw new BadRequestException('فاکتور Partner ندارد — ابتدا تأیید کنید');

    const parent = await this.prisma.account.findFirst({ where: { code: '1.1.2' } });
    if (!parent) throw new BadRequestException('معین 1.1.2 پیدا نشد');
    const custAcc = await this.prisma.account.findFirst({
      where: { parentId: parent.id, detailId: partnerId, isActive: true, isPostable: true },
    });
    if (!custAcc) throw new BadRequestException('تفصیل مشتری پیدا نشد');

    // JE
    const entryDate = new Date(dto.receiptDate);
    // B2.4: period lock
    const fy = await this.fiscalYears.assertPeriodOpen(entryDate);

    const code = await this.generateCode();

    // B4.b: atomic receipt — JE + receipt + invoice update in one tx
    return this.prisma.$transaction(
      async (tx) => {
        const __alloc = await tx.fiscalYear.update({
          where: { id: fy.id },
          data: { nextEntryNumber: { increment: 1 } },
          select: { code: true, nextEntryNumber: true },
        });
        const entryNumber = __alloc.nextEntryNumber - 1;
        const jeCode = 'JV-' + (__alloc.code ?? fy.code ?? '1405') + '-' + String(entryNumber).padStart(5, '0');

        const je = await tx.journalEntry.create({
          data: {
            code: jeCode,
            entryNumber,
            entryDate,
            fiscalYearId: fy.id,
            description: 'دریافت از ' + inv.customer.fullName + ' — ' + inv.code,
            status: 'POSTED',
            sourceType: 'SALES_RECEIPT',
            sourceId: code,
            totalDebit: dto.amount,
            totalCredit: dto.amount,
            createdById: userId ?? null,
            lines: {
              create: [
                { accountId: creditAccountId, debit: dto.amount, credit: 0, sortOrder: 1 },
                { accountId: custAcc.id,      debit: 0, credit: dto.amount, sortOrder: 2 },
              ],
            },
          },
        });

        const receipt = await tx.salesReceipt.create({
          data: {
            code,
            customerId: inv.customerId,
            invoiceId: inv.id,
            method: dto.method,
            bankAccountId: dto.bankAccountId ?? null,
            amount: dto.amount,
            receiptDate: entryDate,
            reference: dto.reference ?? null,
            notes: dto.notes ?? null,
            journalEntryId: je.id,
            createdById: userId ?? null,
          },
        });

        const newRec = Number(inv.receivedAmount) + dto.amount;
        const isPaid = newRec >= Number(inv.totalAmount) - 0.01;
        await tx.salesInvoice.update({
          where: { id: inv.id },
          data: { receivedAmount: newRec, status: isPaid ? 'PAID' : 'PARTIALLY_RECEIVED' },
        });

        return receipt;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async remove(id: string, userId?: string) {
    const r = await this.prisma.salesReceipt.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('دریافت یافت نشد');
    if (r.deletedAt) throw new BadRequestException('این دریافت قبلاً حذف شده است');

    // 1. Reversal of accounting journal entry instead of hard delete
    if (r.journalEntryId) {
      try {
        await this.journals.reverse(
          r.journalEntryId,
          'ابطال دریافت فروش شماره ' + r.code,
          new Date(),
          userId || 'system',
        );
      } catch (err: any) {
        // Log reversal failure or continue if already reversed
        console.warn('SalesReceipt reversal notice:', err?.message || err);
      }
    }

    // 2. Adjust invoice remaining received amount
    if (r.invoiceId) {
      const inv = await this.prisma.salesInvoice.findUnique({ where: { id: r.invoiceId } });
      if (inv) {
        const newRec = Math.max(Number(inv.receivedAmount) - Number(r.amount), 0);
        const newStatus = newRec < 0.01 ? 'APPROVED'
          : newRec >= Number(inv.totalAmount) - 0.01 ? 'PAID' : 'PARTIALLY_RECEIVED';
        await this.prisma.salesInvoice.update({
          where: { id: inv.id },
          data: { receivedAmount: newRec, status: newStatus },
        });
      }
    }

    // 3. Soft delete receipt record
    await this.prisma.salesReceipt.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      },
    });

    return { success: true, softDeleted: true, id };
  }

  // ═══════════════════════════════════════════════════════════
  // CRUD extras — soft delete, restore, admin delete
  // Auto-generated by patch-crud-9.mjs
  // ═══════════════════════════════════════════════════════════

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.salesReceipt.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.salesReceipt.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.salesReceipt.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.salesReceipt.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    // For hard delete by admin — soft delete first then optionally purge
    // For safety we only do soft delete by default; uncomment hard delete below if needed
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }

}