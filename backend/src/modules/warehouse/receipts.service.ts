import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from './stock.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreateReceiptFromPoDto } from './dto/create-receipt-from-po.dto';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'goodsReceipt', 'code', 'GRN-' + year + '-', { pad: 4 });
  }

  /**
   * محاسبه‌ی مقادیر مالی هر ردیف و جمع کل
   */
  private computeLine(it: any) {
    const qty = Number(it.quantity) || 0;
    const unitCost = Number(it.unitCost) || 0;
    const base = qty * unitCost;

    const discountPercent = Number(it.discountPercent) || 0;
    const discountAmount = Number(it.discountAmount) || (discountPercent > 0 ? (base * discountPercent) / 100 : 0);

    const additionAmount  = Number(it.additionAmount)  || 0;
    const deductionAmount = Number(it.deductionAmount) || 0;

    const afterDiscount = base - discountAmount;
    const taxPercent    = Number(it.taxPercent) || 0;
    const taxAmount     = taxPercent > 0 ? (afterDiscount * taxPercent) / 100 : 0;

    const shippingCost = Number(it.shippingCost) || 0;
    const loadingCost  = Number(it.loadingCost) || 0;

    const lineTotal = afterDiscount + additionAmount - deductionAmount + taxAmount + shippingCost + loadingCost;

    return {
      base,
      discountPercent,
      discountAmount,
      additionAmount,
      deductionAmount,
      taxPercent,
      taxAmount,
      shippingCost,
      loadingCost,
      lineTotal,
      totalCost: base - discountAmount + additionAmount - deductionAmount + shippingCost + loadingCost, // landed (بدون مالیات)
    };
  }

  /**
   * تجمیع کل رسید از روی اقلام
   */
  private computeTotals(items: any[]) {
    let subtotal = 0, totalDiscount = 0, totalAddition = 0, totalDeduction = 0;
    let totalTax = 0, totalShipping = 0, totalLoading = 0, grandTotal = 0, totalValue = 0;

    for (const it of items) {
      const c = this.computeLine(it);
      subtotal       += c.base;
      totalDiscount  += c.discountAmount;
      totalAddition  += c.additionAmount;
      totalDeduction += c.deductionAmount;
      totalTax       += c.taxAmount;
      totalShipping  += c.shippingCost;
      totalLoading   += c.loadingCost;
      grandTotal     += c.lineTotal;
      totalValue     += c.totalCost;
    }
    return { subtotal, totalDiscount, totalAddition, totalDeduction, totalTax, totalShipping, totalLoading, grandTotal, totalValue };
  }

  async findAll(query?: { warehouseId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    if (query?.warehouseId) where.warehouseId = query.warehouseId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    return this.prisma.goodsReceipt.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        project: { select: { id: true, code: true, name: true } },
        supplier: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { item: { include: { category: true } } },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!r) throw new NotFoundException('رسید انبار یافت نشد');
    return r;
  }

  async create(dto: CreateReceiptDto, userId: string) {
    const code = await this.generateCode();
    const totals = this.computeTotals(dto.items);

    return this.prisma.goodsReceipt.create({
      data: {
        code,
        warehouseId: dto.warehouseId,
        projectId: dto.projectId,
        supplierId: dto.supplierId,
        poId: dto.poId,
        prId: dto.prId,
        receiptDate: new Date(dto.receiptDate),
        reference: dto.reference,
        driverName: dto.driverName,
        vehiclePlate: dto.vehiclePlate,
        notes: dto.notes,
        totalValue: totals.totalValue,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        totalAddition: totals.totalAddition,
        totalDeduction: totals.totalDeduction,
        totalTax: totals.totalTax,
        totalShipping: totals.totalShipping,
        totalLoading: totals.totalLoading,
        grandTotal: totals.grandTotal,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: dto.items.map((it, idx) => {
            const c = this.computeLine(it);
            return {
              itemId: it.itemId,
              rowNumber: idx + 1,
              quantity: it.quantity,
              unitCost: it.unitCost,
              totalCost: c.totalCost,
              discountPercent: c.discountPercent,
              discountAmount: c.discountAmount,
              additionAmount: c.additionAmount,
              deductionAmount: c.deductionAmount,
              taxPercent: c.taxPercent,
              taxAmount: c.taxAmount,
              shippingCost: c.shippingCost,
              loadingCost: c.loadingCost,
              lineTotal: c.lineTotal,
              notes: it.notes,
            };
          }),
        },
      },
      include: {
        items: { include: { item: true }, orderBy: { rowNumber: 'asc' } },
        warehouse: true,
        supplier: true,
      },
    });
  }
  /**
   * ایجاد رسید انبار از PO (دستی). quantity/unitCost پیش‌فرض از PO.
   * هر PO فقط یک GR قابل post دارد (بلاک دوباره‌شماری).
   */
  async createFromPO(poId: string, dto: CreateReceiptFromPoDto, userId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!po) throw new NotFoundException('PO یافت نشد');
    if (po.status === 'CANCELLED') throw new BadRequestException('PO لغو شده است');
    if (!po.supplierId) throw new BadRequestException('PO تأمین‌کننده ندارد');

    const existingPosted = await this.prisma.goodsReceipt.findFirst({
      where: { poId, status: 'POSTED' },
      select: { id: true, code: true },
    });
    if (existingPosted) {
      throw new BadRequestException('GR قبلاً post شده برای این PO: ' + existingPosted.code);
    }

    const poItemMap = new Map(po.items.map((it) => [it.id, it]));
    for (const it of dto.items) {
      if (!poItemMap.has(it.poItemId)) {
        throw new BadRequestException('poItemId ' + it.poItemId + ' متعلق به این PO نیست');
      }
    }

    const receiptItems = dto.items.map((it) => {
      const poItem = poItemMap.get(it.poItemId)!;
      return {
        itemId: it.itemId,
        quantity: it.quantity ?? Number(poItem.quantity),
        unitCost: it.unitCost ?? Number(poItem.unitPrice),
        discountPercent: it.discountPercent,
        discountAmount:  it.discountAmount,
        additionAmount:  it.additionAmount,
        deductionAmount: it.deductionAmount,
        taxPercent:      it.taxPercent,
        taxAmount:       it.taxAmount,
        shippingCost:    it.shippingCost,
        loadingCost:     it.loadingCost,
        notes: it.notes ?? ('از PO ' + po.code + ' ردیف ' + poItem.rowNumber),
      };
    });

    return this.create({
      warehouseId: dto.warehouseId,
      projectId:   po.projectId,
      supplierId:  po.supplierId,
      poId:        po.id,
      prId:        po.prId ?? undefined,
      receiptDate: dto.receiptDate,
      reference:   dto.reference,
      driverName:  dto.driverName,
      vehiclePlate: dto.vehiclePlate,
      notes:       dto.notes,
      items:       receiptItems,
    } as any, userId);
  }



  async update(id: string, dto: UpdateReceiptDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط رسید پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId;
    if (dto.receiptDate) data.receiptDate = new Date(dto.receiptDate);
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.driverName !== undefined) data.driverName = dto.driverName;
    if (dto.vehiclePlate !== undefined) data.vehiclePlate = dto.vehiclePlate;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const totals = this.computeTotals(dto.items);
        data.totalValue = totals.totalValue;
        data.subtotal = totals.subtotal;
        data.totalDiscount = totals.totalDiscount;
        data.totalAddition = totals.totalAddition;
        data.totalDeduction = totals.totalDeduction;
        data.totalTax = totals.totalTax;
        data.totalShipping = totals.totalShipping;
        data.totalLoading = totals.totalLoading;
        data.grandTotal = totals.grandTotal;

        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        data.items = {
          create: dto.items.map((it, idx) => {
            const c = this.computeLine(it);
            return {
              itemId: it.itemId,
              rowNumber: idx + 1,
              quantity: it.quantity,
              unitCost: it.unitCost,
              totalCost: c.totalCost,
              discountPercent: c.discountPercent,
              discountAmount: c.discountAmount,
              additionAmount: c.additionAmount,
              deductionAmount: c.deductionAmount,
              taxPercent: c.taxPercent,
              taxAmount: c.taxAmount,
              shippingCost: c.shippingCost,
              loadingCost: c.loadingCost,
              lineTotal: c.lineTotal,
              notes: it.notes,
            };
          }),
        };
      }
      return tx.goodsReceipt.update({
        where: { id },
        data,
        include: { items: { include: { item: true } } },
      });
    });
  }

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط رسید پیش‌نویس قابل حذف است');
    await this.prisma.goodsReceipt.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (!r.items.length) throw new BadRequestException('رسید باید حداقل یک قلم داشته باشد');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, _userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string, _reason: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * ثبت رسید → اعمال موجودی + سند حسابداری (B3.a)
   */
  async post(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'APPROVED') throw new BadRequestException('ابتدا رسید باید تایید شود');

    // B3.a: idempotency — اگر قبلاً سند ثبت شده
    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'GOODS_RECEIPT', sourceId: r.id },
      select: { id: true, code: true },
    });
    if (existing) {
      if ((r.status as string) !== 'POSTED') {
        await this.prisma.goodsReceipt.update({
          where: { id },
          data: { status: 'POSTED', postedAt: new Date() },
        });
      }
      return { success: true, alreadyPosted: true, journalCode: existing.code };
    }

    const totalValue = Number(r.totalValue);

    return this.prisma.$transaction(async (tx) => {
      // ۱) اعمال موجودی
      for (const it of r.items) {
        await this.stock.applyMovement({
          warehouseId: r.warehouseId,
          itemId: it.itemId,
          type: 'IN',
          quantity: Number(it.quantity),
          unitCost: Number(it.quantity) > 0 ? Number(it.totalCost) / Number(it.quantity) : Number(it.unitCost),
          movementDate: r.receiptDate,
          referenceType: 'goods-receipt',
          referenceId: r.id,
          referenceCode: r.code,
          projectId: r.projectId || undefined,
          partnerId: r.supplierId || undefined,
          description: 'ورود کالا طبق رسید ' + r.code,
          createdById: userId,
          tx,
        });
      }

      // ۲) سند حسابداری Dr 1.1.3.01 / Cr 2.1.8.01
      let journalCode: string | null = null;
      if (totalValue > 0.01) {
        const je = await this.engine.postEvent('GOODS_RECEIPT', {
          amount: totalValue,
          entryDate: r.receiptDate,
          description: 'رسید انبار ' + r.code,
          reference: r.code,
          projectId: r.projectId || undefined,
          partnerId: r.supplierId || undefined,
          sourceId: r.id,
          userId,
          autoPost: true,
        }, tx);
        journalCode = je.code;
      }

      // ۳) تغییر وضعیت
      await tx.goodsReceipt.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });

      return { success: true, journalCode, totalValue };
    });
  }
}
