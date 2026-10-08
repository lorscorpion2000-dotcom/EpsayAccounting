import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { active?: string; search?: string }) {
    const where: any = {};
    if (query?.active === 'true') where.isActive = true;
    if (query?.active === 'false') where.isActive = false;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.unit.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.unit.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('واحد یافت نشد');
    return u;
  }

  async create(dto: { code: string; name: string; symbol?: string; sortOrder?: number; isActive?: boolean }) {
    const code = (dto.code || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!code) throw new BadRequestException('کد واحد الزامی است');
    if (!dto.name || !dto.name.trim()) throw new BadRequestException('نام واحد الزامی است');

    const existing = await this.prisma.unit.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('کد واحد تکراری است');

    return this.prisma.unit.create({
      data: {
        code,
        name: dto.name.trim(),
        symbol: dto.symbol?.trim() || null,
        sortOrder: dto.sortOrder ?? 100,
        isSystem: false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: { name?: string; symbol?: string; sortOrder?: number; isActive?: boolean }) {
    const unit = await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.symbol !== undefined) data.symbol = dto.symbol?.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.unit.update({ where: { id }, data });
  }

  async remove(id: string) {
    const unit = await this.findOne(id);
    if (unit.isSystem) {
      throw new BadRequestException('واحدهای سیستمی قابل حذف نیستند — فقط می‌توانید غیرفعال کنید');
    }
    await this.prisma.unit.delete({ where: { id } });
    return { ok: true };
  }

  async usageCount(id: string) {
    const unit = await this.findOne(id);
    const code = unit.code;
    const [items, prItems, poItems, piItems, wbs, priceList] = await Promise.all([
      this.prisma.item.count({ where: { unit: code } }),
      this.prisma.purchaseRequestItem.count({ where: { unit: code } }),
      this.prisma.purchaseOrderItem.count({ where: { unit: code } }),
      this.prisma.purchaseInvoiceItem.count({ where: { unit: code } }),
      this.prisma.wbsItem.count({ where: { unit: code } }),
      this.prisma.priceListItem.count({ where: { unit: code } }),
    ]);
    return {
      items, purchaseRequestItems: prItems, purchaseOrderItems: poItems,
      purchaseInvoiceItems: piItems, wbsItems: wbs, priceListItems: priceList,
      total: items + prItems + poItems + piItems + wbs + priceList,
    };
  }
}
