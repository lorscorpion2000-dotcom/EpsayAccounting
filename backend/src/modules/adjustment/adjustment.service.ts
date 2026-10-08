import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CalculateAdjDto } from './dto/adjustment.dto';

@Injectable()
export class AdjustmentService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'ADJ-' + year + '-';
    const last = await this.prisma.adjustmentCalculation.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(query?: { projectId?: string; status?: string; category?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.category) where.category = query.category;
    return this.prisma.adjustmentCalculation.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const a = await this.prisma.adjustmentCalculation.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!a) throw new NotFoundException('تعدیل یافت نشد');
    return a;
  }

  async calculate(dto: CalculateAdjDto) {
    // پیدا کردن شاخص پایه (ماه اول دوره)
    const baseIdx = await this.prisma.adjustmentIndex.findFirst({
      where: { category: dto.category, isActive: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    if (!baseIdx) throw new BadRequestException('شاخص پایه برای گروه ' + dto.category + ' یافت نشد');

    // شاخص جاری
    const currentIdx = await this.prisma.adjustmentIndex.findFirst({
      where: {
        category: dto.category,
        year: dto.currentYear,
        month: dto.currentMonth,
        isActive: true,
      },
    });
    if (!currentIdx) {
      throw new BadRequestException(
        'شاخص ماه جاری (' + dto.currentYear + '-' + dto.currentMonth + ') برای گروه ' + dto.category + ' یافت نشد'
      );
    }

    const baseIndex = Number(baseIdx.indexValue);
    const currentIndex = Number(currentIdx.indexValue);
    if (baseIndex <= 0) throw new BadRequestException('شاخص پایه باید بزرگتر از صفر باشد');

    const coefficient = currentIndex / baseIndex;
    const adjustedAmount = dto.baseAmount * coefficient;

    const code = await this.nextCode();
    return this.prisma.adjustmentCalculation.create({
      data: {
        code,
        projectId: dto.projectId,
        contractId: dto.contractId,
        statementId: dto.statementId,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        category: dto.category,
        baseAmount: dto.baseAmount,
        baseIndex,
        currentIndex,
        coefficient,
        adjustedAmount,
        status: 'DRAFT',
        notes: dto.notes,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async confirm(id: string) {
    await this.get(id);
    return this.prisma.adjustmentCalculation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancel(id: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل لغو نیست');
    return this.prisma.adjustmentCalculation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async remove(id: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل حذف نیست');
    await this.prisma.adjustmentCalculation.delete({ where: { id } });
    return { success: true };
  }

  // ═══ Post to Journal ═══
  private async findAccount(prefix: string, label: string) {
    const acc = await this.prisma.account.findFirst({
      where: { code: { startsWith: prefix }, isPostable: true, isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!acc) throw new BadRequestException('حساب ' + label + ' یافت نشد');
    return acc;
  }

  async post(id: string, userId?: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') throw new BadRequestException('قبلاً ثبت شده است');
    if (a.journalEntryId) throw new BadRequestException('سند قبلاً صادر شده است');

    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        startDate: { lte: a.periodTo },
        endDate: { gte: a.periodTo },
        status: 'OPEN',
      },
    });
    if (!fiscalYear) throw new BadRequestException('سال مالی باز متناظر با این دوره یافت نشد');

    const monthKey = a.periodTo.getFullYear() + '-' +
      String(a.periodTo.getMonth() + 1).padStart(2, '0');
    const lockedMonths = (fiscalYear.lockedMonths as string[]) || [];
    if (lockedMonths.includes(monthKey)) {
      throw new BadRequestException('دوره ' + monthKey + ' قفل شده است');
    }

    const receivableAcc = await this.findAccount('1.1.2', 'حساب دریافتنی');
    const adjustmentRevenueAcc = await this.findAccount('4.1', 'درآمد تعدیل');

    const adjustedAmount = Number(a.adjustedAmount);
    if (adjustedAmount <= 0) throw new BadRequestException('مبلغ تعدیل باید مثبت باشد');

    return this.prisma.$transaction(async (tx) => {
      const fyUpdate = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyUpdate.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyUpdate.code + '-' + String(entryNumber).padStart(5, '0');

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode,
          entryNumber,
          entryDate: a.periodTo,
          fiscalYearId: fiscalYear.id,
          description: 'تعدیل ' + a.category + ' - ' + a.code,
          reference: a.code,
          status: 'POSTED',
          postedAt: new Date(),
          sourceType: 'ADJUSTMENT',
          sourceId: a.id,
          createdById: userId,
          totalDebit: adjustedAmount,
          totalCredit: adjustedAmount,
          lines: {
            create: [
              {
                accountId: receivableAcc.id,
                description: 'دریافتنی تعدیل ' + a.code,
                debit: adjustedAmount,
                credit: 0,
                projectId: a.projectId,
                sortOrder: 1,
              },
              {
                accountId: adjustmentRevenueAcc.id,
                description: 'درآمد تعدیل ' + a.code,
                debit: 0,
                credit: adjustedAmount,
                projectId: a.projectId,
                sortOrder: 2,
              },
            ],
          },
        },
      });

      return tx.adjustmentCalculation.update({
        where: { id },
        data: {
          status: 'POSTED',
          journalEntryId: entry.id,
        },
        include: { journalEntry: { select: { id: true, code: true } } },
      });
    });
  }


  // ═══════════════════════════════════════════════════════════
  // CRUD extras — soft delete, restore, admin delete
  // Auto-generated by patch-crud-9.mjs
  // ═══════════════════════════════════════════════════════════

  async softDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    const existing: any = await this.prisma.adjustmentCalculation.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.adjustmentCalculation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.adjustmentCalculation.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.adjustmentCalculation.update({
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
