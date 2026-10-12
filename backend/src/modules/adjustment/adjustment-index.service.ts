import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateIndexDto, UpdateIndexDto } from './dto/adjustment.dto';

@Injectable()
export class AdjustmentIndexService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'IDX-' + year + '-';
    const last = await this.prisma.adjustmentIndex.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(query?: { year?: number; category?: string; isActive?: boolean }) {
    const where: any = {};
    if (query?.year) where.year = query.year;
    if (query?.category) where.category = query.category;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    return this.prisma.adjustmentIndex.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { category: 'asc' }],
    });
  }

  async get(id: string) {
    const idx = await this.prisma.adjustmentIndex.findUnique({ where: { id } });
    if (!idx) throw new NotFoundException('شاخص یافت نشد');
    return idx;
  }

  async find(year: number, month: number, category: string) {
    return this.prisma.adjustmentIndex.findFirst({
      where: { year, month, category, isActive: true },
    });
  }

  async create(dto: CreateIndexDto) {
    const exists = await this.prisma.adjustmentIndex.findFirst({
      where: { year: dto.year, month: dto.month, category: dto.category },
    });
    if (exists) throw new BadRequestException('این شاخص برای این سال/ماه/گروه قبلاً ثبت شده است');

    const code = await this.nextCode();
    return this.prisma.adjustmentIndex.create({
      data: {
        code,
        year: dto.year,
        month: dto.month,
        category: dto.category,
        indexValue: dto.indexValue,
        baseYear: dto.baseYear,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateIndexDto) {
    await this.get(id);
    const data: any = { ...dto };
    return this.prisma.adjustmentIndex.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.adjustmentCalculation.count({
      where: { baseIndex: { not: 0 } },
    });
    // ساده: اگر جایی استفاده شده، فقط غیرفعال شود
    return this.prisma.adjustmentIndex.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async stats() {
    const [total, active, byCategory] = await Promise.all([
      this.prisma.adjustmentIndex.count(),
      this.prisma.adjustmentIndex.count({ where: { isActive: true } }),
      this.prisma.adjustmentIndex.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);
    return { total, active, byCategory };
  }
}
