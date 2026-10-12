import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { FiscalYearsService } from '../accounting/fiscal-years.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private prisma: PrismaService,
    _engine: AccountingEngineService,
    private fiscalYears: FiscalYearsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PI-' + year + '-';

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

  private computeTotals(items: any[], _taxPercent: number, discountAmount: number) {
    let subtotal = 0, totalDiscount = 0, totalAddition = 0, totalDeduction = 0;
    let totalTax = 0, totalShipping = 0, totalLoading = 0, grandTotal = 0;

    for (const it of items) {
      const base = Number(it.totalPrice ?? (Number(it.quantity) * Number(it.unitPrice)));

      // تخفیف
      const discPercent = Number(it.discountPercent) || 0;
      const itemDisc = Number(it.discountAmount) || (discPercent > 0 ? (base * discPercent) / 100 : 0);
      const afterDisc = base - itemDisc;

      // مالیات
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

    // اگر تخفیف/مالیات کل فاکتور داده شده بود، اعمال کن
    // (این‌ها بعد از محاسبه ردیف‌ها اعمال می‌شوند)
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
    const where: any = {};
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.projectId)  where.projectId  = query.projectId;
    if (query?.status)     where.status     = query.status;
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

  async create(dto: CreatePurchaseInvoiceDto, userId?: string) {
    const code = await this.generateCode();
    const items = (dto.items ?? []).map((it: any, i: number) => {
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
        description: it.description,
        quantity: it.quantity,
        unit: (it.unit ?? 'NUMBER') as any,
        unitPrice: it.unitPrice,
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

    const code = await this.generateCode();
    const items = po.items.map((it) => ({
      rowNumber: it.rowNumber,
      description: it.description,
      quantity: Number(it.quantity),
      unit: it.unit as any,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
      accountId: null,
      wbsItemId: null,
      notes: it.notes ?? null,
    }));

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
        taxPercent,
        subtotal, taxAmount, totalAmount,
        createdById: userId ?? null,
        items: { create: items },
      },
      include: { supplier: true, items: true },
    });
  }

  async update(id: string, dto: UpdatePurchaseInvoiceDto) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط فاکتورهای DRAFT قابل ویرایش‌اند');

    const data: any = {};
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceDate !== undefined)   data.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate !== undefined)       data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.projectId !== undefined)     data.projectId = dto.projectId;
    if (dto.notes !== undefined)         data.notes = dto.notes;
    if (dto.taxPercent !== undefined)    data.taxPercent = dto.taxPercent;
    if (dto.discountAmount !== undefined) data.discountAmount = dto.discountAmount;
    if (dto.supplierId !== undefined)    data.supplierId = dto.supplierId;

    // اگر items داده شده → جایگزین کن
    if (dto.items !== undefined) {
      if (!dto.items.length) throw new BadRequestException('حداقل یک ردیف لازم است');

      const items = dto.items.map((it: any, i: number) => {
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
          description: it.description,
          quantity: it.quantity,
          unit: (it.unit ?? 'NUMBER') as any,
          unitPrice: it.unitPrice,
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

      // حذف آیتم‌های قدیمی (به‌جز capital که به FixedAsset وصل شدن)
      // ابتدا مقادیر capital items رو چک کن
      const capitalItems = await this.prisma.purchaseInvoiceItem.findMany({
        where: { invoiceId: id, isCapital: true, fixedAssetId: { not: null } },
      });
      if (capitalItems.length > 0) {
        // برای سادگی، فقط اجازه می‌دیم آیتم‌های غیرcapital جایگزین بشن و capital ها بمونن
        // این محدودیت در UI هم باید نمایش داده بشه
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

    // فقط فیلدهای ساده تغییر داده شدن → totals رو دوباره حساب کن
    const needsRecompute = dto.taxPercent !== undefined || dto.discountAmount !== undefined;
    if (needsRecompute) {
      const items = (inv.items as any[]).map((it) => ({
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

  /** ثبت سند حسابداری فاکتور — سه خطی: بدهکار هزینه‌ها + بدهکار مالیات → بستانکار پرداختنی */
  async approve(id: string, userId?: string) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('فقط DRAFT قابل تأیید است');
    if (inv.journalEntryId) throw new BadRequestException('قبلاً سند ثبت شده');

    // حسابهای لازم
    const expenseAcc = await this.resolveExpenseAccount(inv);
    const vatAcc     = await this.getVatAccount();
    const payableAcc = await this.resolveSupplierPayable(inv.supplierId);

    // ساخت JE سه‌خطی
    // C-4.b: capital/non-capital split + asset mapping
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

    // B3.c: GRNI path — فاکتوری که از رسید انبار می‌آید
    if (inv.grId) {
      const grniMapping = await this.prisma.accountMapping.findUnique({
        where: { code: 'GOODS_RECEIPT' },
      });
      if (!grniMapping || !grniMapping.creditAccountId) {
        throw new BadRequestException('Mapping GOODS_RECEIPT ناقص است');
      }
      const grniAmount = subtotalNum - discountNum;
      const grniLines: any[] = [];
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
    for (const it of ((inv as any).items || [])) {
      const gross = Number(it.totalPrice);
      const share = subtotalNum > 0 ? (gross / subtotalNum) * discountNum : 0;
      const net = gross - share;
      if (it.isCapital && assetAccId) capitalNet += net;
      else normalNet += net;
    }
    const jeLines: any[] = [];
    if (normalNet > 0.01) {
      if (!expenseAcc) throw new BadRequestException('Expense account required');
      jeLines.push({ accountId: expenseAcc.id, debit: normalNet });
    }
    if (capitalNet > 0.01 && assetAccId) jeLines.push({ accountId: assetAccId, debit: capitalNet });
    if (taxNum > 0.01) jeLines.push({ accountId: vatAcc.id, debit: taxNum });
    jeLines.push({ accountId: payableAcc.id, credit: totalNum });

    // B2.4: period lock
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
    const capitalItems = ((inv as any).items || []).filter((it: any) => it.isCapital);
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

  /** حساب هزینه: اولین ردیف با accountId، وگرنه mapping PURCHASE_CREDIT.debit */
  private async resolveExpenseAccount(inv: any) {
    const itemWithAcc = inv.items.find((it: any) => it.accountId);
    if (itemWithAcc) {
      return this.prisma.account.findUnique({ where: { id: itemWithAcc.accountId } });
    }
    const mapping = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_CREDIT' } });
    if (mapping?.debitAccountId) {
      return this.prisma.account.findUnique({ where: { id: mapping.debitAccountId } });
    }
    return null;
  }

  private async getVatAccount() {
    // اول از mapping (اگر بعداً seed شد)، بعد مستقیم از کد 2.1.3
    const mapping = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_VAT' } }).catch(() => null);
    if (mapping?.debitAccountId) {
      const a = await this.prisma.account.findUnique({ where: { id: mapping.debitAccountId } });
      if (a) return a;
    }
    const direct = await this.prisma.account.findFirst({ where: { code: '2.1.3' } });
    if (!direct) throw new BadRequestException('حساب مالیات 2.1.3 پیدا نشد');
    return direct;
  }

  /** تفصیل زیر 2.1.1 برای تأمین‌کننده */
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
    const nextCode = `2.1.1.${String(maxLast + 1).padStart(2, '0')}`;

    detail = await this.prisma.account.create({
      data: {
        code: nextCode,
        name: supplier.name,
        level: 'DETAIL' as any,
        nature: 'CREDIT' as any,
        parentId: parent.id,
        isPostable: true,
        isActive: true,
        detailType: 'SUPPLIER' as any,
        detailId: supplier.id,
      },
    });
    if (parent.isPostable) {
      await this.prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
    }
    return detail;
  }

  /** ساخت JE چندخطی با شماره‌گذاری درست */
  private async createMultiLineJE(args: {
    entryDate: Date;
    description: string;
    sourceType: string;
    sourceId: string;
    userId?: string;
    projectId?: string | null;
    lines: Array<{ accountId: string; debit?: number; credit?: number; description?: string }>;
  }) {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: {
        startDate: { lte: args.entryDate },
        endDate:   { gte: args.entryDate },
      },
      orderBy: { startDate: 'desc' },
    });
    if (!fy) throw new BadRequestException('سال مالی برای تاریخ سند پیدا نشد');

    const last = await this.prisma.journalEntry.findFirst({
      where: { fiscalYearId: fy.id },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    const entryNumber = (last?.entryNumber ?? 0) + 1;
    const code = 'JV-' + (fy.code ?? '1405') + '-' + String(entryNumber).padStart(5, '0');

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

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) {
      return { ok: true, id, softDeleted: true, alreadyDeleted: true };
    }
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });
    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
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