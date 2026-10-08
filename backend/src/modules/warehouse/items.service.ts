import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(query?: { type?: string; categoryId?: string; search?: string; active?: boolean }) {
    const where: any = {};
    if (query?.type) where.type = query.type;
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
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: { include: { warehouse: true } },
      },
    });
    if (!item) throw new NotFoundException('کالا یافت نشد');
    return item;
  }

  async create(dto: CreateItemDto) {
    const code = await this.generateCode();
    return this.prisma.item.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as any,
        unit: dto.unit as any,
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
    return this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        unit: dto.unit as any,
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

  async remove(id: string, options?: { force?: boolean }) {
    const item = await this.findOne(id);
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

    await this.prisma.item.update({ where: { id }, data: { isActive: false } });
    return {
      success: true,
      message: 'کالا غیرفعال شد (دارای وابستگی: ' + totalRefs + ' مورد)',
      refs: { moves, receipts, issues, stocks, invCounts, transfers },
    };
  }
}
