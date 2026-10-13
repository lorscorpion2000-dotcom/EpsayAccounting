import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountLevel, AccountNature, AccountDetailType } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { FiscalYearsService } from '../../accounting/fiscal-years.service';
import { PurchaseInvoicesCrudService } from './purchase-invoices-crud.service';

interface JELine {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
}

interface InvoiceItemShape {
  id: string;
  totalPrice?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  isCapital?: boolean;
  accountId?: string | null;
  description?: string | null;
  usefulLifeMonths?: number | null;
}

interface InvoiceWithItems {
  id: string;
  code: string;
  supplierId: string;
  projectId?: string | null;
  invoiceDate: Date;
  grId?: string | null;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  totalAmount: unknown;
  journalEntryId?: string | null;
  supplier: { name: string };
  items: InvoiceItemShape[];
}

@Injectable()
export class PurchaseInvoicesApproveService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
    private crud: PurchaseInvoicesCrudService,
  ) {}

  async approve(id: string, userId?: string) {
    const inv = await this.crud.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل تأیید است');
    if (inv.journalEntryId) throw new BadRequestException('قبلاً سند ثبت شده');

    const expenseAcc = await this.resolveExpenseAccount(inv);
    const vatAcc     = await this.getVatAccount();
    const payableAcc = await this.resolveSupplierPayable(inv.supplierId);

    const assetMapping = await this.prisma.accountMapping.findUnique({
      where: { code: 'FIXED_ASSET_ACQUISITION' },
      include: { debitAccount: true },
    });
    const assetAccId = assetMapping?.debitAccount?.id ?? null;
    const deprecMapping = await this.prisma.accountMapping.findUnique({
      where: { code: 'DEPRECIATION_MONTHLY' },
      include: { debitAccount: true, creditAccount: true },
    });
    const deprecAccId = deprecMapping?.debitAccount?.id ?? null;
    const accumDeprecAccId = deprecMapping?.creditAccount?.id ?? null;

    const subtotalNum = Number(inv.subtotal);
    const discountNum = Number(inv.discountAmount);
    const taxNum = Number(inv.taxAmount);
    const totalNum = Number(inv.totalAmount);

    // B3.c: GRNI path
    if (inv.grId) {
      const grniMapping = await this.prisma.accountMapping.findUnique({
        where: { code: 'GOODS_RECEIPT' },
      });
      if (!grniMapping || !grniMapping.creditAccountId) {
        throw new BadRequestException('Mapping GOODS_RECEIPT ناقص است');
      }
      const grniAmount = subtotalNum - discountNum;
      const grniLines: JELine[] = [];
      if (grniAmount > 0.01) {
        grniLines.push({
          accountId: grniMapping.creditAccountId,
          debit: grniAmount,
          credit: 0,
          description: 'بستن GRNI طبق فاکتور ' + inv.code,
        });
      }
      if (taxNum > 0.01) {
        grniLines.push({ accountId: vatAcc.id, debit: taxNum, credit: 0 });
      }
      grniLines.push({ accountId: payableAcc.id, credit: totalNum });

      await this.fiscalYears.assertPeriodOpen(inv.invoiceDate);

      const grniJe = await this.createMultiLineJE({
        entryDate: inv.invoiceDate,
        description: 'فاکتور خرید ' + inv.code + ' — ' + inv.supplier.name + ' (GRNI)',
        sourceType: 'PURCHASE_INVOICE',
        sourceId: inv.id,
        userId,
        projectId: inv.projectId,
        lines: grniLines,
      });

      return this.prisma.purchaseInvoice.update({
        where: { id },
        data: {
          status: 'APPROVED',
          journalEntryId: grniJe.id,
          approvedAt: new Date(),
          approvedBy: userId ?? null,
        },
      });
    }

    let capitalNet = 0;
    let normalNet = 0;
    for (const it of ((inv as unknown as InvoiceWithItems).items || [])) {
      const gross = Number(it.totalPrice);
      const share = subtotalNum > 0 ? (gross / subtotalNum) * discountNum : 0;
      const net = gross - share;
      if (it.isCapital && assetAccId) capitalNet += net;
      else normalNet += net;
    }
    const jeLines: JELine[] = [];
    if (normalNet > 0.01) {
      if (!expenseAcc) throw new BadRequestException('Expense account required');
      jeLines.push({ accountId: expenseAcc.id, debit: normalNet });
    }
    if (capitalNet > 0.01 && assetAccId) jeLines.push({ accountId: assetAccId, debit: capitalNet });
    if (taxNum > 0.01) jeLines.push({ accountId: vatAcc.id, debit: taxNum });
    jeLines.push({ accountId: payableAcc.id, credit: totalNum });

    await this.fiscalYears.assertPeriodOpen(inv.invoiceDate);

    const je = await this.createMultiLineJE({
      entryDate: inv.invoiceDate,
      description: 'فاکتور خرید ' + inv.code + ' — ' + inv.supplier.name,
      sourceType: 'PURCHASE_INVOICE',
      sourceId: inv.id,
      userId,
      projectId: inv.projectId,
      lines: jeLines,
    });

    // C-4.b: create FixedAsset records for capital items
    const capitalItems = ((inv as unknown as InvoiceWithItems).items || []).filter((it: InvoiceItemShape) => it.isCapital);
    if (capitalItems.length > 0 && assetAccId && deprecAccId && accumDeprecAccId) {
      for (const it of capitalItems) {
        const cost = Number(it.totalPrice) || (Number(it.quantity) * Number(it.unitPrice));
        if (cost <= 0) continue;
        const lifeMonths = Number(it.usefulLifeMonths) || 120;
        const monthly = Math.round((cost / lifeMonths) * 100) / 100;
        const faCode = await this.generateFixedAssetCode();
        const fa = await this.prisma.fixedAsset.create({
          data: {
            code: faCode,
            name: it.description || ('دارایی از فاکتور ' + inv.code),
            acquisitionDate: inv.invoiceDate,
            acquisitionCost: cost,
            residualValue: 0,
            usefulLifeMonths: lifeMonths,
            depreciationMethod: 'STRAIGHT_LINE',
            monthlyDepreciation: monthly,
            accumulatedDepreciation: 0,
            bookValue: cost,
            status: 'ACTIVE',
            assetAccountId: assetAccId,
            depreciationAccountId: deprecAccId,
            accumulatedDeprecAccountId: accumDeprecAccId,
            projectId: inv.projectId ?? null,
          },
        });
        await this.prisma.purchaseInvoiceItem.update({
          where: { id: it.id },
          data: { fixedAssetId: fa.id },
        });
      }
    }

    return this.prisma.purchaseInvoice.update({
      where: { id },
      data: {
        status: 'APPROVED',
        journalEntryId: je.id,
        approvedAt: new Date(),
        approvedBy: userId ?? null,
      },
    });
  }

  private async resolveExpenseAccount(inv: InvoiceWithItems) {
    const itemWithAcc = inv.items.find((it: InvoiceItemShape) => it.accountId);
    if (itemWithAcc?.accountId) {
      return this.prisma.account.findUnique({ where: { id: itemWithAcc.accountId } });
    }
    const mapping = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_CREDIT' } });
    if (mapping?.debitAccountId) {
      return this.prisma.account.findUnique({ where: { id: mapping.debitAccountId } });
    }
    return null;
  }

  private async getVatAccount() {
    const mapping = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_VAT' } }).catch(() => null);
    if (mapping?.debitAccountId) {
      const a = await this.prisma.account.findUnique({ where: { id: mapping.debitAccountId } });
      if (a) return a;
    }
    const direct = await this.prisma.account.findFirst({ where: { code: '2.1.3' } });
    if (!direct) throw new BadRequestException('حساب مالیات 2.1.3 پیدا نشد');
    return direct;
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

    const siblings = await this.prisma.account.findMany({
      where: { parentId: parent.id }, select: { code: true },
    });
    let maxLast = 0;
    for (const s of siblings) {
      const parts = s.code.split('.');
      const n = parseInt(parts[parts.length - 1], 10) || 0;
      if (n > maxLast) maxLast = n;
    }
    const nextCode = '2.1.1.' + String(maxLast + 1).padStart(2, '0');

    detail = await this.prisma.account.create({
      data: {
        code: nextCode,
        name: supplier.name,
        level: AccountLevel.DETAIL,
        nature: AccountNature.CREDIT,
        parentId: parent.id,
        isPostable: true,
        isActive: true,
        detailType: AccountDetailType.SUPPLIER,
        detailId: supplier.id,
      },
    });
    if (parent.isPostable) {
      await this.prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
    }
    return detail;
  }

  private async createMultiLineJE(args: {
    entryDate: Date;
    description: string;
    sourceType: string;
    sourceId: string;
    userId?: string;
    projectId?: string | null;
    lines: JELine[];
  }) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: {
        startDate: { lte: args.entryDate },
        endDate:   { gte: args.entryDate },
      },
      orderBy: { startDate: 'desc' },
    });
    if (!fy) throw new BadRequestException('سال مالی برای تاریخ سند پیدا نشد');

    // F6.7 BUG FIX: allocate via atomic increment (consistent with JournalsService.allocateEntryNumber)
    // Previously used findFirst+1 which didn't update nextEntryNumber → drift → duplicate codes.
    const allocated = await this.prisma.fiscalYear.update({
      where: { id: fy.id },
      data: { nextEntryNumber: { increment: 1 } },
      select: { code: true, nextEntryNumber: true },
    });
    const entryNumber = allocated.nextEntryNumber - 1;
    const code = 'JV-' + (allocated.code ?? fy.code ?? '1405') + '-' + String(entryNumber).padStart(5, '0');

    const totalDebit  = args.lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0);
    const totalCredit = args.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);

    return this.prisma.journalEntry.create({
      data: {
        code,
        entryNumber,
        entryDate: args.entryDate,
        fiscalYearId: fy.id,
        description: args.description,
        status: 'POSTED',
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        createdById: args.userId ?? null,
        lines: {
          create: args.lines.map((l, i) => ({
            accountId: l.accountId,
            debit: Number(l.debit ?? 0),
            credit: Number(l.credit ?? 0),
            description: l.description ?? null,
            projectId: args.projectId ?? null,
            sortOrder: i + 1,
          })),
        },
      },
    });
  }

  private async generateFixedAssetCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'FA-' + year + '-';
    const last = await this.prisma.fixedAsset.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = last ? parseInt(last.code.slice(prefix.length), 10) || 0 : 0;
    return prefix + String(lastNum + 1).padStart(4, '0');
  }
}
