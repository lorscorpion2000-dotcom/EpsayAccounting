import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCapitalAccountDto } from './dto/capital-account.dto';

@Injectable()
export class CapitalAccountsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(partnerId: string, projectId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('شریک یافت نشد');

    const count = await this.prisma.partnerCapitalAccount.count();
    const prefix = projectId ? 'PCA' : 'PCC';
    return prefix + '-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; active?: boolean }) {
    const where: any = {};
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.active !== undefined) where.isActive = query.active;

    return this.prisma.partnerCapitalAccount.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true, type: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { contributions: true, withdrawals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const acc = await this.prisma.partnerCapitalAccount.findUnique({
      where: { id },
      include: {
        partner: true,
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { contributions: true, withdrawals: true } },
      },
    });
    if (!acc) throw new NotFoundException('حساب سرمایه یافت نشد');
    return acc;
  }

  async create(dto: CreateCapitalAccountDto) {
    // چک تکراری
    const exists = await this.prisma.partnerCapitalAccount.findFirst({
      where: {
        partnerId: dto.partnerId,
        projectId: dto.projectId || null,
      },
    });
    if (exists) throw new BadRequestException('این حساب قبلاً برای این شریک/پروژه ایجاد شده است');

    const code = await this.generateCode(dto.partnerId, dto.projectId);
    return this.prisma.partnerCapitalAccount.create({
      data: {
        code,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        notes: dto.notes,
      },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const acc = await this.findOne(id);
    if (acc._count.contributions > 0 || acc._count.withdrawals > 0) {
      throw new BadRequestException('این حساب دارای گردش است و قابل حذف نیست');
    }
    await this.prisma.partnerCapitalAccount.delete({ where: { id } });
    return { success: true };
  }

  /**
   * پیدا یا ایجاد حساب برای یک شریک/پروژه
   */
  async findOrCreate(partnerId: string, projectId?: string) {
    let acc = await this.prisma.partnerCapitalAccount.findFirst({
      where: { partnerId, projectId: projectId || null },
    });
    if (!acc) {
      acc = await this.prisma.partnerCapitalAccount.create({
        data: {
          code: await this.generateCode(partnerId, projectId),
          partnerId,
          projectId: projectId || null,
        },
      });
    }
    return acc;
  }
}
