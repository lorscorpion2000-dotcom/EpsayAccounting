import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreatePriceListDto, UpdatePriceListDto,
  CreatePriceListItemDto, UpdatePriceListItemDto, ImportItemsDto,
} from './dto/price-list.dto';

@Injectable()
export class PriceListService {
  constructor(private prisma: PrismaService) {}

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

  // â”€â”€â”€ Price Lists â”€â”€â”€
  async list(query?: { year?: number; status?: string; search?: string }) {
    const where: any = {};
    if (query?.year) where.year = query.year;
    if (query?.status) where.status = query.status;
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
    if (!pl) throw new NotFoundException('ÙÙ‡Ø±Ø³Øª Ø¨Ù‡Ø§ ÛŒØ§ÙØª Ù†Ø´Ø¯');
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
        status: (dto.status as any) || 'DRAFT',
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdatePriceListDto) {
    await this.get(id);
    const data: any = { ...dto };
    if (dto.effectiveFrom) data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    return this.prisma.priceList.update({ where: { id }, data });
  }

  async remove(id: string) {
    const pl = await this.get(id);
    if (pl._count.items > 0) {
      throw new BadRequestException('Ø§Ø¨ØªØ¯Ø§ Ø±Ø¯ÛŒÙâ€ŒÙ‡Ø§ÛŒ ÙÙ‡Ø±Ø³Øª Ø±Ø§ Ø­Ø°Ù Ú©Ù†ÛŒØ¯');
    }
    await this.prisma.priceList.delete({ where: { id } });
    return { success: true };
  }

  async publish(id: string) {
    return this.prisma.priceList.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  // â”€â”€â”€ Items â”€â”€â”€
  async listItems(priceListId: string, query?: { search?: string; chapter?: string }) {
    const where: any = { priceListId };
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
    if (!item) throw new NotFoundException('Ø±Ø¯ÛŒÙ ÛŒØ§ÙØª Ù†Ø´Ø¯');
    return item;
  }

  async createItem(priceListId: string, dto: CreatePriceListItemDto) {
    await this.get(priceListId);
    return this.prisma.priceListItem.create({
      data: {
        priceListId,
        code: dto.code,
        description: dto.description,
        unit: dto.unit as any,
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
    const data: any = { ...dto };
    return this.prisma.priceListItem.update({ where: { id }, data });
  }

  async removeItem(id: string) {
    const item = await this.getItem(id);
    const wbsCount = await this.prisma.wbsItem.count({
      where: { priceListItemId: id },
    });
    if (wbsCount > 0) {
      throw new BadRequestException('Ø§ÛŒÙ† Ø±Ø¯ÛŒÙ Ø¨Ù‡ WBS Ù…ØªØµÙ„ Ø§Ø³Øª â€” Ø§Ø¨ØªØ¯Ø§ Ù„ÛŒÙ†Ú© Ø±Ø§ Ù‚Ø·Ø¹ Ú©Ù†ÛŒØ¯');
    }
    await this.prisma.priceListItem.delete({ where: { id } });
    return { success: true };
  }

  // â”€â”€â”€ Bulk Import â”€â”€â”€
  async importItems(priceListId: string, dto: ImportItemsDto) {
    const pl = await this.get(priceListId);
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Ù‡ÛŒÚ† Ø±Ø¯ÛŒÙÛŒ Ø¨Ø±Ø§ÛŒ ÙˆØ±ÙˆØ¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯');
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
            errors.push({ row: i + 1, code: row.code, reason: 'Ú©Ø¯ ØªÚ©Ø±Ø§Ø±ÛŒ' });
            continue;
          }

          await tx.priceListItem.create({
            data: {
              priceListId,
              code: row.code,
              description: row.description,
              unit: row.unit as any,
              basePrice: row.basePrice,
              category: row.category,
              chapter: row.chapter,
              notes: row.notes,
              sortOrder: row.sortOrder ?? i,
            },
          });
          created++;
        } catch (e: any) {
          errors.push({ row: i + 1, code: row.code, reason: e.message });
        }
      }
      return { created, skipped, errors };
    });

    return { ...result, total: dto.items.length, priceListCode: pl.code };
  }

  async clearItems(priceListId: string) {
    const pl = await this.get(priceListId);
    if (pl.status === 'PUBLISHED') {
      throw new BadRequestException('ÙÙ‡Ø±Ø³Øª Ù…Ù†ØªØ´Ø±Ø´Ø¯Ù‡ Ù‚Ø§Ø¨Ù„ Ù¾Ø§Ú©â€ŒØ³Ø§Ø²ÛŒ Ù†ÛŒØ³Øª');
    }
    const inUse = await this.prisma.wbsItem.count({
      where: { priceListItem: { priceListId } },
    });
    if (inUse > 0) {
      throw new BadRequestException('Ø¨Ø±Ø®ÛŒ Ø±Ø¯ÛŒÙâ€ŒÙ‡Ø§ Ø¨Ù‡ WBS Ù…ØªØµÙ„ Ù‡Ø³ØªÙ†Ø¯');
    }
    const result = await this.prisma.priceListItem.deleteMany({ where: { priceListId } });
    return { deleted: result.count };
  }

  // â”€â”€â”€ WBS Linking â”€â”€â”€
  async linkWbs(wbsItemId: string, priceListItemId: string | null) {
    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: wbsItemId } });
    if (!wbs) throw new NotFoundException('Ø±Ø¯ÛŒÙ WBS ÛŒØ§ÙØª Ù†Ø´Ø¯');

    if (priceListItemId) {
      const item = await this.prisma.priceListItem.findUnique({
        where: { id: priceListItemId },
      });
      if (!item) throw new NotFoundException('Ø±Ø¯ÛŒÙ ÙÙ‡Ø±Ø³Øª Ø¨Ù‡Ø§ ÛŒØ§ÙØª Ù†Ø´Ø¯');
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
    if (!wbs) throw new NotFoundException('Ø±Ø¯ÛŒÙ WBS ÛŒØ§ÙØª Ù†Ø´Ø¯');
    return wbs;
  }

  // â”€â”€â”€ Stats â”€â”€â”€
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