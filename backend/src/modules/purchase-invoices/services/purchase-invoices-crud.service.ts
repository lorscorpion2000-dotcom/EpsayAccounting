import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreatePurchaseInvoiceDto } from '../dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from '../dto/update-purchase-invoice.dto';

interface InvoiceItemInput {
  rowNumber?: number;
  description?: string;
  quantity?: unknown;
  unit?: string;
  unitId?: string | null;
  unitPrice?: unknown;
  totalPrice?: unknown;
  accountId?: string | null;
  wbsItemId?: string | null;
  discountPercent?: unknown;
  discountAmount?: unknown;
  additionAmount?: unknown;
  deductionAmount?: unknown;
  taxPercent?: unknown;
  taxAmount?: unknown;
  shippingCost?: unknown;
  loadingCost?: unknown;
  lineTotal?: unknown;
  isCapital?: boolean;
  usefulLifeMonths?: number | null;
  notes?: string | null;
}

interface RecomputeItem {
  quantity?: unknown;
  unitPrice?: unknown;
  totalPrice?: unknown;
  discountPercent?: unknown;
  discountAmount?: unknown;
  additionAmount?: unknown;
  deductionAmount?: unknown;
  taxPercent?: unknown;
  taxAmount?: unknown;
  shippingCost?: unknown;
  loadingCost?: unknown;
}

@Injectable()
export class PurchaseInvoicesCrudService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PI-' + year + '-';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- __withDeleted لازم است
    const last = await (this.prisma as any).purchaseInvoice.findFirst({
      __withDeleted: true,
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let lastNum = 0;
    if (last && last.code) {
      const m = String(last.code).match(new RegExp('^' + prefix + '(\\d+)$'));
      if (m) lastNum = parseInt(m[1], 10) || 0;
    }

    let candidate = prefix + String(lastNum + 1).padStart(5, '0');
    let tries = 0;
    while (tries < 100) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- __withDeleted لازم است
      const exists = await (this.prisma as any).purchaseInvoice.findFirst({
        __withDeleted: true,
        where: { code: candidate },
        select: { code: true },
      });
      if (!exists) return candidate;
      tries++;
      lastNum++;
      candidate = prefix + String(lastNum + 1).padStart(5, '0');
    }
    throw new Error('Cannot generate unique code for PI');
  }

  private computeTotals(items: InvoiceItemInput[], _taxPercent: number, discountAmount: number) {
    let subtotal = 0, totalDiscount = 0, totalAddition = 0, totalDeduction = 0;
    let totalTax = 0, totalShipping = 0, totalLoading = 0, grandTotal = 0;

    for (const it of items) {
      const base = Number(it.totalPrice ?? (Number(it.quantity) * Number(it.unitPrice)));

      const discPercent = Number(it.discountPercent) || 0;
      const itemDisc = Number(it.discountAmount) || (discPercent > 0 ? (base * discPercent) / 100 : 0);
      const afterDisc = base - itemDisc;

      const txPercent = Number(it.taxPercent) || 0;
      const itemTax = Number(it.taxAmount) || (txPercent > 0 ? (afterDisc * txPercent) / 100 : 0);

      const add = Number(it.additionAmount) || 0;
      const ded = Number(it.deductionAmount) || 0;
      const ship = Number(it.shippingCost) || 0;
      const load = 0;

      const lineTotal = afterDisc + add - ded + itemTax + ship + load;

      subtotal += base;
      totalDiscount += itemDisc;
      totalAddition += add;
      totalDeduction += ded;
      totalTax += itemTax;
      totalShipping += ship;
      totalLoading += load;
      grandTotal += lineTotal;
    }

    const globalDiscount = Number(discountAmount) || 0;
    if (globalDiscount > 0) {
      totalDiscount += globalDiscount;
      grandTotal -= globalDiscount;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalAddition: Math.round(totalAddition * 100) / 100,
      totalDeduction: Math.round(totalDeduction * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      totalShipping: Math.round(totalShipping * 100) / 100,
      totalLoading: Math.round(totalLoading * 100) / 100,
      totalAmount: Math.round(grandTotal * 100) / 100,
    };
  }

  async findAll(query?: { supplierId?: string; projectId?: string; status?: string }) {
    const where: Prisma.PurchaseInvoiceWhereInput = {};
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.projectId)  where.projectId  = query.projectId;
    if (query?.status)     where.status     = query.status as Prisma.PurchaseInvoiceWhereInput['status'];
    return this.prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        project:  { select: { id: true, code: true, name: true } },
        po:       { select: { id: true, code: true } },
        _count:   { select: { items: true, payments: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const inv = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        project:  { select: { id: true, code: true, name: true } },
        po:       { select: { id: true, code: true } },
        gr:       { select: { id: true, code: true } },
        items: {
          include: {
            account: { select: { id: true, code: true, name: true } },
            wbsItem: { select: { id: true, code: true, title: true } },
          },
          orderBy: { rowNumber: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!inv) throw new NotFoundException('فاکتور خرید یافت نشد');
    return inv;
  }

  private async resolveUnitIds(codes: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
    if (unique.length === 0) return new Map();
    const units = await this.prisma.unit.findMany({
      where: {
        OR: [
          { code: { in: unique } },
          { name: { in: unique } },
          { symbol: { in: unique } },
        ],
      },
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

  async create(dto: CreatePurchaseInvoiceDto, userId?: string) {
    const code = await this.generateCode();
    const items = (dto.items ?? []).map((it: InvoiceItemInput, i: number) => {
      const base = Number(it.totalPrice ?? (Number(it.quantity) * Number(it.unitPrice)));
      const discPercent = Number(it.discountPercent) || 0;
      const discAmount = Number(it.discountAmount) || (discPercent > 0 ? (base * discPercent) / 100 : 0);
      const afterDisc = base - discAmount;
      const txPercent = Number(it.taxPercent) || 0;
      const txAmount = txPercent > 0 ? (afterDisc * txPercent) / 100 : 0;
      const add = Number(it.additionAmount) || 0;
      const ded = Number(it.deductionAmount) || 0;
      const ship = Number(it.shippingCost) || 0;
      const load = Number(it.loadingCost) || 0;
      const lineTotal = afterDisc + add - ded + txAmount + ship + load;

      return {
        rowNumber: it.rowNumber ?? i + 1,
        description: it.description ?? '',
        quantity: Number(it.quantity ?? 0),
        unit: String(it.unit ?? 'NUMBER'),
        unitId: null as string | null,
        unitPrice: Number(it.unitPrice ?? 0),
        totalPrice: base,
        accountId: it.accountId ?? null,
        wbsItemId: it.wbsItemId ?? null,
        discountPercent: discPercent,
        discountAmount: discAmount,
        additionAmount: add,
        deductionAmount: ded,
        taxPercent: txPercent,
        taxAmount: txAmount,
        shippingCost: ship,
        loadingCost: 0,
        lineTotal,
        isCapital: it.isCapital ?? false,
        usefulLifeMonths: it.usefulLifeMonths ?? null,
        notes: it.notes ?? null,
      };
    });
    if (!items.length) throw new BadRequestException('حداقل یک ردیف لازم است');

    const createUnitMap = await this.resolveUnitIds(items.map((x) => String(x.unit)));
    for (const it of items) it.unitId = createUnitMap.get(String(it.unit)) ?? null;

    const totals = this.computeTotals(items, dto.taxPercent ?? 10, dto.discountAmount ?? 0);

    return this.prisma.purchaseInvoice.create({
      data: {
        code,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        supplierId: dto.supplierId,
        projectId: dto.projectId ?? null,
        poId: dto.poId ?? null,
        grId: dto.grId ?? null,
        taxPercent: dto.taxPercent ?? 10,
        discountAmount: dto.discountAmount ?? 0,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalAddition: totals.totalAddition,
        totalDeduction: totals.totalDeduction,
        taxAmount: totals.taxAmount,
        totalShipping: totals.totalShipping,
        totalLoading: totals.totalLoading,
        totalAmount: totals.totalAmount,
        notes: dto.notes ?? null,
        createdById: userId ?? null,
        items: { create: items },
      },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        items: true,
      },
    });
  }

  async createFromPO(poId: string, dto: { invoiceNumber: string; invoiceDate: string; dueDate?: string }, userId?: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!po) throw new NotFoundException('سفارش خرید یافت نشد');
    if (po.status === 'CANCELLED') throw new BadRequestException('PO لغو شده است');
    if (!po.supplierId) throw new BadRequestException('PO تأمین‌کننده ندارد');

    const existing = await this.prisma.purchaseInvoice.findFirst({ where: { poId } });
    if (existing) throw new BadRequestException('قبلاً فاکتوری از این PO ساخته شده: ' + existing.code);

    const postedGr = await this.prisma.goodsReceipt.findFirst({
      where: { poId, status: 'POSTED' },
      select: { id: true },
    });

    const code = await this.generateCode();
    const items = po.items.map((it) => ({
      rowNumber: it.rowNumber,
      description: it.description ?? '',
      quantity: Number(it.quantity),
      unit: String(it.unit ?? 'NUMBER'),
      unitId: null as string | null,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
      accountId: null,
      wbsItemId: null,
      notes: it.notes ?? null,
    }));
    const poUnitMap = await this.resolveUnitIds(items.map((x) => String(x.unit)));
    for (const it of items) it.unitId = poUnitMap.get(String(it.unit)) ?? null;

    const taxPercent = Number(po.taxPercent ?? 10);
    const { subtotal, taxAmount, totalAmount } = this.computeTotals(items, taxPercent, 0);

    return this.prisma.purchaseInvoice.create({
      data: {
        code,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        supplierId: po.supplierId!,
        projectId: po.projectId,
        poId: po.id,
        grId: postedGr?.id ?? null,
        taxPercent,
        subtotal, taxAmount, totalAmount,
        createdById: userId ?? null,
        items: { create: items },
      },
      include: { supplier: true, items: true },
    });
  }

  async createFromGR(grId: string, dto: { invoiceNumber: string; invoiceDate: string; dueDate?: string }, userId?: string) {
    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id: grId },
      include: {
        items: {
          include: { item: { select: { id: true, code: true, name: true, unit: true } } },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!gr) throw new NotFoundException('GR یافت نشد');
    if (gr.status !== 'POSTED') throw new BadRequestException('GR باید POSTED باشد (وضعیت فعلی: ' + gr.status + ')');
    if (!gr.supplierId) throw new BadRequestException('GR تأمین‌کننده ندارد');

    const existing = await this.prisma.purchaseInvoice.findFirst({ where: { grId } });
    if (existing) throw new BadRequestException('قبلاً فاکتوری از این GR ساخته شده: ' + existing.code);

    const code = await this.generateCode();

    const items = gr.items.map((it) => ({
      rowNumber: it.rowNumber,
      description: it.item?.name ?? ('ردیف ' + it.rowNumber),
      quantity: Number(it.quantity),
      unit: String(it.item?.unit ?? 'NUMBER'),
      unitId: null as string | null,
      unitPrice: Number(it.unitCost),
      totalPrice: Number(it.totalCost),
      accountId: null,
      wbsItemId: null,
      discountPercent: Number(it.discountPercent) || 0,
      discountAmount: Number(it.discountAmount) || 0,
      additionAmount: Number(it.additionAmount) || 0,
      deductionAmount: Number(it.deductionAmount) || 0,
      taxPercent: Number(it.taxPercent) || 0,
      taxAmount: Number(it.taxAmount) || 0,
      shippingCost: Number(it.shippingCost) || 0,
      loadingCost: Number(it.loadingCost) || 0,
      notes: it.notes ?? null,
    }));
    const grUnitMap = await this.resolveUnitIds(items.map((x) => String(x.unit)));
    for (const it of items) it.unitId = grUnitMap.get(String(it.unit)) ?? null;

    const taxPercent = items[0]?.taxPercent ?? 9;
    const totals = this.computeTotals(items, taxPercent, 0);

    return this.prisma.purchaseInvoice.create({
      data: {
        code,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        supplierId: gr.supplierId,
        projectId: gr.projectId ?? null,
        poId: gr.poId ?? null,
        grId: gr.id,
        taxPercent,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalAddition: totals.totalAddition,
        totalDeduction: totals.totalDeduction,
        taxAmount: totals.taxAmount,
        totalShipping: totals.totalShipping,
        totalLoading: totals.totalLoading,
        totalAmount: totals.totalAmount,
        createdById: userId ?? null,
        items: { create: items },
      },
      include: { supplier: true, items: true },
    });
  }



  async update(id: string, dto: UpdatePurchaseInvoiceDto) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط فاکتورهای DRAFT قابل ویرایش‌اند');

    const data: Prisma.PurchaseInvoiceUncheckedUpdateInput = {};
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined)   data.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate !== undefined)       data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.projectId !== undefined)     data.projectId = dto.projectId;
    if (dto.notes !== undefined)         data.notes = dto.notes;
    if (dto.taxPercent !== undefined)    data.taxPercent = dto.taxPercent;
    if (dto.discountAmount !== undefined) data.discountAmount = dto.discountAmount;
    if (dto.supplierId !== undefined)    data.supplierId = dto.supplierId;

    if (dto.items !== undefined) {
      if (!dto.items.length) throw new BadRequestException('حداقل یک ردیف لازم است');

      const items = dto.items.map((it: InvoiceItemInput, i: number) => {
        const base = Number(it.totalPrice ?? (Number(it.quantity) * Number(it.unitPrice)));
        const discPercent = Number(it.discountPercent) || 0;
        const discAmount = Number(it.discountAmount) || (discPercent > 0 ? (base * discPercent) / 100 : 0);
        const afterDisc = base - discAmount;
        const txPercent = Number(it.taxPercent) || 0;
        const txAmount = Number(it.taxAmount) || (txPercent > 0 ? (afterDisc * txPercent) / 100 : 0);
        const add = Number(it.additionAmount) || 0;
        const ded = Number(it.deductionAmount) || 0;
        const ship = Number(it.shippingCost) || 0;
        const load = Number(it.loadingCost) || 0;
        const lineTotal = afterDisc + add - ded + txAmount + ship + load;

        return {
          rowNumber: it.rowNumber ?? i + 1,
          description: it.description ?? '',
          quantity: Number(it.quantity ?? 0),
          unit: String(it.unit ?? 'NUMBER'),
          unitPrice: Number(it.unitPrice ?? 0),
          totalPrice: base,
          accountId: it.accountId ?? null,
          wbsItemId: it.wbsItemId ?? null,
          discountPercent: discPercent,
          discountAmount: discAmount,
          additionAmount: add,
          deductionAmount: ded,
          taxPercent: txPercent,
          taxAmount: txAmount,
          shippingCost: ship,
          loadingCost: 0,
          lineTotal,
          isCapital: it.isCapital ?? false,
          usefulLifeMonths: it.usefulLifeMonths ?? null,
          notes: it.notes ?? null,
        };
      });

      const capitalItems = await this.prisma.purchaseInvoiceItem.findMany({
        where: { invoiceId: id, isCapital: true, fixedAssetId: { not: null } },
      });
      if (capitalItems.length > 0) {
        throw new BadRequestException('این فاکتور دارای اقلام دارایی ثابت است و قابل ویرایش ردیف نیست. ابتدا فاکتور را حذف و مجدداً ایجاد کنید.');
      }

      await this.prisma.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });

      const totals = this.computeTotals(items, dto.taxPercent ?? Number(inv.taxPercent), dto.discountAmount ?? Number(inv.discountAmount));
      data.subtotal = totals.subtotal;
      data.totalDiscount = totals.totalDiscount;
      data.totalAddition = totals.totalAddition;
      data.totalDeduction = totals.totalDeduction;
      data.taxAmount = totals.taxAmount;
      data.totalShipping = totals.totalShipping;
      data.totalLoading = totals.totalLoading;
      data.totalAmount = totals.totalAmount;

      return this.prisma.purchaseInvoice.update({
        where: { id },
        data: {
          ...data,
          items: { create: items },
        },
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          items: { orderBy: { rowNumber: 'asc' } },
        },
      });
    }

    const needsRecompute = dto.taxPercent !== undefined || dto.discountAmount !== undefined;
    if (needsRecompute) {
      const items = (inv.items as unknown as RecomputeItem[]).map((it) => ({
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
        discountPercent: Number(it.discountPercent) || 0,
        discountAmount: Number(it.discountAmount) || 0,
        additionAmount: Number(it.additionAmount) || 0,
        deductionAmount: Number(it.deductionAmount) || 0,
        taxPercent: Number(it.taxPercent) || 0,
        taxAmount: 0,
        shippingCost: Number(it.shippingCost) || 0,
        loadingCost: 0,
      }));
      const t = this.computeTotals(
        items,
        dto.taxPercent ?? Number(inv.taxPercent),
        dto.discountAmount ?? Number(inv.discountAmount),
      );
      data.subtotal = t.subtotal;
      data.totalDiscount = t.totalDiscount;
      data.totalAddition = t.totalAddition;
      data.totalDeduction = t.totalDeduction;
      data.taxAmount = t.taxAmount;
      data.totalShipping = t.totalShipping;
      data.totalLoading = t.totalLoading;
      data.totalAmount = t.totalAmount;
    }

    return this.prisma.purchaseInvoice.update({
      where: { id },
      data,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
  }

  async remove(id: string) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل حذف است');
    await this.prisma.purchaseInvoice.delete({ where: { id } });
    return { success: true };
  }
}
