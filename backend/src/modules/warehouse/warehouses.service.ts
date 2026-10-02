import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.warehouse.count();
    return 'WH-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(query?: { active?: boolean; projectId?: string }) {
    const where: any = {};
    if (query?.active !== undefined) where.isActive = query.active;
    if (query?.projectId) where.projectId = query.projectId;
    return this.prisma.warehouse.findMany({
      where,
      include: { _count: { select: { stocks: true, receipts: true, issues: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const wh = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true, receipts: true, issues: true } } },
    });
    if (!wh) throw new NotFoundException('انبار یافت نشد');
    return wh;
  }

  async create(dto: CreateWarehouseDto) {
    const code = await this.generateCode();
    return this.prisma.warehouse.create({
      data: {
        code,
        name: dto.name,
        type: (dto.type as any) || 'MAIN',
        projectId: dto.projectId,
        location: dto.location,
        managerId: dto.managerId,
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        projectId: dto.projectId,
        location: dto.location,
        managerId: dto.managerId,
        isActive: dto.isActive,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const stockCount = await this.prisma.stock.count({
      where: { warehouseId: id, quantity: { gt: 0 } },
    });
    if (stockCount > 0) throw new BadRequestException('انبار دارای موجودی است و قابل حذف نیست');
    await this.prisma.warehouse.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }
}
