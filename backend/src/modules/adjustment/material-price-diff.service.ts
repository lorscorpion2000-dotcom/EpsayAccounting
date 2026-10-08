import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateMPDDto } from './dto/adjustment.dto';

@Injectable()
export class MaterialPriceDiffService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'MPD-' + year + '-';
    const last = await this.prisma.materialPriceDiff.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(query?: { projectId?: string; status?: string; materialType?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.materialType) where.materialType = query.materialType;
    return this.prisma.materialPriceDiff.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const m = await this.prisma.materialPriceDiff.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!m) throw new NotFoundException('مابه‌التفاوت یافت نشد');
    return m;
  }

  async create(dto: CreateMPDDto) {
    const diffPerUnit = Number(dto.actualPrice) - Number(dto.basePrice);
    const diffAmount = diffPerUnit * Number(dto.quantity);

    const code = await this.nextCode();
    return this.prisma.materialPriceDiff.create({
      data: {
        code,
        projectId: dto.projectId,
        contractId: dto.contractId,
        statementId: dto.statementId,
        materialType: dto.materialType,
        unit: dto.unit,
        quantity: dto.quantity,
        basePrice: dto.basePrice,
        actualPrice: dto.actualPrice,
        diffAmount,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        status: 'DRAFT',
        notes: dto.notes,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async confirm(id: string) {
    await this.get(id);
    return this.prisma.materialPriceDiff.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancel(id: string) {
    const m = await this.get(id);
    if (m.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل لغو نیست');
    return this.prisma.materialPriceDiff.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async remove(id: string) {
    const m = await this.get(id);
    if (m.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل حذف نیست');
    await this.prisma.materialPriceDiff.delete({ where: { id } });
    return { success: true };
  }

  private async findAccount(prefix: string, label: string) {
    const acc = await this.prisma.account.findFirst({
      where: { code: { startsWith: prefix }, isPostable: true, isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!acc) throw new BadRequestException('حساب ' + label + ' یافت نشد');
    return acc;
  }

  async post(id: string, userId?: string) {
    const m = await this.get(id);
    if (m.status === 'POSTED') throw new BadRequestException('قبلاً ثبت شده است');
    if (m.journalEntryId) throw new BadRequestException('سند قبلاً صادر شده است');

    const diffAmount = Number(m.diffAmount);
    if (diffAmount === 0) throw new BadRequestException('مابه‌التفاوت صفر است');

    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        startDate: { lte: m.periodTo },
        endDate: { gte: m.periodTo },
        status: 'OPEN',
      },
    });
    if (!fiscalYear) throw new BadRequestException('سال مالی باز یافت نشد');

    const monthKey = m.periodTo.getFullYear() + '-' +
      String(m.periodTo.getMonth() + 1).padStart(2, '0');
    const lockedMonths = (fiscalYear.lockedMonths as string[]) || [];
    if (lockedMonths.includes(monthKey)) {
      throw new BadRequestException('دوره ' + monthKey + ' قفل شده است');
    }

    const receivableAcc = await this.findAccount('1.1.2', 'حساب دریافتنی');
    const diffRevenueAcc = await this.findAccount('4.1', 'درآمد مابه‌التفاوت');

    const abs = Math.abs(diffAmount);
    const isPositive = diffAmount > 0;

    return this.prisma.$transaction(async (tx) => {
      const fyUpdate = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyUpdate.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyUpdate.code + '-' + String(entryNumber).padStart(5, '0');

      const lines = isPositive
        ? [
            {
              accountId: receivableAcc.id,
              description: 'دریافتنی مابه‌التفاوت ' + m.code,
              debit: abs,
              credit: 0,
              projectId: m.projectId,
              sortOrder: 1,
            },
            {
              accountId: diffRevenueAcc.id,
              description: 'درآمد مابه‌التفاوت ' + m.materialType + ' - ' + m.code,
              debit: 0,
              credit: abs,
              projectId: m.projectId,
              sortOrder: 2,
            },
          ]
        : [
            {
              accountId: diffRevenueAcc.id,
              description: 'کاهش بهای مصالح ' + m.materialType + ' - ' + m.code,
              debit: abs,
              credit: 0,
              projectId: m.projectId,
              sortOrder: 1,
            },
            {
              accountId: receivableAcc.id,
              description: 'کاهش دریافتنی مابه‌التفاوت ' + m.code,
              debit: 0,
              credit: abs,
              projectId: m.projectId,
              sortOrder: 2,
            },
          ];

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode,
          entryNumber,
          entryDate: m.periodTo,
          fiscalYearId: fiscalYear.id,
          description: 'مابه‌التفاوت ' + m.materialType + ' - ' + m.code,
          reference: m.code,
          status: 'POSTED',
          postedAt: new Date(),
          sourceType: 'MATERIAL_PRICE_DIFF',
          sourceId: m.id,
          createdById: userId,
          totalDebit: abs,
          totalCredit: abs,
          lines: { create: lines },
        },
      });

      return tx.materialPriceDiff.update({
        where: { id },
        data: {
          status: 'POSTED',
          journalEntryId: entry.id,
        },
        include: { journalEntry: { select: { id: true, code: true } } },
      });
    });
  }

  async stats() {
    const [total, drafts, posted, sum] = await Promise.all([
      this.prisma.materialPriceDiff.count(),
      this.prisma.materialPriceDiff.count({ where: { status: 'DRAFT' } }),
      this.prisma.materialPriceDiff.count({ where: { status: 'POSTED' } }),
      this.prisma.materialPriceDiff.aggregate({
        where: { status: 'POSTED' },
        _sum: { diffAmount: true },
      }),
    ]);
    return { total, drafts, posted, totalDiff: Number(sum._sum.diffAmount || 0) };
  }


  // ═══════════════════════════════════════════════════════════
  // CRUD extras — soft delete, restore, admin delete
  // Auto-generated by patch-crud-9.mjs
  // ═══════════════════════════════════════════════════════════

  async softDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    const existing: any = await this.prisma.materialPriceDiff.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.materialPriceDiff.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.materialPriceDiff.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.materialPriceDiff.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    // For hard delete by admin — soft delete first then optionally purge
    // For safety we only do soft delete by default; uncomment hard delete below if needed
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }

}
