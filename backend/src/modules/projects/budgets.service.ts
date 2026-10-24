import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { DeleteMeta } from '../../common/services/soft-delete.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where: Prisma.ProjectBudgetWhereInput = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    return this.prisma.projectBudget.findMany({
      where,
      include: {
        wbsItem: { select: { id: true, code: true, title: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const b = await this.prisma.projectBudget.findUnique({
      where: { id },
      include: { wbsItem: true, project: true },
    });
    if (!b) throw new NotFoundException('ردیف بودجه یافت نشد');
    return b;
  }

  async create(dto: CreateBudgetDto) {
    return this.prisma.projectBudget.create({
      data: {
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        amount: dto.amount,
        approvedAt: new Date(dto.approvedAt),
        isLocked: dto.isLocked ?? false,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateBudgetDto) {
    await this.findOne(id);
    const data = { ...dto } as unknown as Prisma.ProjectBudgetUncheckedUpdateInput;
    if (dto.approvedAt) data.approvedAt = new Date(dto.approvedAt);
    return this.prisma.projectBudget.update({ where: { id }, data });
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.projectBudget.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.projectBudget.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.ProjectBudgetFindUniqueArgs);
    if (!existing) throw new NotFoundException('ردیف بودجه یافت نشد');
    if (!existing.deletedAt) throw new Error('ردیف بودجه حذف نشده است');
    await this.prisma.projectBudget.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: DeleteMeta = {}) {
    const existing = await this.prisma.projectBudget.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.ProjectBudgetFindUniqueArgs);
    if (!existing) throw new NotFoundException('ردیف بودجه یافت نشد');
    if (existing.isLocked) {
      throw new Error('این ردیف بودجه قفل شده است — ابتدا باز کنید');
    }
    await this.prisma.projectBudget.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.projectBudget.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        __withDeleted: true,
      } as unknown as Prisma.ProjectBudgetFindManyArgs),
      this.prisma.projectBudget.count({
        where: { deletedAt: { not: null } },
        __withDeleted: true,
      } as unknown as Prisma.ProjectBudgetCountArgs),
    ]);
    return { items, total, take, skip };
  }
}
