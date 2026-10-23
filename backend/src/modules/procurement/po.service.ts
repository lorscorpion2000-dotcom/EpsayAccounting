import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePODto, UpdatePOItemDto } from './dto/create-po.dto';
import { UpdatePODto } from './dto/update-po.dto';

type PrismaUnit = string | null | undefined;

type POItemWithLegacyUnit = Prisma.PurchaseOrderItemGetPayload<object> & {
  unit?: string | null;
};

interface ComputeItem {
  rowNumber?: number;
  description?: string | null;
  quantity: number | string;
  unit?: PrismaUnit;
  unitPrice: number | string;
  taxPercent?: unknown;
  notes?: string | null;
  unitId?: string | null;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private get prismaWithDeleted() {
    return this.prisma as unknown as {
      purchaseOrder: {
        findFirst: (args: unknown) => Promise<{ code: string } | null>;
      };
    };
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year + '-';

    const last = await this.prismaWithDeleted.purchaseOrder.findFirst({
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

    let candidate = prefix + String(lastNum + 1).padStart(4, '0');
    let tries = 0;
    while (tries < 100) {
      const exists = await this.prismaWithDeleted.purchaseOrder.findFirst({
        __withDeleted: true,
        where: { code: candidate },
        select: { code: true },
      });
      if (!exists) return candidate;
      tries++;
      lastNum++;
      candidate = prefix + String(lastNum + 1).padStart(4, '0');
    }
    throw new Error('Cannot generate unique code for PO');
  }

  private computeTotals(items: ComputeItem[], defaultTaxPercent: number) {
    let subtotal = 0;
    let taxAmount = 0;
    const enriched = items.map((it) => {
      const lineSubtotal = Number(it.quantity) * Number(it.unitPrice);
      const lineTaxPercent =
        it.taxPercent !== undefined && it.taxPercent !== null
          ? Number(it.taxPercent)
          : Number(defaultTaxPercent);
      const lineTaxAmount = (lineSubtotal * lineTaxPercent) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTaxAmount;
      return { ...it, taxPercent: lineTaxPercent, totalPrice: lineSubtotal };
    });
    const totalAmount = subtotal + taxAmount;
    const effectiveTaxPercent =
      subtotal > 0 ? Math.round((taxAmount / subtotal) * 10000) / 100 : Number(defaultTaxPercent);
    return { subtotal, taxAmount, totalAmount, effectiveTaxPercent, items: enriched };
  }

  async checkBudgetLimit(projectId: string, totalAmount: number) {
    const budget = await this.prisma.projectBudget.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    const totalBudget = Number(budget._sum?.amount || 0);
    if (totalBudget <= 0) return;

    const existingPOs = await this.prisma.purchaseOrder.aggregate({
      where: { projectId, status: { in: ['APPROVED', 'SENT', 'RECEIVED'] } },
      _sum: { totalAmount: true },
    });
    const spent = Number(existingPOs._sum?.totalAmount || 0);

    if (spent + totalAmount > totalBudget) {
      throw new BadRequestException(
        `مبلغ سفارش (${totalAmount.toLocaleString()} ریال) به همراه خریدهای قبلی (${spent.toLocaleString()} ریال) از سقف بودجه مصوب پروژه (${totalBudget.toLocaleString()} ریال) تجاوز می‌کند.`
      );
    }
  }

  async findAll(query?: { status?: string; projectId?: string; supplierId?: string; search?: string }) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (query?.status) where.status = query.status as Prisma.PurchaseOrderWhereInput['status'];
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
        pr: { select: { id: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        supplier: true,
        pr: { select: { id: true, code: true, items: { orderBy: { rowNumber: 'asc' } } } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!po) throw new NotFoundException('دستور خرید یافت نشد');
    return po;
  }

  async recompute(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('دستور خرید یافت نشد');
    const defaultTaxPercent = Number(po.taxPercent);
    const rawItems = (po.items as POItemWithLegacyUnit[]).map((it) => ({
      rowNumber: it.rowNumber,
      description: it.description,
      quantity: Number(it.quantity),
      unit: it.unit,
      unitPrice: Number(it.unitPrice),
      taxPercent: it.taxPercent,
      notes: it.notes,
    }));
    const totals = this.computeTotals(rawItems, defaultTaxPercent);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        subtotal: totals.subtotal,
        taxPercent: totals.effectiveTaxPercent,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      },
    });
  }

  async updateItem(itemId: string, dto: UpdatePOItemDto) {
    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('ردیف یافت نشد');
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: item.poId },
    });
    if (!po) throw new NotFoundException('دستور خرید یافت نشد');
    if (po.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');

    const quantity = dto.quantity !== undefined ? Number(dto.quantity) : Number(item.quantity);
    const unitPrice = dto.unitPrice !== undefined ? Number(dto.unitPrice) : Number(item.unitPrice);
    const totalPrice = quantity * unitPrice;

    const unitId = dto.unit !== undefined
      ? (dto.unit ? (await this.resolveUnitIds([dto.unit])).get(dto.unit) ?? null : null)
      : undefined;

    const updated = await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(unitId !== undefined && { unitId }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.taxPercent !== undefined && { taxPercent: dto.taxPercent }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        totalPrice,
      },
    });
    await this.recompute(item.poId);
    return updated;
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('ردیف یافت نشد');
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: item.poId },
    });
    if (!po) throw new NotFoundException('دستور خرید یافت نشد');
    if (po.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    await this.prisma.purchaseOrderItem.delete({ where: { id: itemId } });
    await this.recompute(item.poId);
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

  async create(dto: CreatePODto, userId: string) {
    const defaultTaxPercent = dto.taxPercent ?? 9;

    const rawItems = dto.items.map((it, idx) => ({
      rowNumber: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit as PrismaUnit,
      unitPrice: it.unitPrice,
      taxPercent: it.taxPercent,
      notes: it.notes,
    }));

    const totals = this.computeTotals(rawItems, defaultTaxPercent);

    // کنترل سقف بودجه
    await this.checkBudgetLimit(dto.projectId, totals.totalAmount);

    const code = await this.generateCode();
    const poUnitMap = await this.resolveUnitIds(rawItems.map((it) => it.unit));
    for (const it of totals.items) {
      it.unitId = it.unit ? (poUnitMap.get(it.unit) ?? null) : null;
    }

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          code,
          prId: dto.prId,
          projectId: dto.projectId,
          supplierId: dto.supplierId || null,
          poDate: new Date(dto.poDate),
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          subtotal: totals.subtotal,
          taxPercent: totals.effectiveTaxPercent,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          notes: dto.notes,
          status: 'DRAFT',
          createdById: userId,
          items: { create: totals.items as unknown as never[] },
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: true,
          items: { orderBy: { rowNumber: 'asc' } },
        },
      });

      if (dto.prId) {
        await tx.purchaseRequest.update({
          where: { id: dto.prId },
          data: { status: 'ORDERED' },
        });
      }

      return po;
    });
  }

  async update(id: string, dto: UpdatePODto) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT purchase orders can be edited');
    }

    const data: Prisma.PurchaseOrderUpdateInput = {};
    if (dto.poDate) data.poDate = new Date(dto.poDate);
    if (dto.deliveryDate !== undefined) data.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.supplierId !== undefined) {
      data.supplier = dto.supplierId ? { connect: { id: dto.supplierId } } : { disconnect: true };
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const defaultTaxPercent = dto.taxPercent ?? Number(po.taxPercent);
        const rawItems = dto.items.map((it, idx) => ({
          rowNumber: idx + 1,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit as PrismaUnit,
          unitPrice: it.unitPrice,
          taxPercent: it.taxPercent,
          notes: it.notes,
        }));
        const totals = this.computeTotals(rawItems, defaultTaxPercent);

        data.subtotal = totals.subtotal;
        data.taxPercent = totals.effectiveTaxPercent;
        data.taxAmount = totals.taxAmount;
        data.totalAmount = totals.totalAmount;

        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        data.items = { create: totals.items as unknown as never[] };
      } else if (dto.taxPercent !== undefined) {
        const newDefault = Number(dto.taxPercent);
        const rawItems = (po.items as POItemWithLegacyUnit[]).map((it) => ({
          rowNumber: it.rowNumber,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitPrice: Number(it.unitPrice),
          taxPercent: newDefault,
          notes: it.notes,
        }));
        const totals = this.computeTotals(rawItems, newDefault);

        data.subtotal = totals.subtotal;
        data.taxPercent = totals.effectiveTaxPercent;
        data.taxAmount = totals.taxAmount;
        data.totalAmount = totals.totalAmount;

        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        data.items = { create: totals.items as unknown as never[] };
      }

      return tx.purchaseOrder.update({
        where: { id },
        data,
        include: { items: { orderBy: { rowNumber: 'asc' } }, supplier: true },
      });
    });
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { success: true };
  }

  async approve(id: string, _userId: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تایید است');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async send(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'APPROVED') throw new BadRequestException('ابتدا باید تایید شود');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async softDelete(id: string, userId?: string, reason?: string, _meta: Record<string, unknown> = {}) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (existing.deletedAt) throw new Error('قبلاً حذف شده است');
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!existing.deletedAt) throw new Error('رکورد حذف نشده است');
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: Record<string, unknown> = {}) {
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }
}
