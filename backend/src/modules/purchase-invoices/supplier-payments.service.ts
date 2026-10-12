import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaySupplierDto } from './dto/pay-supplier.dto';
import { FiscalYearsService } from '../accounting/fiscal-years.service';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class SupplierPaymentsService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'supplierPayment', 'code', 'SP-' + year + '-', { pad: 5 });
  }

  async findAll(query?: { supplierId?: string; invoiceId?: string }) {
    const where: any = {};
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.invoiceId)  where.invoiceId  = query.invoiceId;
    return this.prisma.supplierPayment.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        invoice:  { select: { id: true, code: true, invoiceNumber: true, totalAmount: true } },
        bankAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async pay(dto: PaySupplierDto, userId?: string) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: { supplier: { select: { id: true, code: true, name: true } } },
    });
    if (!invoice) throw new NotFoundException('فاکتور یافت نشد');
    if (invoice.status === 'DRAFT') throw new BadRequestException('ابتدا فاکتور را تأیید کنید');
    if (invoice.status === 'PAID')   throw new BadRequestException('این فاکتور کاملاً پرداخت شده');
    if (invoice.status === 'CANCELLED') throw new BadRequestException('فاکتور لغو شده');

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(
        `مبلغ پرداخت (${dto.amount}) بیشتر از مانده (${remaining}) است`);
    }

    // حساب پرداخت: بانک یا نقد
    let creditAccountId: string;
    if (dto.method === 'CASH') {
      // حساب نقد/صندوق — از mapping PURCHASE_CASH.credit یا اولین حساب نقد
      const mapping = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_CASH' } });
      const cash = mapping?.creditAccountId
        ? await this.prisma.account.findUnique({ where: { id: mapping.creditAccountId } })
        : await this.prisma.account.findFirst({ where: { code: { startsWith: '1.1.1.' }, isPostable: true } });
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
        if (!detail) throw new BadRequestException('تفصیل بانک پیدا نشد برای ' + bank.name);
        glId = detail.id;
      }
      creditAccountId = glId;
    } else {
      throw new BadRequestException('روش ' + dto.method + ' در نسخه فعلی پشتیبانی نمی‌شود');
    }

    // حساب بدهکار: تفصیل تأمین‌کننده زیر 2.1.1
    const payableAcc = await this.resolveSupplierPayable(invoice.supplierId);

    // ساخت JE
    const entryDate = new Date(dto.paymentDate);
    // B2.4: period lock
    const fy = await this.fiscalYears.assertPeriodOpen(entryDate);

    const code = await this.generateCode();

    // B4.a: atomic pay — JE + payment + invoice update in one tx
    return this.prisma.$transaction(
      async (tx) => {
        const last = await tx.journalEntry.findFirst({
          where: { fiscalYearId: fy.id },
          orderBy: { entryNumber: 'desc' },
          select: { entryNumber: true },
        });
        const entryNumber = (last?.entryNumber ?? 0) + 1;
        const jeCode = 'JV-' + (fy.code ?? '1405') + '-' + String(entryNumber).padStart(5, '0');

        const je = await tx.journalEntry.create({
          data: {
            code: jeCode,
            entryNumber,
            entryDate,
            fiscalYearId: fy.id,
            description: 'پرداخت به ' + invoice.supplier.name + ' — ' + invoice.code,
            status: 'POSTED',
            sourceType: 'SUPPLIER_PAYMENT',
            sourceId: code,
            totalDebit: dto.amount,
            totalCredit: dto.amount,
            createdById: userId ?? null,
            lines: {
              create: [
                { accountId: payableAcc.id,   debit: dto.amount, credit: 0,          sortOrder: 1 },
                { accountId: creditAccountId, debit: 0,          credit: dto.amount, sortOrder: 2 },
              ],
            },
          },
        });

        const payment = await tx.supplierPayment.create({
          data: {
            code,
            supplierId: invoice.supplierId,
            invoiceId: invoice.id,
            method: dto.method,
            bankAccountId: dto.bankAccountId ?? null,
            amount: dto.amount,
            paymentDate: entryDate,
            reference: dto.reference ?? null,
            notes: dto.notes ?? null,
            journalEntryId: je.id,
            createdById: userId ?? null,
          },
        });

        const newPaid = Number(invoice.paidAmount) + dto.amount;
        const isPaid = newPaid >= Number(invoice.totalAmount) - 0.01;
        await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            status: isPaid ? 'PAID' : 'PARTIALLY_PAID',
          },
        });

        return payment;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async remove(id: string) {
    const p = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('پرداخت یافت نشد');
    // حذف JE
    if (p.journalEntryId) {
      await this.prisma.journalLine.deleteMany({ where: { journalEntryId: p.journalEntryId } });
      await this.prisma.journalEntry.delete({ where: { id: p.journalEntryId } }).catch(() => {});
    }
    // به‌روزرسانی فاکتور
    if (p.invoiceId) {
      const inv = await this.prisma.purchaseInvoice.findUnique({ where: { id: p.invoiceId } });
      if (inv) {
        const newPaid = Math.max(Number(inv.paidAmount) - Number(p.amount), 0);
        const newStatus = newPaid < 0.01 ? 'APPROVED'
          : newPaid >= Number(inv.totalAmount) - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
        await this.prisma.purchaseInvoice.update({
          where: { id: inv.id },
          data: { paidAmount: newPaid, status: newStatus },
        });
      }
    }
    await this.prisma.supplierPayment.delete({ where: { id } });
    return { success: true };
  }

  private async resolveSupplierPayable(supplierId: string) {
    const parent = await this.prisma.account.findFirst({ where: { code: '2.1.1' } });
    if (!parent) throw new BadRequestException('معین 2.1.1 پیدا نشد');
    let detail = await this.prisma.account.findFirst({
      where: { parentId: parent.id, detailId: supplierId, isActive: true, isPostable: true },
    });
    if (detail) return detail;
    const supplier = await this.prisma.partner.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new BadRequestException('تأمین‌کننده پیدا نشد');
    const siblings = await this.prisma.account.findMany({ where: { parentId: parent.id }, select: { code: true } });
    let maxLast = 0;
    for (const s of siblings) {
      const parts = s.code.split('.');
      const n = parseInt(parts[parts.length - 1], 10) || 0;
      if (n > maxLast) maxLast = n;
    }
    const nextCode = `2.1.1.${String(maxLast + 1).padStart(2, '0')}`;
    detail = await this.prisma.account.create({
      data: {
        code: nextCode, name: supplier.name, level: 'DETAIL' as any, nature: 'CREDIT' as any,
        parentId: parent.id, isPostable: true, isActive: true,
        detailType: 'SUPPLIER' as any, detailId: supplier.id,
      },
    });
    if (parent.isPostable) {
      await this.prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
    }
    return detail;
  }

  // ═══════════════════════════════════════════════════════════
  // CRUD extras — soft delete, restore, admin delete
  // Auto-generated by patch-crud-9.mjs
  // ═══════════════════════════════════════════════════════════

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.supplierPayment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.supplierPayment.update({
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