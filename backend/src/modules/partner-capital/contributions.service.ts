import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { DeleteMeta } from '../../common/services/soft-delete.service';
import { CapitalAccountsService } from './accounts.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    _accounts: CapitalAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.partnerCapitalContribution.count();
    return 'CON-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; status?: string }) {
    const where: Prisma.PartnerCapitalContributionWhereInput = { deletedAt: null };
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status as Prisma.PartnerCapitalContributionWhereInput['status'];

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
        type: dto.type as unknown as Prisma.PartnerCapitalContributionUncheckedCreateInput['type'],
        category: dto.category as unknown as Prisma.PartnerCapitalContributionUncheckedCreateInput['category'],
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
        type: dto.type as unknown as Prisma.PartnerCapitalContributionUncheckedUpdateInput['type'],
        category: dto.category as unknown as Prisma.PartnerCapitalContributionUncheckedUpdateInput['category'],
        amount: dto.amount,
        contributionDate: new Date(dto.contributionDate),
        description: dto.description,
        valuationNotes: dto.valuationNotes,
        referenceCode: dto.referenceCode,
      },
    });
  }

  async remove(id: string, userId?: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.partnerCapitalContribution.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.PartnerCapitalContributionFindUniqueArgs);
    if (!existing) throw new NotFoundException('آورده یافت نشد');
    if (!existing.deletedAt) throw new Error('آورده حذف نشده است');
    await this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: DeleteMeta = {}) {
    const existing = await this.prisma.partnerCapitalContribution.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.PartnerCapitalContributionFindUniqueArgs);
    if (!existing) throw new NotFoundException('آورده یافت نشد');
    if (existing.status !== 'DRAFT') {
      throw new Error('فقط آورده‌های پیش‌نویس قابل حذف قطعی هستند — چون تأییدشده موجودی حساب را تغییر داده');
    }
    await this.prisma.partnerCapitalContribution.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.partnerCapitalContribution.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        __withDeleted: true,
      } as unknown as Prisma.PartnerCapitalContributionFindManyArgs),
      this.prisma.partnerCapitalContribution.count({
        where: { deletedAt: { not: null } },
        __withDeleted: true,
      } as unknown as Prisma.PartnerCapitalContributionCountArgs),
    ]);
    return { items, total, take, skip };
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
