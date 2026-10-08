import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from '../warehouse/stock.service';
import {
  CreateTransferDto, UpdateTransferDto,
} from './dto/inventory-count.dto';

@Injectable()
export class WarehouseTransferService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'TRF-' + year + '-';
    const last = await this.prisma.warehouseTransfer.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(query?: { fromWarehouseId?: string; toWarehouseId?: string; status?: string; projectId?: string }) {
    const where: any = {};
    if (query?.fromWarehouseId) where.fromWarehouseId = query.fromWarehouseId;
    if (query?.toWarehouseId) where.toWarehouseId = query.toWarehouseId;
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.projectId = query.projectId;
    return this.prisma.warehouseTransfer.findMany({
      where,
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ transferDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const t = await this.prisma.warehouseTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: { item: { select: { id: true, code: true, name: true, unit: true } } },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!t) throw new NotFoundException('انتقال یافت نشد');
    return t;
  }

  async create(dto: CreateTransferDto, userId?: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('انبار مبدأ و مقصد نباید یکی باشند');
    }
    const from = await this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } });
    const to = await this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } });
    if (!from || !to) throw new NotFoundException('انبار یافت نشد');

    const code = await this.nextCode();

    // آیتم‌ها + بهای میانگین فعلی
    const items: any[] = [];
    let totalValue = 0;

    for (let i = 0; i < (dto.items || []).length; i++) {
      const it = dto.items![i];
      const stock = await this.prisma.stock.findUnique({
        where: { warehouseId_itemId: { warehouseId: dto.fromWarehouseId, itemId: it.itemId } },
      });
      const available = Number(stock?.quantity || 0);
      if (available < it.quantity) {
        throw new BadRequestException('موجودی کافی نیست برای ردیف ' + (i + 1) + ' (موجودی: ' + available + ')');
      }
      const unitCost = Number(stock?.avgCost || 0);
      const totalCost = it.quantity * unitCost;
      totalValue += totalCost;
      items.push({
        itemId: it.itemId,
        rowNumber: i + 1,
        quantity: it.quantity,
        unitCost,
        totalCost,
        notes: it.notes,
      });
    }

    return this.prisma.warehouseTransfer.create({
      data: {
        code,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        projectId: dto.projectId,
        transferDate: new Date(dto.transferDate),
        status: 'DRAFT',
        driverName: dto.driverName,
        vehiclePlate: dto.vehiclePlate,
        notes: dto.notes,
        totalValue,
        createdById: userId,
        items: { create: items as any },
      },
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdateTransferDto) {
    const t = await this.get(id);
    if (t.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.transferDate) data.transferDate = new Date(dto.transferDate);
    if (dto.driverName !== undefined) data.driverName = dto.driverName;
    if (dto.vehiclePlate !== undefined) data.vehiclePlate = dto.vehiclePlate;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.warehouseTransferItem.deleteMany({ where: { transferId: id } });
        let totalValue = 0;
        const items: any[] = [];
        for (let i = 0; i < dto.items.length; i++) {
          const it = dto.items[i];
          const stock = await tx.stock.findUnique({
            where: { warehouseId_itemId: { warehouseId: t.fromWarehouseId, itemId: it.itemId } },
          });
          const available = Number(stock?.quantity || 0);
          if (available < it.quantity) {
            throw new BadRequestException('موجودی کافی نیست برای ردیف ' + (i + 1));
          }
          const unitCost = Number(stock?.avgCost || 0);
          const totalCost = it.quantity * unitCost;
          totalValue += totalCost;
          items.push({
            transferId: id,
            itemId: it.itemId,
            rowNumber: i + 1,
            quantity: it.quantity,
            unitCost,
            totalCost,
            notes: it.notes,
          });
        }
        data.totalValue = totalValue;
        await tx.warehouseTransferItem.createMany({ data: items });
      }
      return tx.warehouseTransfer.update({ where: { id }, data });
    });
  }

  /**
   * ارسال — کسر از انبار مبدأ
   */
  async send(id: string, userId: string) {
    const t = await this.get(id);
    if (t.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (t.items.length === 0) throw new BadRequestException('حداقل یک ردیف لازم است');

    return this.prisma.$transaction(async (tx) => {
      for (const it of t.items) {
        await this.stock.applyMovement({
          warehouseId: t.fromWarehouseId,
          itemId: it.itemId,
          type: 'TRANSFER_OUT',
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          movementDate: t.transferDate,
          referenceType: 'warehouse-transfer',
          referenceId: t.id,
          referenceCode: t.code,
          projectId: t.projectId || undefined,
          description: 'ارسال انتقالی ' + t.code,
          createdById: userId,
          tx,
        });
      }
      return tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'IN_TRANSIT', sentAt: new Date() },
      });
    });
  }

  /**
   * دریافت — اضافه به انبار مقصد
   */
  async receive(id: string, userId: string) {
    const t = await this.get(id);
    if (t.status !== 'IN_TRANSIT') throw new BadRequestException('فقط انتقال در راه قابل دریافت است');

    return this.prisma.$transaction(async (tx) => {
      for (const it of t.items) {
        await this.stock.applyMovement({
          warehouseId: t.toWarehouseId,
          itemId: it.itemId,
          type: 'TRANSFER_IN',
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          movementDate: new Date(),
          referenceType: 'warehouse-transfer',
          referenceId: t.id,
          referenceCode: t.code,
          projectId: t.projectId || undefined,
          description: 'دریافت انتقالی ' + t.code,
          createdById: userId,
          tx,
        });
      }
      return tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date(), receivedById: userId },
      });
    });
  }

  async cancel(id: string, userId: string) {
    const t = await this.get(id);
    if (t.status === 'RECEIVED') throw new BadRequestException('دریافت‌شده قابل لغو نیست');

    return this.prisma.$transaction(async (tx) => {
      // اگر در راه بود، برگردان به مبدأ
      if (t.status === 'IN_TRANSIT') {
        for (const it of t.items) {
          await this.stock.applyMovement({
            warehouseId: t.fromWarehouseId,
            itemId: it.itemId,
            type: 'TRANSFER_IN',
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            movementDate: new Date(),
            referenceType: 'warehouse-transfer-cancel',
            referenceId: t.id,
            referenceCode: t.code,
            description: 'لغو انتقال ' + t.code + ' - برگشت به مبدأ',
            createdById: userId,
            tx,
          });
        }
      }
      return tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async remove(id: string) {
    const t = await this.get(id);
    if (t.status !== 'DRAFT' && t.status !== 'CANCELLED') {
      throw new BadRequestException('فقط پیش‌نویس یا لغو‌شده قابل حذف است');
    }
    await this.prisma.warehouseTransfer.delete({ where: { id } });
    return { success: true };
  }
}
