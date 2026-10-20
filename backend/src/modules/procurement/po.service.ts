import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePODto, UpdatePOItemDto } from './dto/create-po.dto';
import { UpdatePODto } from './dto/update-po.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year + '-';

    const last = await (this.prisma as any).purchaseOrder.findFirst({
      __withDeleted: true,
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let lastNum = 0;
    if (last && last.code) {
      const m = String(last.code).match(new RegExp('^' + prefix + '(\\d+)\$'));
      if (m) lastNum = parseInt(m[1], 10) || 0;
    }

    let candidate = prefix + String(lastNum + 1).padStart(4, '0');
    let tries = 0;
    while (tries < 100) {
      const exists = await (this.prisma as any).purchaseOrder.findFirst({
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

  private computeTotals(items: any[], defaultTaxPercent: number) {
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
    const budget = await (this.prisma as any).projectBudget.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });
    const totalBudget = Number(budget._sum?.amount || 0);
    if (totalBudget <= 0) return;

    const existingPOs = await (this.prisma as any).purchaseOrder.aggregate({
      where: { projectId, status: { in: ['APPROVED', 'SENT', 'RECEIVED'] } },
      _sum: { totalAmount: true },
    });
    const spent = Number(existingPOs._sum?.totalAmount || 0);

    if (spent + totalAmount > totalBudget) {
      throw new BadRequestException(
        `Ù…Ø¨Ù„Øº Ø³ÙØ§Ø±Ø´ (${totalAmount.toLocaleString()} Ø±ÛŒØ§Ù„) Ø¨Ù‡ Ù‡Ù…Ø±Ø§Ù‡ Ø®Ø±ÛŒØ¯Ù‡Ø§ÛŒ Ù‚Ø¨Ù„ÛŒ (${spent.toLocaleString()} Ø±ÛŒØ§Ù„) Ø§Ø² Ø³Ù‚Ù Ø¨ÙˆØ¯Ø¬Ù‡ Ù…ØµÙˆØ¨ Ù¾Ø±ÙˆÚ˜Ù‡ (${totalBudget.toLocaleString()} Ø±ÛŒØ§Ù„) ØªØ¬Ø§ÙˆØ² Ù…ÛŒâ€ŒÚ©Ù†Ø¯.`
      );
    }
  }

  async findAll(query?: { status?: string; projectId?: string; supplierId?: string; search?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
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
    if (!po) throw new NotFoundException('Ø¯Ø³ØªÙˆØ± Ø®Ø±ÛŒØ¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    return po;
  }

  async recompute(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Ø¯Ø³ØªÙˆØ± Ø®Ø±ÛŒØ¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    const defaultTaxPercent = Number(po.taxPercent);
    const rawItems = (po.items as any[]).map((it) => ({
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
    if (!item) throw new NotFoundException('Ø±Ø¯ÛŒÙ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: item.poId },
    });
    if (!po) throw new NotFoundException('Ø¯Ø³ØªÙˆØ± Ø®Ø±ÛŒØ¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    if (po.status !== 'DRAFT') throw new BadRequestException('ÙÙ‚Ø· Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ù‚Ø§Ø¨Ù„ ØªØºÛŒÛŒØ± Ø§Ø³Øª');

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
    if (!item) throw new NotFoundException('Ø±Ø¯ÛŒÙ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: item.poId },
    });
    if (!po) throw new NotFoundException('Ø¯Ø³ØªÙˆØ± Ø®Ø±ÛŒØ¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    if (po.status !== 'DRAFT') throw new BadRequestException('ÙÙ‚Ø· Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ù‚Ø§Ø¨Ù„ ØªØºÛŒÛŒØ± Ø§Ø³Øª');
    await this.prisma.purchaseOrderItem.delete({ where: { id: itemId } });
    await this.recompute(item.poId);
    return { success: true };
  }

  private async resolveUnitIds(codes: (string | null | undefined)[], client: any = this.prisma): Promise<Map<string, string>> {
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
      unit: it.unit as any,
      unitPrice: it.unitPrice,
      taxPercent: it.taxPercent,
      notes: it.notes,
    }));

    const totals = this.computeTotals(rawItems, defaultTaxPercent);

    // Ú©Ù†ØªØ±Ù„ Ø³Ù‚Ù Ø¨ÙˆØ¯Ø¬Ù‡
    await this.checkBudgetLimit(dto.projectId, totals.totalAmount);

    const code = await this.generateCode();
    const poUnitMap = await this.resolveUnitIds(rawItems.map((it) => it.unit));
    for (const it of totals.items as any[]) {
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
          items: { create: totals.items },
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

    const data: any = {};
    if (dto.poDate) data.poDate = new Date(dto.poDate);
    if (dto.deliveryDate !== undefined) data.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const defaultTaxPercent = dto.taxPercent ?? Number(po.taxPercent);
        const rawItems = dto.items.map((it, idx) => ({
          rowNumber: idx + 1,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit as any,
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
        data.items = { create: totals.items };
      } else if (dto.taxPercent !== undefined) {
        const newDefault = Number(dto.taxPercent);
        const rawItems = (po as any).items.map((it: any) => ({
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
        data.items = { create: totals.items };
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
    if (po.status !== 'DRAFT') throw new BadRequestException('ÙÙ‚Ø· Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ù‚Ø§Ø¨Ù„ Ø­Ø°Ù Ø§Ø³Øª');
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { success: true };
  }

  async approve(id: string, _userId: string) {
    const po = await this.findOne(id);
    if (po.status !== 'DRAFT') throw new BadRequestException('ÙÙ‚Ø· Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ù‚Ø§Ø¨Ù„ ØªØ§ÛŒÛŒØ¯ Ø§Ø³Øª');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async send(id: string) {
    const po = await this.findOne(id);
    if (po.status !== 'APPROVED') throw new BadRequestException('Ø§Ø¨ØªØ¯Ø§ Ø¨Ø§ÛŒØ¯ ØªØ§ÛŒÛŒØ¯ Ø´ÙˆØ¯');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error('Ø±Ú©ÙˆØ±Ø¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    if ((existing as any).deletedAt) throw new Error('Ù‚Ø¨Ù„Ø§Ù‹ Ø­Ø°Ù Ø´Ø¯Ù‡ Ø§Ø³Øª');
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error('Ø±Ú©ÙˆØ±Ø¯ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    if (!(existing as any).deletedAt) throw new Error('Ø­Ø°Ùâ€ŒÙ†Ø´Ø¯Ù‡ Ø§Ø³Øª');
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });
    return { ok: true, id, restored: true, restoredBy: userId || null };
  }
}
