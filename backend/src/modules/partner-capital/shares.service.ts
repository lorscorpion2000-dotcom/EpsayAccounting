import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateShareDto, UpdateShareDto, AddPartnerWithDilutionDto } from './dto/share.dto';
import Decimal from 'decimal.js';

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    return this.prisma.projectPartnerShare.findMany({
      where: projectId ? { projectId, deletedAt: null } : { deletedAt: null },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findOne(id: string) {
    const share = await this.prisma.projectPartnerShare.findFirst({
      where: { id, deletedAt: null },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!share) throw new NotFoundException('سهم‌الشرکه مورد نظر یافت نشد.');
    return share;
  }

  async validateTotalShares(projectId: string, effectiveFrom: Date, excludeId?: string) {
    const shares = await this.prisma.projectPartnerShare.findMany({
      where: {
        projectId,
        deletedAt: null,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
        effectiveFrom: { lte: effectiveFrom },
      },
    });
    const total = shares.reduce((s: number, sh: any) => s + Number(sh.sharePercent), 0);
    return total;
  }

  async create(dto: CreateShareDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const currentTotal = await this.validateTotalShares(dto.projectId, effectiveFrom);

    if (currentTotal + Number(dto.sharePercent) > 100) {
      throw new BadRequestException(
        `جمع سهم‌ها از ۱۰۰٪ بیشتر می‌شود. جمع فعلی: ${currentTotal.toFixed(2)}٪ + ${dto.sharePercent}٪`
      );
    }

    return this.prisma.projectPartnerShare.create({
      data: {
        projectId: dto.projectId,
        partnerId: dto.partnerId,
        sharePercent: dto.sharePercent,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        usdRate: dto.usdRate ?? null,
        valuationAmountUsd: dto.valuationAmountUsd ?? null,
        valuationAmountRial: dto.valuationAmountRial ?? null,
        notes: dto.notes,
      },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateShareDto) {
    await this.findOne(id);
    return this.prisma.projectPartnerShare.update({
      where: { id },
      data: {
        sharePercent: dto.sharePercent,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        usdRate: dto.usdRate ?? null,
        valuationAmountUsd: dto.valuationAmountUsd ?? null,
        valuationAmountRial: dto.valuationAmountRial ?? null,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.projectPartnerShare.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * ثبت شریک جدید با رقیق‌سازی پویای سهم شرکای قبلی
   */
  async addPartnerWithDilution(dto: AddPartnerWithDilutionDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const previousEffectiveTo = new Date(effectiveFrom.getTime() - 1000);

    const contributionUsd = new Decimal(dto.contributionUsd);
    const usdRate = new Decimal(dto.usdRate);
    const currentValuationUsd = new Decimal(dto.currentProjectValuationUsd);

    const newValuationUsd = currentValuationUsd.plus(contributionUsd);
    if (newValuationUsd.lessThanOrEqualTo(0)) {
      throw new BadRequestException('ارزش جدید پروژه باید بزرگتر از صفر باشد.');
    }

    const newPartnerShareDecimal = contributionUsd
      .dividedBy(newValuationUsd)
      .times(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const dilutionFactor = new Decimal(1).minus(newPartnerShareDecimal.dividedBy(100));

    return this.prisma.$transaction(async (tx: any) => {
      const activeShares = await tx.projectPartnerShare.findMany({
        where: {
          projectId: dto.projectId,
          effectiveTo: null,
          deletedAt: null,
        },
      });

      if (activeShares.length > 0) {
        const currentSum = activeShares.reduce((s: Decimal, sh: any) => s.plus(new Decimal(sh.sharePercent.toString())), new Decimal(0));
        if (!currentSum.equals(100)) {
          throw new BadRequestException(`مجموع سهم‌های فعلی پروژه برابر ۱۰۰٪ نیست (جمع فعلی: ${currentSum.toString()}٪). ابتدا سهم‌های فعلی را اصلاح کنید.`);
        }

        await tx.projectPartnerShare.updateMany({
          where: {
            projectId: dto.projectId,
            effectiveTo: null,
            deletedAt: null,
          },
          data: {
            effectiveTo: previousEffectiveTo,
          },
        });
      }

      let allocatedTotal = new Decimal(0);
      const newShareRecords: any[] = [];

      for (const oldShare of activeShares) {
        const oldPercent = new Decimal(oldShare.sharePercent.toString());
        const recalculated = oldPercent
          .times(dilutionFactor)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

        allocatedTotal = allocatedTotal.plus(recalculated);
        newShareRecords.push({
          projectId: dto.projectId,
          partnerId: oldShare.partnerId,
          sharePercent: recalculated,
          effectiveFrom,
          usdRate,
          valuationAmountUsd: newValuationUsd,
          valuationAmountRial: newValuationUsd.times(usdRate),
          notes: `رقیق‌شده پس از ورود شریک جدید (تاریخ ${dto.effectiveFrom})`,
        });
      }

      newShareRecords.push({
        projectId: dto.projectId,
        partnerId: dto.partnerId,
        sharePercent: newPartnerShareDecimal,
        effectiveFrom,
        usdRate,
        valuationAmountUsd: newValuationUsd,
        valuationAmountRial: newValuationUsd.times(usdRate),
        notes: dto.notes || 'ورود اولیه با آورده ارزی',
      });

      allocatedTotal = allocatedTotal.plus(newPartnerShareDecimal);

      const remainder = new Decimal(100).minus(allocatedTotal);
      if (!remainder.isZero() && newShareRecords.length > 0) {
        newShareRecords[newShareRecords.length - 1].sharePercent = newShareRecords[newShareRecords.length - 1].sharePercent.plus(remainder);
        allocatedTotal = allocatedTotal.plus(remainder);
      }

      await tx.projectPartnerShare.createMany({
        data: newShareRecords.map((r) => ({
          projectId: r.projectId,
          partnerId: r.partnerId,
          sharePercent: r.sharePercent.toNumber(),
          effectiveFrom: r.effectiveFrom,
          usdRate: r.usdRate.toNumber(),
          valuationAmountUsd: r.valuationAmountUsd.toNumber(),
          valuationAmountRial: r.valuationAmountRial.toNumber(),
          notes: r.notes,
        })),
      });

      return {
        success: true,
        newValuationUsd: newValuationUsd.toNumber(),
        newPartnerSharePercent: newPartnerShareDecimal.toNumber(),
        totalSharesPercent: allocatedTotal.toNumber(),
      };
    });
  }
}


