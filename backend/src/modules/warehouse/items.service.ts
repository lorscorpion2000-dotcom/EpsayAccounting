import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.item.count();
    return 'ITM-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  private async resolveUnitId(code?: string | null): Promise<string | null> {
    if (!code) return null;
    const u = await this.prisma.unit.findFirst({
      where: {
        OR: [
          { code },
          { name: code },
          { symbol: code },
        ],
      },
      select: { id: true },
    });
    return u?.id ?? null;
  }

  async findAll(query?: { type?: string; categoryId?: string; search?: string; active?: boolean }) {
    const where: Prisma.ItemWhereInput = {};
    where.deletedAt = null;
    if (query?.type) where.type = query.type as Prisma.ItemWhereInput['type'];
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.active !== undefined) where.isActive = query.active;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.item.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        unitObj: { select: { id: true, code: true, name: true, symbol: true } },
        _count: { select: { stocks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const itemsWithStock = await Promise.all(
      items.map(async (it) => {
        const stocks = await this.prisma.stock.aggregate({
          where: { itemId: it.id },
          _sum: { quantity: true, totalValue: true },
        });
        return {
          ...it,
          totalStock: Number(stocks._sum.quantity || 0),
          totalValue: Number(stocks._sum.totalValue || 0),
        };
      }),
    );

    return itemsWithStock;
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        unitObj: { select: { id: true, code: true, name: true, symbol: true } },
        stocks: { include: { warehouse: true } },
      },
    });
    if (!item) throw new NotFoundException('کالا یافت نشد');
    return item;
  }

  async create(dto: CreateItemDto) {
    const code = await this.generateCode();
    const unitId = await this.resolveUnitId(dto.unit);
    return this.prisma.item.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as unknown as Prisma.ItemUncheckedCreateInput['type'],
        unitId,
        categoryId: dto.categoryId,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
        reorderPoint: dto.reorderPoint,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateItemDto) {
    await this.findOne(id);
    const unitId = dto.unit !== undefined ? await this.resolveUnitId(dto.unit) : undefined;
    return this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as unknown as Prisma.ItemUncheckedCreateInput['type'],
        ...(unitId !== undefined && { unitId }),
        categoryId: dto.categoryId,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
        reorderPoint: dto.reorderPoint,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { category: true },
    });
  }

  async remove(id: string, options?: { force?: boolean; userId?: string }) {
    await this.findOne(id);
    const force = options?.force === true;

    const [moves, receipts, issues, stocks, invCounts, transfers] = await Promise.all([
      this.prisma.stockMovement.count({ where: { itemId: id } }),
      this.prisma.goodsReceiptItem.count({ where: { itemId: id } }),
      this.prisma.goodsIssueItem.count({ where: { itemId: id } }),
      this.prisma.stock.count({ where: { itemId: id } }),
      this.prisma.inventoryCountItem.count({ where: { itemId: id } }),
      this.prisma.warehouseTransferItem.count({ where: { itemId: id } }),
    ]);
    const totalRefs = moves + receipts + issues + stocks + invCounts + transfers;

    if (totalRefs === 0) {
      await this.prisma.item.delete({ where: { id } });
      return { success: true, hardDeleted: true };
    }

    if (force) {
      await this.prisma.$transaction([
        this.prisma.stock.deleteMany({ where: { itemId: id } }),
        this.prisma.inventoryCountItem.deleteMany({ where: { itemId: id } }),
        this.prisma.warehouseTransferItem.deleteMany({ where: { itemId: id } }),
        this.prisma.goodsReceiptItem.deleteMany({ where: { itemId: id } }),
        this.prisma.goodsIssueItem.deleteMany({ where: { itemId: id } }),
        this.prisma.stockMovement.deleteMany({ where: { itemId: id } }),
        this.prisma.item.delete({ where: { id } }),
      ]);
      return { success: true, hardDeleted: true, refs: totalRefs };
    }

    await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: options?.userId ?? null },
    });
    return {
      success: true,
      message: 'کالا به سطل زباله منتقل شد (وابستگی: ' + totalRefs + ' مورد)',
      refs: { moves, receipts, issues, stocks, invCounts, transfers },
    };
  }
}
