import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    const where: any = { deletedAt: null };
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
    const byId = new Map<string, any>();
    all.forEach(c => byId.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    all.forEach(c => {
      const node = byId.get(c.id);
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId).children.push(node);
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
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.parentId !== undefined) data.parentId = dto.parentId || null;
    if (dto.accountId !== undefined) data.accountId = dto.accountId || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.expenseCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    const childCount = await this.prisma.expenseCategory.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) throw new BadRequestException('این دسته فرزند دارد');
    const expCount = await this.prisma.expense.count({ where: { categoryId: id, deletedAt: null } });
    if (expCount > 0) throw new BadRequestException('این دسته در هزینه‌های موجود استفاده شده است');
    await this.prisma.expenseCategory.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
