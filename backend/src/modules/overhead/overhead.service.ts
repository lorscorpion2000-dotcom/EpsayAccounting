import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateOverheadDto, UpdateOverheadDto, PreviewDto } from './dto/overhead.dto';
import { FiscalYearsService } from '../accounting/fiscal-years.service';

@Injectable()
export class OverheadService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
  ) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'OVH-' + year + '-';
    const last = await this.prisma.overheadAllocation.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(3, '0');
  }

  async list(query?: { fiscalYearId?: string; status?: string }) {
    const where: any = {};
    if (query?.fiscalYearId) where.fiscalYearId = query.fiscalYearId;
    if (query?.status) where.status = query.status;
    where.deletedAt = null;
    return this.prisma.overheadAllocation.findMany({
      where,
      include: {
        fiscalYear: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { periodMonth: 'desc' },
    });
  }

  async get(id: string) {
    const a = await this.prisma.overheadAllocation.findUnique({
      where: { id },
      include: {
        fiscalYear: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
        items: {
          include: { project: { select: { id: true, code: true, name: true } } },
        },
      },
    });
    if (!a) throw new NotFoundException('تسهیم یافت نشد');
    return a;
  }

  async remove(id: string, userId?: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') {
      throw new BadRequestException('تسهیم ثبت‌شده قابل حذف نیست');
    }
    await this.prisma.overheadAllocation.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async preview(dto: PreviewDto) {
    const projects = await this.prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, status: true },
    });
    if (projects.length === 0) {
      throw new BadRequestException('هیچ پروژه فعالی وجود ندارد');
    }

    const projectIds = projects.map(p => p.id);
    const weights: Record<string, number> = {};
    const details: Record<string, any> = {};

    if (dto.method === 'PERCENT_CONTRACT') {
      const contracts = await this.prisma.contract.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'ACTIVE' },
        _sum: { baseAmount: true },
      });
      const total = contracts.reduce((s, c) => s + Number(c._sum.baseAmount || 0), 0);
      if (total <= 0) throw new BadRequestException('هیچ قرارداد فعالی برای پروژه‌ها ثبت نشده');
      for (const c of contracts) {
        weights[c.projectId] = (Number(c._sum.baseAmount || 0) / total) * 100;
        details[c.projectId] = { contractAmount: Number(c._sum.baseAmount || 0) };
      }
    } else if (dto.method === 'PERCENT_REVENUE') {
      // Sum credit amounts of income accounts (4.x) per project from posted entries
      const lines = await this.prisma.journalLine.findMany({
        where: {
          projectId: { in: projectIds },
          account: { code: { startsWith: '4' } },
          journalEntry: { status: 'POSTED' },
        },
        include: { account: { select: { code: true } } },
      });
      const sums: Record<string, number> = {};
      for (const l of lines) {
        if (!l.projectId) continue;
        sums[l.projectId] = (sums[l.projectId] || 0) + Number(l.credit) - Number(l.debit);
      }
      const total = Object.values(sums).reduce((s, v) => s + v, 0);
      if (total <= 0) throw new BadRequestException('هیچ درآمدی برای پروژه‌ها ثبت نشده');
      for (const [pid, amt] of Object.entries(sums)) {
        weights[pid] = (amt / total) * 100;
        details[pid] = { revenueAmount: amt };
      }
    } else {
      // MANUAL — empty preview with equal distribution as placeholder
      for (const p of projects) {
        weights[p.id] = 100 / projects.length;
      }
    }

    const items = projects
      .filter(p => weights[p.id] !== undefined && weights[p.id] > 0)
      .map(p => ({
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        percent: Number(weights[p.id].toFixed(4)),
        amount: Math.round((dto.totalAmount * weights[p.id]) / 100),
        ...details[p.id],
      }));

    // Adjust rounding to match total exactly
    const sumAmount = items.reduce((s, it) => s + it.amount, 0);
    const diff = dto.totalAmount - sumAmount;
    if (items.length > 0 && diff !== 0) {
      items[0].amount += diff;
    }

    return { items, totalAmount: dto.totalAmount, method: dto.method };
  }

  async create(dto: CreateOverheadDto) {
    const existing = await this.prisma.overheadAllocation.findFirst({
      where: { fiscalYearId: dto.fiscalYearId, periodMonth: dto.periodMonth },
    });
    if (existing) throw new BadRequestException('برای این ماه تسهیم ثبت شده است');

    const items = dto.items && dto.items.length > 0
      ? dto.items
      : (await this.preview(dto as PreviewDto)).items;

    const sumPercent = items.reduce((s, it) => s + Number(it.percent), 0);
    if (Math.abs(sumPercent - 100) > 0.05) {
      throw new BadRequestException('جمع درصدها باید ۱۰۰ باشد (فعلی: ' + sumPercent.toFixed(2) + ')');
    }

    const code = await this.nextCode();
    const enriched = items.map((it) => ({
      projectId: it.projectId,
      percent: it.percent,
      amount: Math.round((dto.totalAmount * Number(it.percent)) / 100),
      notes: (it as any).notes,
    }));

    const sumAmount = enriched.reduce((s, it) => s + it.amount, 0);
    const diff = dto.totalAmount - sumAmount;
    if (enriched.length > 0 && diff !== 0) enriched[0].amount += diff;

    return this.prisma.overheadAllocation.create({
      data: {
        code,
        fiscalYearId: dto.fiscalYearId,
        periodMonth: dto.periodMonth,
        method: dto.method as any,
        totalAmount: dto.totalAmount,
        sourceAccountId: dto.sourceAccountId,
        destAccountId: dto.destAccountId,
        description: dto.description,
        status: 'DRAFT',
        items: { create: enriched as any },
      },
      include: {
        items: {
          include: { project: { select: { id: true, code: true, name: true } } },
        },
        fiscalYear: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateOverheadDto) {
    const a = await this.get(id);
    if (a.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.totalAmount !== undefined) data.totalAmount = dto.totalAmount;
    if (dto.method !== undefined) data.method = dto.method;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sourceAccountId !== undefined) data.sourceAccountId = dto.sourceAccountId;
    if (dto.destAccountId !== undefined) data.destAccountId = dto.destAccountId;

    if (dto.items) {
      await this.prisma.overheadAllocationItem.deleteMany({ where: { allocationId: id } });
      const total = dto.totalAmount ?? Number(a.totalAmount);
      const enriched = dto.items.map((it) => ({
        projectId: it.projectId,
        percent: it.percent,
        amount: Math.round((total * Number(it.percent)) / 100),
        notes: (it as any).notes,
      }));
      data.items = { create: enriched };
    }

    return this.prisma.overheadAllocation.update({
      where: { id },
      data,
      include: {
        items: {
          include: { project: { select: { id: true, code: true, name: true } } },
        },
      },
    });
  }

  async post(id: string, userId?: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') throw new BadRequestException('قبلاً ثبت شده است');
    if (!a.sourceAccountId || !a.destAccountId) {
      throw new BadRequestException('حساب مبدأ و مقصد باید تعیین شود');
    }

        // Entry date = last day of period
    const [year, month] = a.periodMonth.split('-').map(Number);
    const entryDate = new Date(year, month, 0); // last day of month

    // B2.5: unified period lock
    await this.fiscalYears.assertPeriodOpen(entryDate);

    // Validate accounts
    const source = await this.prisma.account.findUnique({ where: { id: a.sourceAccountId } });
    const dest = await this.prisma.account.findUnique({ where: { id: a.destAccountId } });
    if (!source || !dest) throw new NotFoundException('حساب یافت نشد');

    const totalDebit = a.items.reduce((s, it) => s + Number(it.amount), 0);

    // Build journal lines
    const lines = [
      ...a.items.map((it) => ({
        accountId: a.destAccountId!,
        description: 'تسهیم سربار - ' + it.project.name,
        debit: Number(it.amount),
        credit: 0,
        projectId: it.projectId,
        sortOrder: 1,
      })),
      {
        accountId: a.sourceAccountId!,
        description: 'تسهیم سربار ستاد - ' + a.code,
        debit: 0,
        credit: totalDebit,
        projectId: null as any,
        sortOrder: 9999,
      },
    ];

    // Allocate entry number
    return this.prisma.$transaction(async (tx) => {
      const fyCounter = await tx.fiscalYear.update({
        where: { id: a.fiscalYearId },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyCounter.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyCounter.code + '-' + String(entryNumber).padStart(5, '0');

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode,
          entryNumber,
          entryDate,
          fiscalYearId: a.fiscalYearId,
          description: 'تسهیم سربار ستاد - ' + a.periodMonth + ' - ' + a.code,
          reference: a.code,
          status: 'POSTED',
          postedAt: new Date(),
          sourceType: 'OVERHEAD_ALLOCATION',
          sourceId: a.id,
          createdById: userId,
          totalDebit,
          totalCredit: totalDebit,
          lines: { create: lines },
        },
      });

      const updated = await tx.overheadAllocation.update({
        where: { id },
        data: {
          status: 'POSTED',
          journalEntryId: entry.id,
          postedAt: new Date(),
        },
      });

      return { ...updated, journalEntry: { id: entry.id, code: entry.code } };
    });
  }

  async cancel(id: string) {
    const a = await this.get(id);
    if (a.status === 'POSTED') {
      throw new BadRequestException('تسهیم ثبت‌شده قابل ابطال نیست - ابتدا سند را ابطال کنید');
    }
    return this.prisma.overheadAllocation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async stats(fiscalYearId?: string) {
    const where: any = {};
    if (fiscalYearId) where.fiscalYearId = fiscalYearId;
    const [total, drafts, posted, sum] = await Promise.all([
      this.prisma.overheadAllocation.count({ where }),
      this.prisma.overheadAllocation.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.overheadAllocation.count({ where: { ...where, status: 'POSTED' } }),
      this.prisma.overheadAllocation.aggregate({ where: { ...where, status: 'POSTED' }, _sum: { totalAmount: true } }),
    ]);
    return { total, drafts, posted, totalPosted: Number(sum._sum.totalAmount || 0) };
  }
}
