import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePermitDto, UpdatePermitDto } from './dto/permit.dto';

@Injectable()
export class PermitsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.permit.count();
    return 'PRM-' + year + '-' + String(count + 1).padStart(4, '0');
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
        { number: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.permit.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.permit.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!p) throw new NotFoundException('مجوز یافت نشد');
    return p;
  }

  async create(dto: CreatePermitDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.permit.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        number: dto.number,
        authority: dto.authority,
        status: (dto.status as any) || 'PENDING',
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdatePermitDto) {
    await this.findOne(id);
    return this.prisma.permit.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        number: dto.number,
        authority: dto.authority,
        status: dto.status as any,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    await this.findOne(id);
    // مستقیم پاک کن (این موجودیت‌ها معمولاً ارجاعی ندارند)
    await this.prisma.permit.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  /**
   * مجوزهایی که تا N روز آینده منقضی می‌شوند
   */
  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.permit.findMany({
      where: {
        status: 'ISSUED',
        expiryDate: { gte: now, lte: future },
      },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
