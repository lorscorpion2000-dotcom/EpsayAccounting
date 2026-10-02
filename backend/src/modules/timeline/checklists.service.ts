import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateChecklistDto, UpdateChecklistDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.phaseChecklist.count();
    return 'CHK-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.phaseChecklist.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.phaseChecklist.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!c) throw new NotFoundException('چک‌لیست یافت نشد');
    return c;
  }

  async create(dto: CreateChecklistDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.phaseChecklist.create({
      data: {
        code,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        type: dto.type as any,
        title: dto.title,
        checklistDate: new Date(dto.checklistDate),
        status: 'DRAFT',
        items: dto.items as any,
        inspectorName: dto.inspectorName,
        supervisorName: dto.supervisorName,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateChecklistDto) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT' && c.status !== 'REJECTED') {
      throw new BadRequestException('فقط چک‌لیست‌های پیش‌نویس یا رد‌شده قابل ویرایش هستند');
    }
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: {
        wbsItemId: dto.wbsItemId,
        type: dto.type as any,
        title: dto.title,
        checklistDate: new Date(dto.checklistDate),
        items: dto.items as any,
        inspectorName: dto.inspectorName,
        supervisorName: dto.supervisorName,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    if (c.status === 'APPROVED') {
      throw new BadRequestException('چک‌لیست تاییدشده قابل حذف نیست');
    }
    await this.prisma.phaseChecklist.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, reason: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }
}
