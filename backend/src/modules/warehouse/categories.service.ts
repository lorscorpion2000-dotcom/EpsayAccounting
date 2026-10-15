import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const count = await this.prisma.itemCategory.count();
    return 'CAT-' + String(count + 1).padStart(4, '0');
  }

  async findAll() {
    return this.prisma.itemCategory.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { items: true, children: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findTree() {
    const cats = await this.prisma.itemCategory.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { items: true } } },
    });
    const map = new Map<string, any>();
    cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    map.forEach((c) => {
      if (c.parentId) {
        const p = map.get(c.parentId);
        if (p) p.children.push(c);
      } else roots.push(c);
    });
    return roots;
  }

  async findOne(id: string) {
    const cat = await this.prisma.itemCategory.findFirst({
      where: { id, deletedAt: null },
      include: { parent: true, children: true },
    });
    if (!cat) throw new NotFoundException('دسته یافت نشد');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const code = await this.generateCode();
    return this.prisma.itemCategory.create({
      data: {
        code,
        name: dto.name,
        type: (dto.type as any) || 'MATERIAL',
        parentId: dto.parentId,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.itemCategory.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        parentId: dto.parentId,
        description: dto.description,
      },
    });
  }

  async remove(id: string, options?: { force?: boolean; userId?: string }) {
    const cat = await this.findOne(id);
    const force = options?.force === true;

    if (!force) {
      if (cat.children.length > 0) throw new BadRequestException('ابتدا زیردسته‌ها را حذف کنید');
      const itemsCount = await this.prisma.item.count({ where: { categoryId: id } });
      if (itemsCount > 0) throw new BadRequestException('این دسته دارای کالا است');
      await this.prisma.itemCategory.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: options?.userId ?? null },
      });
      return { success: true, softDeleted: true };
    }

    const items = await this.prisma.item.count({ where: { categoryId: id } });
    const children = await this.prisma.itemCategory.count({ where: { parentId: id } });
    if (items > 0 || children > 0) {
      const parts: string[] = [];
      if (children > 0) parts.push('زیردسته: ' + children);
      if (items > 0) parts.push('کالا: ' + items);
      throw new BadRequestException({
        code: 'CATEGORY_HAS_REFS',
        message: 'این دسته در موارد زیر استفاده شده است.\n  - ' + parts.join('\n  - '),
        refs: { children, items }, total: children + items,
      });
    }
    await this.prisma.itemCategory.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }
}
