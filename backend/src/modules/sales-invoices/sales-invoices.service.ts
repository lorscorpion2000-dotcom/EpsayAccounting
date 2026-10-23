import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AccountDetailType, AccountLevel, AccountNature, PartnerType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { UpdateSIItemDto } from './dto/create-sales-invoice.dto';
import { FiscalYearsService } from '../accounting/fiscal-years.service';
import { generateCode } from '../../shared/utils/code-generator';

interface ComputeItem {
  totalPrice?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
}

type JELine = {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  projectId?: string | null;
};

@Injectable()
export class SalesInvoicesService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'salesInvoice', 'code', 'SI-' + year + '-', { pad: 5 });
  }

  private computeTotals(items: ComputeItem[], taxPercent: number, discountAmount: number) {
    const subtotal = items.reduce((s, it) => {
      const t = it.totalPrice != null ? Number(it.totalPrice) : Number(it.quantity) * Number(it.unitPrice);
      return s + t;
    }, 0);
    const base = Math.max(subtotal - discountAmount, 0);
    const taxAmount = Math.round(base * (Number(taxPercent) / 100) * 100) / 100;
    const totalAmount = Math.round((base + taxAmount) * 100) / 100;
    return { subtotal: Math.round(subtotal * 100) / 100, taxAmount, totalAmount };
  }

  async findAll(query?: { customerId?: string; projectId?: string; status?: string }) {
    const where: Prisma.SalesInvoiceWhereInput = {};
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.projectId)  where.projectId  = query.projectId;
    if (query?.status)     where.status     = query.status as Prisma.SalesInvoiceWhereInput['status'];
    return this.prisma.salesInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, mobilePhone: true } },
        project:  { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, code: true } },
        _count:   { select: { items: true, receipts: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const inv = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, mobilePhone: true, nationalId: true } },
        project:  { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, code: true } },
        partner:  { select: { id: true, code: true, name: true } },
        items: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
          orderBy: { rowNumber: 'asc' },
        },
        receipts: { orderBy: { receiptDate: 'desc' } },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!inv) throw new NotFoundException('فاکتور فروش یافت نشد');
    return inv;
  }

  async recompute(id: string) {
    const inv = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!inv) throw new NotFoundException('فاکتور فروش یافت نشد');
    const totals = this.computeTotals(
      inv.items,
      Number(inv.taxPercent),
      Number(inv.discountAmount),
    );
    return this.prisma.salesInvoice.update({
      where: { id },
      data: {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      },
    });
  }

  async updateItem(itemId: string, dto: UpdateSIItemDto) {
    const item = await this.prisma.salesInvoiceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('ردیف یافت نشد');
    const inv = await this.prisma.salesInvoice.findUnique({ where: { id: item.invoiceId } });
    if (!inv) throw new NotFoundException('فاکتور فروش یافت نشد');
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');

    const quantity = dto.quantity !== undefined ? Number(dto.quantity) : Number(item.quantity);
    const unitPrice = dto.unitPrice !== undefined ? Number(dto.unitPrice) : Number(item.unitPrice);
    const totalPrice = dto.totalPrice !== undefined
      ? Number(dto.totalPrice)
      : quantity * unitPrice;

    // unitId resolution (unit is optional free-text)
    let unitId: string | null | undefined = undefined;
    if (dto.unit !== undefined) {
      const u = (dto.unit ?? '').toString().trim();
      if (u) {
        const map = await this.resolveUnitIds([u]);
        unitId = map.get(u) ?? null;
      } else {
        unitId = null;
      }
    }

    const updated = await this.prisma.salesInvoiceItem.update({
      where: { id: itemId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.quantity !== undefined && { quantity }),
        ...(dto.unit !== undefined && { unit: (dto.unit ?? '').toString().trim() || null }),
        ...(unitId !== undefined && { unitId }),
        ...(dto.unitPrice !== undefined && { unitPrice }),
        totalPrice,
        ...(dto.accountId !== undefined && { accountId: dto.accountId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    await this.recompute(item.invoiceId);
    return updated;
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.salesInvoiceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('ردیف یافت نشد');
    const inv = await this.prisma.salesInvoice.findUnique({ where: { id: item.invoiceId } });
    if (!inv) throw new NotFoundException('فاکتور فروش یافت نشد');
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    await this.prisma.salesInvoiceItem.delete({ where: { id: itemId } });
    await this.recompute(item.invoiceId);
    return { success: true };
  }


  private async resolveUnitIds(codes: (string | null | undefined)[], client: Prisma.TransactionClient = this.prisma): Promise<Map<string, string>> {
    const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
    if (unique.length === 0) return new Map();
    const units = await client.unit.findMany({
      where: { OR: [{ code: { in: unique } }, { name: { in: unique } }, { symbol: { in: unique } }] },
      select: { id: true, code: true, name: true, symbol: true },
    });
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.code && unique.includes(u.code)) map.set(u.code, u.id);
      if (u.name && unique.includes(u.name)) map.set(u.name, u.id);
      if (u.symbol && unique.includes(u.symbol)) map.set(u.symbol, u.id);
    }
    return map;
  }

  async create(dto: CreateSalesInvoiceDto, userId?: string) {
    const code = await this.generateCode();
    const items = (dto.items ?? []).map((it, i) => ({
      rowNumber: it.rowNumber ?? i + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit ?? null,
      unitId: null as string | null,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice != null ? it.totalPrice : it.quantity * it.unitPrice,
      accountId: it.accountId ?? null,
      notes: it.notes ?? null,
    }));
    if (!items.length) throw new BadRequestException('حداقل یک ردیف لازم است');
    const siUnitMap = await this.resolveUnitIds(items.map((it) => it.unit));
    for (const it of items) it.unitId = it.unit ? (siUnitMap.get(it.unit) ?? null) : null;

    const { subtotal, taxAmount, totalAmount } =
      this.computeTotals(items, dto.taxPercent ?? 10, dto.discountAmount ?? 0);

    return this.prisma.salesInvoice.create({
      data: {
        code,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        customerId: dto.customerId,
        contractId: dto.contractId ?? null,
        projectId: dto.projectId ?? null,
        taxPercent: dto.taxPercent ?? 10,
        discountAmount: dto.discountAmount ?? 0,
        subtotal, taxAmount, totalAmount,
        notes: dto.notes ?? null,
        createdById: userId ?? null,
        items: { create: items },
      },
      include: { customer: true, items: true },
    });
  }

  async update(id: string, dto: UpdateSalesInvoiceDto) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل ویرایش است');
    const data: Prisma.SalesInvoiceUncheckedUpdateInput = {};
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined)   data.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate !== undefined)       data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined)         data.notes = dto.notes;
    return this.prisma.salesInvoice.update({ where: { id }, data });
  }

  async remove(id: string) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل حذف است');
    await this.prisma.salesInvoice.delete({ where: { id } });
    return { success: true };
  }

  /** ساخت Partner متناظر SalesCustomer برای استفاده در تفضیل 1.1.2 */
  private async ensurePartnerForCustomer(customerId: string) {
    const cust = await this.prisma.salesCustomer.findUnique({ where: { id: customerId } });
    if (!cust) throw new BadRequestException('مشتری یافت نشد');

    // اگر Partner با همین نام و موبایل هست، استفاده کن
    const existing = await this.prisma.partner.findFirst({
      where: {
        type: PartnerType.CLIENT,
        OR: [
          { nationalId: cust.nationalId ?? undefined },
          { phone: cust.mobilePhone ?? undefined },
          { name: cust.fullName },
        ].filter((x) => Object.values(x).some((v) => v != null && v !== '')),
      },
    });
    if (existing) return existing;

    const code = 'SC-' + cust.id.slice(0, 10);
    const existsByCode = await this.prisma.partner.findUnique({ where: { code } });
    if (existsByCode) return existsByCode;

    return this.prisma.partner.create({
      data: {
        code,
        name: cust.fullName,
        type: PartnerType.CLIENT,
        nationalId: cust.nationalId ?? null,
        phone: cust.mobilePhone ?? null,
        email: cust.email ?? null,
        address: cust.address ?? null,
        postalCode: cust.postalCode ?? null,
        isActive: true,
      },
    });
  }

  /** تفصیل زیر 1.1.2 برای Partner مشتری */
  private async resolveCustomerDetail(partnerId: string) {
    const parent = await this.prisma.account.findFirst({ where: { code: '1.1.2' } });
    if (!parent) throw new BadRequestException('معین 1.1.2 پیدا نشد');

    let detail = await this.prisma.account.findFirst({
      where: { parentId: parent.id, detailId: partnerId, isActive: true, isPostable: true },
    });
    if (detail) return detail;

    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new BadRequestException('شریک پیدا نشد');

    const siblings = await this.prisma.account.findMany({
      where: { parentId: parent.id }, select: { code: true },
    });
    let maxLast = 0;
    for (const s of siblings) {
      const parts = s.code.split('.');
      const n = parseInt(parts[parts.length - 1], 10) || 0;
      if (n > maxLast) maxLast = n;
    }
    const nextCode = `1.1.2.${String(maxLast + 1).padStart(2, '0')}`;

    detail = await this.prisma.account.create({
      data: {
        code: nextCode,
        name: partner.name,
        level: AccountLevel.DETAIL,
        nature: AccountNature.DEBIT,
        parentId: parent.id,
        isPostable: true,
        isActive: true,
        detailType: AccountDetailType.CUSTOMER,
        detailId: partner.id,
      },
    });
    if (parent.isPostable) {
      await this.prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
    }
    return detail;
  }

  /** approve: JE سه‌خطی — debit مشتری، credit درآمد + credit VAT فروش */
  async approve(id: string, userId?: string) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل تأیید است');
    if (inv.journalEntryId) throw new BadRequestException('قبلاً سند ثبت شده');

    // 1) Partner مشتری
    let partnerId = inv.partnerId;
    if (!partnerId) {
      const partner = await this.ensurePartnerForCustomer(inv.customerId);
      partnerId = partner.id;
      await this.prisma.salesInvoice.update({ where: { id }, data: { partnerId } });
    }
    const customerAcc = await this.resolveCustomerDetail(partnerId);

    // 2) حساب درآمد: از mapping یا اولین ردیف با accountId، وگرنه 4.2.1
    const itemWithAcc = inv.items?.find((it) => it.accountId);
    let revenueAcc;
    if (itemWithAcc?.accountId) {
      revenueAcc = await this.prisma.account.findUnique({ where: { id: itemWithAcc.accountId } });
    }
    if (!revenueAcc) {
      const map = await this.prisma.accountMapping.findUnique({ where: { code: 'SALES_INVOICE_REVENUE' } }).catch(() => null);
      if (map?.creditAccountId) revenueAcc = await this.prisma.account.findUnique({ where: { id: map.creditAccountId } });
    }
    if (!revenueAcc) revenueAcc = await this.prisma.account.findFirst({ where: { code: '4.2.1' } });
    if (!revenueAcc) throw new BadRequestException('حساب درآمد پیدا نشد');

    // 3) حساب VAT فروش
    let vatAcc = null;
    const vatMap = await this.prisma.accountMapping.findUnique({ where: { code: 'SALES_VAT' } }).catch(() => null);
    if (vatMap?.creditAccountId) vatAcc = await this.prisma.account.findUnique({ where: { id: vatMap.creditAccountId } });
    if (!vatAcc) vatAcc = await this.prisma.account.findFirst({ where: { code: '2.1.3' } });

    const netRevenue = Number(inv.subtotal) - Number(inv.discountAmount);
    const taxAmount  = Number(inv.taxAmount);

    const lines: JELine[] = [
      { accountId: customerAcc.id, debit: Number(inv.totalAmount), description: 'طلب از ' + inv.customer.fullName, projectId: inv.projectId },
      { accountId: revenueAcc.id,  credit: netRevenue, description: 'درآمد فروش ' + inv.code, projectId: inv.projectId },
    ];
    if (taxAmount > 0 && vatAcc) {
      lines.push({ accountId: vatAcc.id, credit: taxAmount, description: 'مالیات فروش ' + inv.code });
    }

    // 4) Fiscal year + شماره سند
    // B2.4: period lock
    const fy = await this.fiscalYears.assertPeriodOpen(inv.invoiceDate);

    const totalDebit  = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0);

    // B4.c: atomic approve — JE + invoice update in one tx
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
            entryDate: inv.invoiceDate,
            fiscalYearId: fy.id,
            description: 'فاکتور فروش ' + inv.code + ' — ' + inv.customer.fullName,
            status: 'POSTED',
            sourceType: 'SALES_INVOICE',
            sourceId: inv.id,
            totalDebit: Math.round(totalDebit * 100) / 100,
            totalCredit: Math.round(totalCredit * 100) / 100,
            createdById: userId ?? null,
            lines: {
              create: lines.map((l, i) => ({
                accountId: l.accountId,
                debit: Number(l.debit ?? 0),
                credit: Number(l.credit ?? 0),
                description: l.description ?? null,
                projectId: l.projectId ?? null,
                sortOrder: i + 1,
              })),
            },
          },
        });

        return tx.salesInvoice.update({
          where: { id },
          data: {
            status: 'APPROVED',
            journalEntryId: je.id,
            approvedAt: new Date(),
            approvedBy: userId ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}