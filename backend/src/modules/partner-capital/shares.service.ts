import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateShareDto, UpdateShareDto } from './dto/share.dto';

@Injectable()
export class SharesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { projectId?: string; partnerId?: string }) {
    const where: any = { deletedAt: null };
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.partnerId) where.partnerId = query.partnerId;

    return this.prisma.projectPartnerShare.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ projectId: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.projectPartnerShare.findUnique({
      where: { id },
      include: { partner: true, project: true },
    });
    if (!s) throw new NotFoundException('سهم یافت نشد');
    return s;
  }

  /**
   * بررسی جمع درصدهای سهم در یک پروژه در تاریخ مشخص
   */
  private async validateTotalShares(projectId: string, effectiveFrom: Date, excludeId?: string) {
    const shares = await this.prisma.projectPartnerShare.findMany({
      where: {
        projectId,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
        effectiveFrom: { lte: effectiveFrom },
      },
    });
    const total = shares.reduce((s, sh) => s + Number(sh.sharePercent), 0);
    return total;
  }

  async create(dto: CreateShareDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const currentTotal = await this.validateTotalShares(dto.projectId, effectiveFrom);

    if (currentTotal + Number(dto.sharePercent) > 100) {
      throw new BadRequestException(
        `جمع سهم‌ها از ۱۰۰٪ بیشتر می‌شود. جمع فعلی: ${currentTotal.toFixed(2)}٪ + ${dto.sharePercent}٪`,
      );
    }

    return this.prisma.projectPartnerShare.create({
      data: {
        projectId: dto.projectId,
        partnerId: dto.partnerId,
        sharePercent: dto.sharePercent,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
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
        notes: dto.notes,
      },
    });
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.projectPartnerShare.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.projectPartnerShare.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('سهم یافت نشد');
    if (!existing.deletedAt) throw new Error('سهم حذف نشده است');
    await this.prisma.projectPartnerShare.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.projectPartnerShare.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('سهم یافت نشد');
    await this.prisma.projectPartnerShare.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.projectPartnerShare.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.projectPartnerShare.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }
}
