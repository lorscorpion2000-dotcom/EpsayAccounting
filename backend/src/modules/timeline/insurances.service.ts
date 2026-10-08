import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto';

@Injectable()
export class InsurancesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.insurance.count();
    return 'INS-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { policyNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.insurance.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const i = await this.prisma.insurance.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!i) throw new NotFoundException('بیمه‌نامه یافت نشد');
    return i;
  }

  async create(dto: CreateInsuranceDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.insurance.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        insurer: dto.insurer,
        policyNumber: dto.policyNumber,
        coverageAmount: dto.coverageAmount,
        premiumAmount: dto.premiumAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    await this.findOne(id);
    return this.prisma.insurance.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        insurer: dto.insurer,
        policyNumber: dto.policyNumber,
        coverageAmount: dto.coverageAmount,
        premiumAmount: dto.premiumAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    await this.findOne(id);
    // مستقیم پاک کن (این موجودیت‌ها معمولاً ارجاعی ندارند)
    await this.prisma.insurance.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.insurance.findMany({
      where: { expiryDate: { gte: now, lte: future } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
