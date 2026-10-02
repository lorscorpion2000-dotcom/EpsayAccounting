import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    return this.prisma.projectBudget.findMany({
      where: projectId ? { projectId } : undefined,
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
    const data: any = { ...dto };
    if (dto.approvedAt) data.approvedAt = new Date(dto.approvedAt);
    return this.prisma.projectBudget.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.projectBudget.delete({ where: { id } });
    return { success: true };
  }
}
