import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from '../warehouse/stock.service';
import { CreateInvCountDto, SetItemsDto } from './dto/inventory-count.dto';

@Injectable()
export class InventoryCountService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'IC-' + year + '-';
    const last = await this.prisma.inventoryCount.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(query?: { warehouseId?: string; status?: string; fromDate?: string; toDate?: string }) {
    const where: any = {};
    where.deletedAt = null;
    if (query?.warehouseId) where.warehouseId = query.warehouseId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.countDate = {};
      if (query.fromDate) where.countDate.gte = new Date(query.fromDate);
      if (query.toDate) where.countDate.lte = new Date(query.toDate);
    }
    return this.prisma.inventoryCount.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ countDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const c = await this.prisma.inventoryCount.findFirst({
      where: { id, deletedAt: null },
      include: {
        warehouse: true,
        items: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true } },
          },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!c) throw new NotFoundException('انبارگردانی یافت نشد');
    return c;
  }

  /**
   * ایجاد انبارگردانی جدید
   * اگر items داده نشود، همه کالاهای موجود در انبار اضافه می‌شوند (با physicalQty = systemQty)
   */
  async create(dto: CreateInvCountDto, userId?: string) {
    const wh = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!wh) throw new NotFoundException('انبار یافت نشد');

    const code = await this.nextCode();

    // Stock فعلی انبار
    const stocks = await this.prisma.stock.findMany({
      where: { warehouseId: dto.warehouseId },
      include: { item: { select: { id: true, code: true, name: true, unit: true } } },
    });

    const provided = dto.items || [];
    const providedMap = new Map(provided.map((p) => [p.itemId, p]));

    const items = stocks.map((s, idx) => {
      const provided = providedMap.get(s.itemId);
      const systemQty = Number(s.quantity);
      const physicalQty = provided ? Number(provided.physicalQty) : systemQty;
      const diff = physicalQty - systemQty;
      const unitCost = Number(s.avgCost);
      return {
        itemId: s.itemId,
        rowNumber: idx + 1,
        systemQty,
        physicalQty,
        difference: diff,
        unitCost,
        differenceCost: diff * unitCost,
        notes: provided?.notes,
      };
    });

    // اگر items با itemId که در Stock نیست داده شده
    for (const p of provided) {
      if (!stocks.find((s) => s.itemId === p.itemId)) {
        const item = await this.prisma.item.findUnique({ where: { id: p.itemId } });
        if (item) {
          items.push({
            itemId: p.itemId,
            rowNumber: items.length + 1,
            systemQty: 0,
            physicalQty: Number(p.physicalQty),
            difference: Number(p.physicalQty),
            unitCost: 0,
            differenceCost: 0,
            notes: p.notes,
          });
        }
      }
    }

    return this.prisma.inventoryCount.create({
      data: {
        code,
        warehouseId: dto.warehouseId,
        countDate: new Date(dto.countDate),
        status: 'DRAFT',
        notes: dto.notes,
        createdById: userId,
        items: { create: items as any },
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: { item: { select: { id: true, code: true, name: true, unit: true } } },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
  }

  async setItems(id: string, dto: SetItemsDto) {
    const c = await this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.$transaction(async (tx) => {
      // برای هر ردیف، physicalQty را به‌روز یا ایجاد کن
      for (const it of dto.items) {
        const existing = c.items.find((x) => x.itemId === it.itemId);
        if (existing) {
          const systemQty = Number(existing.systemQty);
          const physicalQty = Number(it.physicalQty);
          const diff = physicalQty - systemQty;
          const unitCost = Number(existing.unitCost);
          await tx.inventoryCountItem.update({
            where: { id: existing.id },
            data: {
              physicalQty,
              difference: diff,
              differenceCost: diff * unitCost,
              notes: it.notes,
            },
          });
        } else {
          const stock = await tx.stock.findUnique({
            where: { warehouseId_itemId: { warehouseId: c.warehouseId, itemId: it.itemId } },
          });
          const systemQty = Number(stock?.quantity || 0);
          const physicalQty = Number(it.physicalQty);
          const diff = physicalQty - systemQty;
          const unitCost = Number(stock?.avgCost || 0);
          await tx.inventoryCountItem.create({
            data: {
              countId: id,
              itemId: it.itemId,
              rowNumber: c.items.length + 1,
              systemQty,
              physicalQty,
              difference: diff,
              unitCost,
              differenceCost: diff * unitCost,
              notes: it.notes,
            },
          });
        }
      }
      return tx.inventoryCount.update({ where: { id }, data: { updatedAt: new Date() } });
    });
  }

  async removeItem(itemId: string) {
    const it = await this.prisma.inventoryCountItem.findUnique({ where: { id: itemId } });
    if (!it) throw new NotFoundException('ردیف یافت نشد');
    const c = await this.prisma.inventoryCount.findUnique({ where: { id: it.countId } });
    if (!c || c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    await this.prisma.inventoryCountItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async confirm(id: string, userId: string) {
    const c = await this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تایید است');
    return this.prisma.inventoryCount.update({
      where: { id },
      data: { status: 'CONFIRMED', approvedById: userId, approvedAt: new Date() },
    });
  }

  /**
   * Post — اعمال اختلافات روی موجودی انبار
   */
  async post(id: string, userId: string) {
    const c = await this.get(id);
    if (c.status !== 'CONFIRMED') throw new BadRequestException('ابتدا باید تایید شود');
  
    return this.prisma.$transaction(async (tx) => {
      for (const it of c.items) {
        const diff = Number(it.difference);
        if (Math.abs(diff) < 0.0001) continue;

        await this.stock.applyMovement({
          warehouseId: c.warehouseId,
          itemId: it.itemId,
          type: 'ADJUSTMENT',
          quantity: diff, // can be negative
          unitCost: Number(it.unitCost),
          movementDate: c.countDate,
          referenceType: 'inventory-count',
          referenceId: c.id,
          referenceCode: c.code,
          description: 'انبارگردانی ' + c.code + ' - اختلاف ' + diff,
          createdById: userId,
          tx,
        });
      }

      return tx.inventoryCount.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    });
  }

  async cancel(id: string) {
    const c = await this.get(id);
    if (c.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل لغو نیست');
    return this.prisma.inventoryCount.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async remove(id: string, userId?: string) {
    const c = await this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.inventoryCount.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }
}
