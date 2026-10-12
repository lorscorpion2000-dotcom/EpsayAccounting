import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class FixedAssetsService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'fixedAsset', 'code', 'FA-' + year + '-', { pad: 4 });
  }

  private computeMonthly(cost: number, residual: number, lifeMonths: number): number {
    if (lifeMonths <= 0) throw new BadRequestException('عمر مفید باید بزرگ‌تر از صفر باشد');
    const base = Math.max(cost - residual, 0);
    return Math.round((base / lifeMonths) * 100) / 100;
  }

  async findAll(query?: { status?: string; projectId?: string; active?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.projectId = query.projectId;
    return this.prisma.fixedAsset.findMany({
      where,
      include: {
        assetAccount:        { select: { id: true, code: true, name: true } },
        depreciationAccount: { select: { id: true, code: true, name: true } },
        accumulatedDeprecAccount: { select: { id: true, code: true, name: true } },
        project:    { select: { id: true, code: true, name: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        _count:     { select: { depreciationEntries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.fixedAsset.findUnique({
      where: { id },
      include: {
        assetAccount:        { select: { id: true, code: true, name: true } },
        depreciationAccount: { select: { id: true, code: true, name: true } },
        accumulatedDeprecAccount: { select: { id: true, code: true, name: true } },
        project:    { select: { id: true, code: true, name: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        depreciationEntries: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] },
      },
    });
    if (!a) throw new NotFoundException('دارایی یافت نشد');
    return a;
  }

  async create(dto: CreateFixedAssetDto, userId?: string) {
    const cost     = Number(dto.acquisitionCost);
    const residual = Number(dto.residualValue ?? 0);
    if (cost <= 0) throw new BadRequestException('بهای تملک باید مثبت باشد');
    if (residual < 0 || residual >= cost) throw new BadRequestException('ارزش اسقاط باید کمتر از بهای تملک باشد');

    const monthly = this.computeMonthly(cost, residual, dto.usefulLifeMonths);
    const code = await this.generateCode();

    // B4.d: atomic create — fixedAsset + optional JE in one tx
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.fixedAsset.create({
        data: {
          code,
          name: dto.name,
          description: dto.description,
          acquisitionDate: new Date(dto.acquisitionDate),
          acquisitionCost: cost,
          residualValue: residual,
          usefulLifeMonths: dto.usefulLifeMonths,
          depreciationMethod: dto.depreciationMethod ?? 'STRAIGHT_LINE',
          monthlyDepreciation: monthly,
          accumulatedDepreciation: 0,
          bookValue: cost,
          status: 'ACTIVE',
          assetAccountId: dto.assetAccountId,
          depreciationAccountId: dto.depreciationAccountId,
          accumulatedDeprecAccountId: dto.accumulatedDeprecAccountId,
          projectId: dto.projectId ?? null,
          costCenterId: dto.costCenterId ?? null,
          createdById: userId ?? null,
        },
      });

      if (dto.counterAccountId) {
        const je = await this.engine.postEvent('FIXED_ASSET_ACQUISITION', {
          amount: cost,
          entryDate: new Date(dto.acquisitionDate),
          description: 'تملک دارایی ' + created.code + ' — ' + created.name,
          debitAccountId:  dto.assetAccountId,
          creditAccountId: dto.counterAccountId,
          sourceId: created.id,
          userId,
          projectId: dto.projectId ?? undefined,
        }, tx);

        return tx.fixedAsset.update({
          where: { id: created.id },
          data: { acquisitionJournalEntryId: je.id },
          include: {
            assetAccount:        { select: { id: true, code: true, name: true } },
            depreciationAccount: { select: { id: true, code: true, name: true } },
            accumulatedDeprecAccount: { select: { id: true, code: true, name: true } },
          },
        });
      }
      return created;
    }, { isolationLevel: 'Serializable' });
  }
  async update(id: string, dto: UpdateFixedAssetDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.costCenterId !== undefined) data.costCenterId = dto.costCenterId;
    if (dto.residualValue !== undefined) {
      data.residualValue = dto.residualValue;
    }
    return this.prisma.fixedAsset.update({ where: { id }, data });
  }

  async remove(id: string) {
    const a = await this.findOne(id);
    if ((a as any).depreciationEntries?.length) {
      throw new BadRequestException('دارایی دارای سابقه استهلاک است و قابل حذف نیست');
    }
    await this.prisma.fixedAsset.delete({ where: { id } });
    return { success: true };
  }

  async runMonthlyDepreciation(year: number, month: number, userId?: string) {
    if (month < 1 || month > 12) throw new BadRequestException('ماه نامعتبر');
    const assets = await this.prisma.fixedAsset.findMany({
      where: { status: 'ACTIVE' },
    });
    const results: any[] = [];

    for (const a of assets) {
      const existing = await this.prisma.depreciationEntry.findUnique({
        where: {
          fixedAssetId_periodYear_periodMonth: {
            fixedAssetId: a.id, periodYear: year, periodMonth: month,
          },
        },
      });
      if (existing) { results.push({ assetId: a.id, code: a.code, skipped: 'already' }); continue; }

      const bv       = Number(a.bookValue);
      const residual = Number(a.residualValue);
      const monthly  = Number(a.monthlyDepreciation);
      const remaining = bv - residual;
      if (remaining <= 0) { results.push({ assetId: a.id, code: a.code, skipped: 'fully' }); continue; }

      const amount   = Math.min(monthly, remaining);
      const accBefore = Number(a.accumulatedDepreciation);
      const accAfter  = accBefore + amount;
      const bvAfter   = Number(a.acquisitionCost) - accAfter;

      // تاریخ سند استهلاک = امروز (سال/ماه فقط برای برچسب دوره استفاده می‌شوند)
      const entryDate = new Date();

      const count = await this.prisma.depreciationEntry.count();
      const code  = 'DEP-' + year + '-' + String(month).padStart(2, '0') + '-' + String(count + 1).padStart(4, '0');

      const entry = await this.prisma.depreciationEntry.create({
        data: {
          code, fixedAssetId: a.id,
          periodYear: year, periodMonth: month, entryDate,
          amount, accumulatedBefore: accBefore, accumulatedAfter: accAfter, bookValueAfter: bvAfter,
          createdById: userId ?? null,
        },
      });

      try {
        const je = await this.engine.postEvent('DEPRECIATION_MONTHLY', {
          amount,
          entryDate,
          description: 'استهلاک ' + a.code + ' — ' + year + '/' + String(month).padStart(2, '0'),
          debitAccountId:  a.depreciationAccountId,
          creditAccountId: a.accumulatedDeprecAccountId,
          sourceId: entry.id,
          userId,
          projectId: a.projectId ?? undefined,
        });

        await this.prisma.depreciationEntry.update({
          where: { id: entry.id },
          data: { journalEntryId: je.id },
        });

        const newStatus = bvAfter <= residual + 0.01 ? 'FULLY_DEPRECIATED' : 'ACTIVE';
        await this.prisma.fixedAsset.update({
          where: { id: a.id },
          data: {
            accumulatedDepreciation: accAfter,
            bookValue: bvAfter,
            status: newStatus,
          },
        });

        results.push({ assetId: a.id, code: a.code, amount, jeCode: je.code, bookValueAfter: bvAfter, status: newStatus });
      } catch (e: any) {
        await this.prisma.depreciationEntry.delete({ where: { id: entry.id } }).catch(() => {});
        results.push({ assetId: a.id, code: a.code, error: e?.message ?? String(e) });
      }
    }
    return results;
  }

  /**
   * گزارش زمان‌بندی استهلاک: سابقه + پیش‌بینی
   */
  async getSchedule(id: string) {
    const a = await this.findOne(id);
    const cost     = Number(a.acquisitionCost);
    const residual = Number(a.residualValue);
    const monthly  = Number(a.monthlyDepreciation);
    const life     = a.usefulLifeMonths;

    const recorded = ((a as any).depreciationEntries ?? []).slice().sort(
      (x: any, y: any) =>
        (y.periodYear * 12 + y.periodMonth) - (x.periodYear * 12 + x.periodMonth)
    );
    const recordedCount   = recorded.length;
    const accAfterRec     = Number(a.accumulatedDepreciation);

    const projected: any[] = [];
    let acc = accAfterRec;
    const remainingMonths = Math.max(life - recordedCount, 0);
    for (let i = 0; i < remainingMonths; i++) {
      const remaining = cost - residual - acc;
      if (remaining <= 0) break;
      const amount = Math.min(monthly, remaining);
      acc += amount;
      projected.push({
        index: recordedCount + i + 1,
        amount,
        accumulated: acc,
        bookValue: cost - acc,
      });
    }

    return {
      asset: a,
      recorded,
      recordedCount,
      projected,
      summary: {
        acquisitionCost: cost,
        residualValue: residual,
        monthlyDepreciation: monthly,
        usefulLifeMonths: life,
        accumulatedRecorded: accAfterRec,
        bookValueNow: Number(a.bookValue),
        remainingMonths: projected.length,
      },
    };
  }

  /**
   * گزارش کنارگذاری: دارایی‌های DISPOSED در بازه
   */
  async getDisposals(from?: string, to?: string) {
    const where: any = { status: 'DISPOSED' };
    if (from || to) {
      where.disposalDate = {};
      if (from) where.disposalDate.gte = new Date(from);
      if (to)   where.disposalDate.lte = new Date(to);
    }
    const assets = await this.prisma.fixedAsset.findMany({
      where,
      include: {
        assetAccount:        { select: { id: true, code: true, name: true } },
        accumulatedDeprecAccount: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { disposalDate: 'desc' },
    });
    const totalProceeds = assets.reduce((s, x) => s + Number(x.disposalProceeds ?? 0), 0);
    const totalBookValue = assets.reduce((s, x) => s + Number(x.bookValue ?? 0), 0);
    return { assets, totalProceeds, totalBookValue, count: assets.length };
  }

  async dispose(id: string, dto: any, _userId?: string) {
    const a = await this.findOne(id);
    if (a.status === 'DISPOSED') throw new BadRequestException('این دارایی قبلاً کنار گذاشته شده است');
    const proceeds = Number(dto.disposalProceeds ?? 0);

    const updated = await this.prisma.fixedAsset.update({
      where: { id },
      data: {
        status: 'DISPOSED',
        disposalDate: new Date(dto.disposalDate),
        disposalProceeds: proceeds,
      },
    });

    // JE کنارگذاری — اختیاری؛ اگر حساب‌های مورد نیاز داده شده باشند
    if (dto.proceedsAccountId && dto.gainLossAccountId) {
      // debit:  proceedsAccount (وجه دریافتی)
      // debit:  accumulatedDeprecAccount (بستن استهلاک انباشته)
      // credit: assetAccount (بستن بهای تمام‌شده)
      // credit: gainLossAccount (سود)  /  یا  debit در صورت زیان
      // به دلیل محدودیت postEvent دو-طرفه، فعلاً فقط سود را post می‌کنیم و
      // در صورت زیان، amount منفی می‌شود که توسط engine رد می‌شود.
      // راه‌حل تمیزتر: دو postEvent جدا یا یک JE دستی. اینجا برای MVP skip می‌کنیم.
    }

    return updated;
  }
}