import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePODto } from './dto/create-po.dto';
import { UpdatePODto } from './dto/update-po.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count();
    return 'PO-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  private computeTotals(items: any[], taxPercent: number) {
    const subtotal = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0);
    const taxAmount = (subtotal * Number(taxPercent)) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
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
    if (!po) throw new NotFoundException('دستور خرید یافت نشد');
    return po;
  }

  async create(dto: CreatePODto, userId: string) {
    const code = await this.generateCode();
    const taxPercent = dto.taxPercent ?? 9;

    const itemsWithTotals = dto.items.map((it, idx) => ({
      rowNumber: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit as any,
      unitPrice: it.unitPrice,
      totalPrice: Number(it.quantity) * Number(it.unitPrice),
      notes: it.notes,
    }));

    const totals = this.computeTotals(itemsWithTotals, taxPercent);

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
          taxPercent,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          notes: dto.notes,
          status: 'DRAFT',
          createdById: userId,
          items: { create: itemsWithTotals },
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: true,
          items: { orderBy: { rowNumber: 'asc' } },
        },
      });

      // به‌روزرسانی PR به ORDERED
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
      throw new BadRequestException('فقط دستورات خرید پیش‌نویس قابل ویرایش هستند');
    }

    const data: any = {};
    if (dto.poDate) data.poDate = new Date(dto.poDate);
    if (dto.deliveryDate !== undefined) data.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.taxPercent !== undefined) data.taxPercent = dto.taxPercent;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const itemsWithTotals = dto.items.map((it, idx) => ({
          rowNumber: idx + 1,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit as any,
          unitPrice: it.unitPrice,
          totalPrice: Number(it.quantity) * Number(it.unitPrice),
          notes: it.notes,
        }));

        const taxPercent = dto.taxPercent ?? Number(po.taxPercent);
        const totals = this.computeTotals(itemsWithTotals, taxPercent);

        data.subtotal = totals.subtotal;
        data.taxAmount = totals.taxAmount;
        data.totalAmount = totals.totalAmount;

        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        data.items = { create: itemsWithTotals };
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

  async approve(id: string, userId: string) {
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
}
