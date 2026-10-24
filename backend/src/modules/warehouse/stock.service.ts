import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async findByWarehouse(warehouseId: string) {
    return this.prisma.stock.findMany({
      where: { warehouseId },
      include: { item: { include: { category: true } } },
      orderBy: { item: { name: 'asc' } },
    });
  }

  async findByItem(itemId: string) {
    return this.prisma.stock.findMany({
      where: { itemId },
      include: { warehouse: true },
    });
  }

  async getItemTotalStock(itemId: string) {
    const r = await this.prisma.stock.aggregate({
      where: { itemId },
      _sum: { quantity: true, totalValue: true },
    });
    return {
      quantity: Number(r._sum.quantity || 0),
      totalValue: Number(r._sum.totalValue || 0),
    };
  }

  async movements(query: { warehouseId?: string; itemId?: string; fromDate?: string; toDate?: string; type?: string }) {
    const where: Prisma.StockMovementWhereInput = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.itemId) where.itemId = query.itemId;
    if (query.type) where.type = query.type as Prisma.StockMovementWhereInput['type'];
    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      where.movementDate = dateFilter;
    }
    return this.prisma.stockMovement.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        item: { select: { id: true, code: true, name: true, unitObj: { select: { id: true, name: true, symbol: true } } } },
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  /**
   * محاسبه بهای میانگین موزون
   */
  async computeWeightedAvg(warehouseId: string, itemId: string, inQty: number, inCost: number) {
    const existing = await this.prisma.stock.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
    });
    const oldQty = Number(existing?.quantity || 0);
    const oldCost = Number(existing?.avgCost || 0);
    const totalQty = oldQty + inQty;
    if (totalQty === 0) return 0;
    return ((oldQty * oldCost) + (inQty * inCost)) / totalQty;
  }

  /**
   * اعمال حرکت انبار
   */
  async applyMovement(data: {
    warehouseId: string;
    itemId: string;
    type: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN';
    quantity: number;
    unitCost: number;
    movementDate: Date;
    referenceType?: string;
    referenceId?: string;
    referenceCode?: string;
    projectId?: string;
    wbsItemId?: string;
    partnerId?: string;
    description?: string;
    createdById?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const prisma = data.tx || this.prisma;
    const isIn = ['IN', 'TRANSFER_IN', 'RETURN'].includes(data.type);
    const isOut = ['OUT', 'TRANSFER_OUT'].includes(data.type);

    const existing = await prisma.stock.findUnique({
      where: { warehouseId_itemId: { warehouseId: data.warehouseId, itemId: data.itemId } },
    });

    const oldQty = Number(existing?.quantity || 0);
    const oldAvg = Number(existing?.avgCost || 0);

    let newQty: number;
    let newAvg: number;

    if (isIn) {
      newQty = oldQty + data.quantity;
      newAvg = newQty > 0
        ? ((oldQty * oldAvg) + (data.quantity * data.unitCost)) / newQty
        : data.unitCost;
    } else if (isOut) {
      newQty = oldQty - data.quantity;
      newAvg = oldAvg;
    } else {
      newQty = data.quantity;
      newAvg = oldAvg;
    }

    const newTotalValue = newQty * newAvg;

    // Upsert Stock
    if (existing) {
      await prisma.stock.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          avgCost: newAvg,
          totalValue: newTotalValue,
        },
      });
    } else {
      await prisma.stock.create({
        data: {
          warehouseId: data.warehouseId,
          itemId: data.itemId,
          quantity: newQty,
          avgCost: newAvg,
          totalValue: newTotalValue,
        },
      });
    }

    // ثبت Movement
    const totalCost = data.quantity * data.unitCost;
    await prisma.stockMovement.create({
      data: {
        warehouseId: data.warehouseId,
        itemId: data.itemId,
        type: data.type as unknown as Prisma.StockMovementUncheckedCreateInput['type'],
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost,
        balanceAfter: newQty,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        referenceCode: data.referenceCode,
        projectId: data.projectId,
        wbsItemId: data.wbsItemId,
        partnerId: data.partnerId,
        description: data.description,
        movementDate: data.movementDate,
        createdById: data.createdById,
      },
    });

    return { newQty, newAvg, newTotalValue };
  }
}
