import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.project.count();
    return 'PRJ-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  /**
   * دریافت لیست پروژه‌ها همراه با اعمال محدودیت دسترسی کاربر (Project RBAC)
   */
  async findAll(query?: { status?: string; search?: string }, userId?: string) {
    const where: any = { isActive: true };
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // بررسی دسترسی پروژه‌ای کاربر در صورتی که کاربر super_admin نباشد
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      const isSuperAdmin = user?.roles.some((ur: any) => ur.role.code === 'super_admin');

      if (!isSuperAdmin) {
        const assignedProjects = await this.prisma.userProject.findMany({
          where: { userId },
          select: { projectId: true },
        });
        const allowedIds = assignedProjects.map((p) => p.projectId);
        where.id = { in: allowedIds };
      }
    }

    return this.prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        consultant: { select: { id: true, name: true } },
        _count: { select: { contracts: true, wbsItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        consultant: true,
        contracts: { orderBy: { createdAt: 'desc' } },
        _count: { select: { wbsItems: true, budgets: true } },
      },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    // چک دسترسی پروژه‌ای
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      const isSuperAdmin = user?.roles.some((ur: any) => ur.role.code === 'super_admin');
      if (!isSuperAdmin) {
        const hasAccess = await this.prisma.userProject.findFirst({
          where: { userId, projectId: id },
        });
        if (!hasAccess) {
          throw new BadRequestException('شما دسترسی به این پروژه را ندارید');
        }
      }
    }

    return project;
  }

  async create(dto: CreateProjectDto) {
    const code = await this.generateCode();
    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as any,
        status: dto.status as any,
        usage: dto.usage as any,
        clientId: dto.clientId,
        consultantId: dto.consultantId,
        purchasingOfficerId: dto.purchasingOfficerId || null,
        addressProvince: dto.addressProvince,
        addressCity: dto.addressCity,
        addressFull: dto.addressFull,
        totalArea: dto.totalArea,
        floorsCount: dto.floorsCount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { client: true, consultant: true },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.usage !== undefined) data.usage = dto.usage;
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.consultantId !== undefined) data.consultantId = dto.consultantId;
    if (dto.purchasingOfficerId !== undefined) data.purchasingOfficerId = dto.purchasingOfficerId;
    if (dto.addressProvince !== undefined) data.addressProvince = dto.addressProvince;
    if (dto.addressCity !== undefined) data.addressCity = dto.addressCity;
    if (dto.addressFull !== undefined) data.addressFull = dto.addressFull;
    if (dto.totalArea !== undefined) data.totalArea = dto.totalArea;
    if (dto.floorsCount !== undefined) data.floorsCount = dto.floorsCount;
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.plannedEndDate !== undefined) data.plannedEndDate = dto.plannedEndDate ? new Date(dto.plannedEndDate) : null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.project.update({
      where: { id },
      data,
      include: { client: true, consultant: true },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    await this.findOne(id);
    const force = options?.force === true;

    if (!force) {
      await this.prisma.project.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, softDeleted: true };
    }

    const refs = await this.countReferences(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'PROJECT_HAS_REFS',
        message: 'پروژه در ' + total + ' مورد دیگر استفاده شده است:\n' + details,
        refs, total,
      });
    }

    await this.prisma.project.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  private async countReferences(id: string) {
    const p = this.prisma;
    const [contracts, wbsItems, budgets] = await Promise.all([
      p.contract.count({ where: { projectId: id } }),
      p.wbsItem.count({ where: { projectId: id } }),
      p.projectBudget.count({ where: { projectId: id } }),
    ]);
    return { contracts, wbsItems, budgets };
  }
}