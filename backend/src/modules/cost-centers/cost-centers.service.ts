import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Injectable()
export class CostCentersService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.costCenter.count();
    return 'CC-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(query?: { projectId?: string; active?: boolean; parentId?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.active !== undefined) where.isActive = query.active;
    if (query?.parentId !== undefined) {
      where.parentId = query.parentId === 'null' ? null : query.parentId;
    }
    return this.prisma.costCenter.findMany({
      where,
      include: {
        parent: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true, journalLines: true } },
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async tree() {
    const all = await this.prisma.costCenter.findMany({
      include: {
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { journalLines: true } },
      },
      orderBy: { code: 'asc' },
    });
    const byId = new Map<string, any>();
    const roots: any[] = [];
    for (const n of all) byId.set(n.id, { ...n, children: [] });
    for (const n of all) {
      const node = byId.get(n.id)!;
      if (n.parentId && byId.has(n.parentId)) {
        byId.get(n.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findOne(id: string) {
    const cc = await this.prisma.costCenter.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { journalLines: true } },
      },
    });
    if (!cc) throw new NotFoundException('مرکز هزینه یافت نشد');
    return cc;
  }

  private async isDescendant(candidateId: string, ofId: string): Promise<boolean> {
    let current: string | null = candidateId;
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current)) return false;
      seen.add(current);
      if (current === ofId) return true;
      const node: { parentId: string | null } | null = await this.prisma.costCenter.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      if (!node) return false;
      current = node.parentId ?? null;
    }
    return false;
  }

  async create(dto: CreateCostCenterDto) {
    const code = await this.generateCode();
    if (dto.parentId) {
      const parent = await this.prisma.costCenter.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('مرکز هزینه والد یافت نشد');
    }
    if (dto.projectId) {
      const p = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!p) throw new BadRequestException('پروژه یافت نشد');
    }
    return this.prisma.costCenter.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId || null,
        projectId: dto.projectId || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCostCenterDto) {
    const existing = await this.prisma.costCenter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('مرکز هزینه یافت نشد');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) throw new BadRequestException('مرکز هزینه نمی‌تواند والد خودش باشد');
      const isDesc = await this.isDescendant(dto.parentId, id);
      if (isDesc) throw new BadRequestException('والد انتخابی نمی‌تواند زیرمجموعه‌ی این مرکز باشد');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.costCenter.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.costCenter.findUnique({
      where: { id },
      include: { _count: { select: { children: true, journalLines: true } } },
    });
    if (!existing) throw new NotFoundException('مرکز هزینه یافت نشد');
    if (existing._count.children > 0) {
      throw new BadRequestException('این مرکز هزینه دارای زیرمجموعه است و قابل حذف نیست');
    }
    if (existing._count.journalLines > 0) {
      throw new BadRequestException('این مرکز هزینه در اسناد حسابداری استفاده شده و قابل حذف نیست');
    }
    await this.prisma.costCenter.delete({ where: { id } });
    return { success: true };
  }
}