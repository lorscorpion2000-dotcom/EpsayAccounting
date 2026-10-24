import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreatePriceListDto, UpdatePriceListDto,
  CreatePriceListItemDto, UpdatePriceListItemDto, ImportItemsDto,
} from './dto/price-list.dto';

@Injectable()
export class PriceListService {
  constructor(private prisma: PrismaService) {}

  private async resolveUnitId(code?: string | null): Promise<string | null> {
    if (!code) return null;
    const u = await this.prisma.unit.findFirst({
      where: { OR: [{ code }, { name: code }, { symbol: code }] },
      select: { id: true },
    });
    return u?.id ?? null;
  }


  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PL-' + year + '-';
    const last = await this.prisma.priceList.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(3, '0');
  }

  // ─── Price Lists ───
  async list(query?: { year?: number; status?: string; search?: string }) {
    const where: Prisma.PriceListWhereInput = {};
    if (query?.year) where.year = query.year;
    if (query?.status) where.status = query.status as Prisma.PriceListWhereInput['status'];
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.priceList.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const pl = await this.prisma.priceList.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
      },
    });
    if (!pl) throw new NotFoundException('فهرست بها یافت نشد');
    return pl;
  }

  async create(dto: CreatePriceListDto) {
    const code = await this.nextCode();
    return this.prisma.priceList.create({
      data: {
        code,
        title: dto.title,
        year: dto.year,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        status: (dto.status as unknown as Prisma.PriceListUncheckedCreateInput['status']) || 'DRAFT',
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdatePriceListDto) {
    await this.get(id);
    const data = { ...dto } as unknown as Prisma.PriceListUncheckedUpdateInput;
    if (dto.effectiveFrom) data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    return this.prisma.priceList.update({ where: { id }, data });
  }

  async remove(id: string, userId?: string) {
    const pl = await this.get(id);
    if (pl._count.items > 0) {
      throw new BadRequestException('ابتدا ردیف‌های فهرست را حذف کنید یا از «حذف توسط مدیر» استفاده کنید');
    }
    await this.prisma.priceList.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async publish(id: string) {
    return this.prisma.priceList.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  // ─── Items ───
  async listItems(priceListId: string, query?: { search?: string; chapter?: string }) {
    const where: Prisma.PriceListItemWhereInput = { priceListId };
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.chapter) where.chapter = query.chapter;
    return this.prisma.priceListItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      take: 2000,
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.priceListItem.findUnique({
      where: { id },
      include: { priceList: true },
    });
    if (!item) throw new NotFoundException('ردیف یافت نشد');
    return item;
  }

  async createItem(priceListId: string, dto: CreatePriceListItemDto) {
    await this.get(priceListId);
    const unitId = await this.resolveUnitId(dto.unit as string | null | undefined);
    return this.prisma.priceListItem.create({
      data: {
        priceListId,
        code: dto.code,
        description: dto.description,
        unitId,
        basePrice: dto.basePrice,
        category: dto.category,
        chapter: dto.chapter,
        notes: dto.notes,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateItem(id: string, dto: UpdatePriceListItemDto) {
    await this.getItem(id);
    const data = { ...dto } as unknown as Prisma.PriceListItemUncheckedUpdateInput;
    if (dto.unit !== undefined) {
      data.unitId = await this.resolveUnitId(dto.unit as string | null | undefined);
    }
    return this.prisma.priceListItem.update({ where: { id }, data });
  }

  async removeItem(id: string) {
    await this.getItem(id);
    const wbsCount = await this.prisma.wbsItem.count({
      where: { priceListItemId: id },
    });
    if (wbsCount > 0) {
      throw new BadRequestException('این ردیف به WBS متصل است — ابتدا لینک را قطع کنید');
    }
    await this.prisma.priceListItem.delete({ where: { id } });
    return { success: true };
  }

  // ─── Bulk Import ───
  async importItems(priceListId: string, dto: ImportItemsDto) {
    const pl = await this.get(priceListId);
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('هیچ ردیفی برای ورود وجود ندارد');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let skipped = 0;
      const errors: { row: number; code: string; reason: string }[] = [];

      for (let i = 0; i < dto.items.length; i++) {
        const row = dto.items[i];
        try {
          const existing = await tx.priceListItem.findFirst({
            where: { priceListId, code: row.code },
          });
          if (existing) {
            skipped++;
            errors.push({ row: i + 1, code: row.code, reason: 'کد تکراری' });
            continue;
          }

          await tx.priceListItem.create({
            data: {
              priceListId,
              code: row.code,
              description: row.description,
              basePrice: row.basePrice,
              category: row.category,
              chapter: row.chapter,
              notes: row.notes,
              sortOrder: row.sortOrder ?? i,
            },
          });
          created++;
        } catch (e) {
          errors.push({ row: i + 1, code: row.code, reason: e instanceof Error ? e.message : String(e) });
        }
      }
      return { created, skipped, errors };
    });

    return { ...result, total: dto.items.length, priceListCode: pl.code };
  }

  async clearItems(priceListId: string) {
    const pl = await this.get(priceListId);
    if (pl.status === 'PUBLISHED') {
      throw new BadRequestException('فهرست منتشرشده قابل پاک‌سازی نیست');
    }
    const inUse = await this.prisma.wbsItem.count({
      where: { priceListItem: { priceListId } },
    });
    if (inUse > 0) {
      throw new BadRequestException('برخی ردیف‌ها به WBS متصل هستند');
    }
    const result = await this.prisma.priceListItem.deleteMany({ where: { priceListId } });
    return { deleted: result.count };
  }

  // ─── WBS Linking ───
  async linkWbs(wbsItemId: string, priceListItemId: string | null) {
    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: wbsItemId } });
    if (!wbs) throw new NotFoundException('ردیف WBS یافت نشد');

    if (priceListItemId) {
      const item = await this.prisma.priceListItem.findUnique({
        where: { id: priceListItemId },
      });
      if (!item) throw new NotFoundException('ردیف فهرست بها یافت نشد');
    }

    return this.prisma.wbsItem.update({
      where: { id: wbsItemId },
      data: { priceListItemId },
      include: { priceListItem: true },
    });
  }

  async itemsForWbs(wbsItemId: string) {
    const wbs = await this.prisma.wbsItem.findUnique({
      where: { id: wbsItemId },
      include: { priceListItem: true, project: { select: { id: true, code: true, name: true } } },
    });
    if (!wbs) throw new NotFoundException('ردیف WBS یافت نشد');
    return wbs;
  }

  // ─── Stats ───
  async stats() {
    const [lists, published, items, linked] = await Promise.all([
      this.prisma.priceList.count(),
      this.prisma.priceList.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.priceListItem.count(),
      this.prisma.wbsItem.count({ where: { priceListItemId: { not: null } } }),
    ]);
    return { lists, published, items, linked };
  }

  // ─── Project WBS Mapping ───
  async projectWbsMapping(projectId: string) {
    const wbs = await this.prisma.wbsItem.findMany({
      where: { projectId },
      include: {
        priceListItem: {
          include: {
            priceList: { select: { id: true, code: true, title: true, year: true } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    return wbs;
  }
}
