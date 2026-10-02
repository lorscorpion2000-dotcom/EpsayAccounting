import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class WarehouseReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * کاردکس کالا - تمام حرکات یک کالا در یک انبار
   */
  async kardex(query: { warehouseId?: string; itemId: string; fromDate?: string; toDate?: string }) {
    const item = await this.prisma.item.findUnique({
      where: { id: query.itemId },
      include: { category: true },
    });
    if (!item) return { item: null, rows: [], totals: null };

    const where: any = { itemId: query.itemId };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.fromDate || query.toDate) {
      where.movementDate = {};
      if (query.fromDate) where.movementDate.gte = new Date(query.fromDate);
      if (query.toDate) where.movementDate.lte = new Date(query.toDate);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });

    let running = 0;
    const rows = movements.map((m) => {
      const qty = Number(m.quantity);
      const isIn = ['IN', 'TRANSFER_IN', 'RETURN'].includes(m.type);
      running += isIn ? qty : -qty;
      return {
        id: m.id,
        date: m.movementDate,
        type: m.type,
        warehouse: m.warehouse,
        reference: m.referenceCode,
        description: m.description,
        inQty: isIn ? qty : 0,
        outQty: !isIn ? qty : 0,
        balance: running,
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost),
      };
    });

    const totals = rows.reduce(
      (s, r) => ({
        inQty: s.inQty + r.inQty,
        outQty: s.outQty + r.outQty,
        inValue: s.inValue + (r.inQty ? r.totalCost : 0),
        outValue: s.outValue + (r.outQty ? r.totalCost : 0),
      }),
      { inQty: 0, outQty: 0, inValue: 0, outValue: 0 },
    );

    return { item, rows, totals };
  }

  /**
   * موجودی جاری همه انبارها
   */
  async currentInventory(query?: { warehouseId?: string; type?: string }) {
    const where: any = { quantity: { gt: 0 } };
    if (query?.warehouseId) where.warehouseId = query.warehouseId;
    if (query?.type) where.item = { type: query.type };

    return this.prisma.stock.findMany({
      where,
      include: {
        item: { include: { category: true } },
        warehouse: true,
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
    });
  }

  /**
   * اقلام زیر حد تجدید سفارش
   */
  async lowStock(warehouseId?: string) {
    const stocks = await this.prisma.stock.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        item: { include: { category: true } },
        warehouse: true,
      },
    });

    return stocks
      .filter((s) => {
        const reorder = Number(s.item.reorderPoint || 0);
        const qty = Number(s.quantity);
        return reorder > 0 && qty <= reorder;
      })
      .map((s) => ({
        ...s,
        shortage: Number(s.item.reorderPoint || 0) - Number(s.quantity),
      }));
  }

  /**
   * آمار انبار
   */
  async stats() {
    const [warehouses, items, lowStockCount, totalValue] = await Promise.all([
      this.prisma.warehouse.count({ where: { isActive: true } }),
      this.prisma.item.count({ where: { isActive: true } }),
      this.lowStock().then((r) => r.length),
      this.prisma.stock.aggregate({ _sum: { totalValue: true } }),
    ]);

    return {
      warehouses,
      items,
      lowStockCount,
      totalValue: Number(totalValue._sum.totalValue || 0),
    };
  }
}
