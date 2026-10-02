import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CapitalAccountsService } from './accounts.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    private accounts: CapitalAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.partnerCapitalContribution.count();
    return 'CON-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;

    return this.prisma.partnerCapitalContribution.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.partnerCapitalContribution.findUnique({
      where: { id },
      include: { partner: true, account: true },
    });
    if (!c) throw new NotFoundException('آورده یافت نشد');
    return c;
  }

  async create(dto: CreateContributionDto, userId: string) {
    const code = await this.generateCode();

    return this.prisma.partnerCapitalContribution.create({
      data: {
        code,
        accountId: dto.accountId,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        type: dto.type as any,
        category: dto.category as any,
        amount: dto.amount,
        contributionDate: new Date(dto.contributionDate),
        description: dto.description,
        valuationNotes: dto.valuationNotes,
        referenceCode: dto.referenceCode,
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateContributionDto) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: {
        type: dto.type as any,
        category: dto.category as any,
        amount: dto.amount,
        contributionDate: new Date(dto.contributionDate),
        description: dto.description,
        valuationNotes: dto.valuationNotes,
        referenceCode: dto.referenceCode,
      },
    });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.partnerCapitalContribution.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  /**
   * تایید آورده - موجودی حساب افزایش می‌یابد
   */
  async approve(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    return this.prisma.$transaction(async (tx) => {
      await tx.partnerCapitalAccount.update({
        where: { id: c.accountId },
        data: { balance: { increment: c.amount } },
      });

      return tx.partnerCapitalContribution.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
    });
  }

  async reject(id: string, reason: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { status: 'CANCELLED', rejectedReason: reason },
    });
  }
}
