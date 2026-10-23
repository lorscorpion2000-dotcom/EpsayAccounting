import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryWithAccount = Prisma.ExpenseCategoryGetPayload<{
  include: { account: { select: { id: true; code: true; name: true } } };
}>;
type CategoryNode = CategoryWithAccount & { children: CategoryNode[] };

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const last = await this.prisma.expenseCategory.findFirst({
      where: { code: { startsWith: 'EC-' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let n = 1;
    if (last) {
      const num = parseInt(last.code.replace('EC-', ''), 10);
      if (!isNaN(num)) n = num + 1;
    }
    return 'EC-' + String(n).padStart(3, '0');
  }

  async findAll(includeInactive = false) {
    const where: Prisma.ExpenseCategoryWhereInput = { deletedAt: null };
    if (!includeInactive) where.isActive = true;
    return this.prisma.expenseCategory.findMany({
      where,
      include: {
        account: { select: { id: true, code: true, name: true } },
        _count: { select: { expenses: true, children: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async findTree() {
    const all = await this.prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      include: { account: { select: { id: true, code: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    const byId = new Map<string, CategoryNode>();
    all.forEach(c => byId.set(c.id, { ...c, children: [] }));
    const roots: CategoryNode[] = [];
    all.forEach(c => {
      const node = byId.get(c.id);
      if (!node) return;
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async findOne(id: string) {
    const c = await this.prisma.expenseCategory.findUnique({
      where: { id },
      include: { account: true, parent: { select: { id: true, code: true, name: true } } },
    });
    if (!c || c.deletedAt) throw new NotFoundException('دسته یافت نشد');
    return c;
  }

  async create(dto: CreateCategoryDto) {
    const code = dto.code || await this.nextCode();
    return this.prisma.expenseCategory.create({
      data: {
        code,
        name: dto.name,
        parentId: dto.parentId ?? null,
        accountId: dto.accountId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const data: Prisma.ExpenseCategoryUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.parentId !== undefined) data.parentId = dto.parentId || null;
    if (dto.accountId !== undefined) data.accountId = dto.accountId || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.expenseCategory.update({ where: { id }, data });
  }

  async remove(id: string, userId?: string) {
    const c = await this.findOne(id);
    const childCount = await this.prisma.expenseCategory.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) throw new BadRequestException('این دسته فرزند دارد');
    const expCount = await this.prisma.expense.count({ where: { categoryId: id, deletedAt: null } });
    if (expCount > 0) throw new BadRequestException('این دسته در هزینه‌های موجود استفاده شده است');
    await this.prisma.expenseCategory.update({
      where: { id: c.id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { id },
      ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
    });
    if (!existing) throw new NotFoundException('دسته یافت نشد');
    if (!existing.deletedAt) throw new Error('دسته حذف نشده است');
    await this.prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: Record<string, unknown> = {}) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { id },
      ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
    });
    if (!existing) throw new NotFoundException('دسته یافت نشد');
    const childCount = await this.prisma.expenseCategory.count({
      where: { parentId: id, deletedAt: null },
    });
    if (childCount > 0) throw new BadRequestException('این دسته فرزند دارد — ابتدا آنها را حذف کنید');
    const expCount = await this.prisma.expense.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (expCount > 0) throw new BadRequestException('این دسته در هزینه‌های موجود استفاده شده است');
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.expenseCategory.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
      }),
      this.prisma.expenseCategory.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
      }),
    ]);
    return { items, total, take, skip };
  }
}
