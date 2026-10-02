import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async findAll(query?: { status?: string; search?: string }) {
    const where: any = { isActive: true };
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
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

  async findOne(id: string) {
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
    return project;
  }

  async create(dto: CreateProjectDto) {
    const code = await this.generateCode();
    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        status: dto.status,
        usage: dto.usage,
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
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
      },
      include: { client: true, consultant: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
