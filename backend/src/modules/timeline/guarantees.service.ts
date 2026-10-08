import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateGuaranteeDto, UpdateGuaranteeDto } from './dto/guarantee.dto';

@Injectable()
export class GuaranteesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.guarantee.count();
    return 'GRT-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { issuer: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.guarantee.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const g = await this.prisma.guarantee.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!g) throw new NotFoundException('تضمین یافت نشد');
    return g;
  }

  async create(dto: CreateGuaranteeDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.guarantee.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        issuer: dto.issuer,
        beneficiary: dto.beneficiary,
        amount: dto.amount,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateGuaranteeDto) {
    await this.findOne(id);
    return this.prisma.guarantee.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        issuer: dto.issuer,
        beneficiary: dto.beneficiary,
        amount: dto.amount,
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
    await this.prisma.guarantee.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.guarantee.findMany({
      where: { expiryDate: { gte: now, lte: future } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
