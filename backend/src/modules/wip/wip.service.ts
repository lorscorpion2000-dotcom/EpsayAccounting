import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class WipService {
  constructor(private prisma: PrismaService) {}

  /**
   * برای هر پروژه: هزینه واقعی، درآمد شناسایی‌شده، WIP
   */
  async projectWip(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true, status: true },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    // هزینه واقعی (حساب‌های 5.x)
    const costAgg = await this.prisma.journalLine.aggregate({
      where: {
        projectId,
        account: { code: { startsWith: '5' } },
        journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
      },
      _sum: { debit: true, credit: true },
    });
    const realCost = Number(costAgg._sum.debit || 0) - Number(costAgg._sum.credit || 0);

    // درآمد صورت‌وضعیت‌ها (حساب‌های 4.x)
    const revAgg = await this.prisma.journalLine.aggregate({
      where: {
        projectId,
        account: { code: { startsWith: '4' } },
        journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
      },
      _sum: { debit: true, credit: true },
    });
    const bookedRevenue = Number(revAgg._sum.credit || 0) - Number(revAgg._sum.debit || 0);

    // مبلغ قرارداد فعال
    const contract = await this.prisma.contract.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, baseAmount: true, coefficient: true },
    });
    const contractAmount = Number(contract?.baseAmount || 0);

    // آخرین پیشرفت هر WBS
    const wbsItems = await this.prisma.wbsItem.findMany({
      where: { projectId },
      select: { id: true, quantity: true, unitPrice: true, totalPrice: true },
    });

    const progresses = await this.prisma.dailyReportProgress.findMany({
      where: {
        report: { projectId, status: 'APPROVED' },
        wbsItemId: { not: null },
      },
      orderBy: { report: { reportDate: 'desc' } },
      select: { wbsItemId: true, progressPct: true, report: { select: { reportDate: true } } },
    });

    // آخرین progressPct هر WBS
    const lastPctByWbs: Record<string, number> = {};
    for (const p of progresses) {
      if (p.wbsItemId && !(p.wbsItemId in lastPctByWbs)) {
        lastPctByWbs[p.wbsItemId] = Number(p.progressPct);
      }
    }

    // میانگین وزنی بر اساس مبلغ WBS
    let weightedPct = 0;
    let totalWeight = 0;
    for (const w of wbsItems) {
      const pct = lastPctByWbs[w.id];
      if (pct === undefined) continue;
      const weight = Number(w.totalPrice || 0) || Number(w.unitPrice || 0) || 1;
      weightedPct += pct * weight;
      totalWeight += weight;
    }
    const progressPct = totalWeight > 0 ? weightedPct / totalWeight : 0;

    // درآمد شناسایی‌شده طبق استاندارد ۹
    const coefficient = Number(contract?.coefficient || 1);
    const recognizedRevenue = (contractAmount * coefficient * progressPct) / 100;

    // مبلغ صورت‌وضعیت‌های تاییدشده
    const stmtAgg = await this.prisma.clientStatement.aggregate({
      where: { projectId, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { netPayable: true },
    });
    const billedAmount = Number(stmtAgg._sum.netPayable || 0);

    // WIP = درآمد شناسایی‌شده - صورت‌وضعیت‌های صادرشده
    const wip = recognizedRevenue - billedAmount;

    // درصد پیشرفت مالی
    const financialPct = contractAmount > 0 ? (billedAmount / contractAmount) * 100 : 0;

    return {
      project,
      contract: contract ? { id: contract.id, code: contract.code, amount: contractAmount, coefficient } : null,
      realCost,
      bookedRevenue,
      contractAmount,
      progressPct: Math.round(progressPct * 100) / 100,
      financialPct: Math.round(financialPct * 100) / 100,
      recognizedRevenue: Math.round(recognizedRevenue),
      billedAmount: Math.round(billedAmount),
      wip: Math.round(wip),
      profit: Math.round(recognizedRevenue - realCost),
      wbsCount: wbsItems.length,
      progressCount: Object.keys(lastPctByWbs).length,
    };
  }

  /**
   * خلاصه همه پروژه‌های فعال
   */
  async overview() {
    const projects = await this.prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, status: true },
      orderBy: { code: 'asc' },
    });

    const rows = await Promise.all(projects.map((p) => this.projectWip(p.id)));

    // جمع کل
    const totals = rows.reduce(
      (acc, r) => ({
        realCost: acc.realCost + r.realCost,
        bookedRevenue: acc.bookedRevenue + r.bookedRevenue,
        recognizedRevenue: acc.recognizedRevenue + r.recognizedRevenue,
        billedAmount: acc.billedAmount + r.billedAmount,
        wip: acc.wip + r.wip,
        profit: acc.profit + r.profit,
        contractAmount: acc.contractAmount + r.contractAmount,
      }),
      { realCost: 0, bookedRevenue: 0, recognizedRevenue: 0, billedAmount: 0, wip: 0, profit: 0, contractAmount: 0 },
    );

    return { rows, totals };
  }

  /**
   * داده S-Curve — پیشرفت ماهانه
   */
  async sCurve(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true, startDate: true, plannedEndDate: true },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    // گزارش‌های روزانه تاییدشده
    const reports = await this.prisma.dailyReport.findMany({
      where: { projectId, status: 'APPROVED' },
      orderBy: { reportDate: 'asc' },
      include: {
        progresses: {
          where: { wbsItemId: { not: null } },
          select: { wbsItemId: true, progressPct: true },
        },
      },
    });

    // اسناد حسابداری روی حساب‌های 4.x
    const revenueLines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        account: { code: { startsWith: '4' } },
        journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
      },
      include: { journalEntry: { select: { entryDate: true } } },
    });

    // مبلغ قرارداد
    const contract = await this.prisma.contract.findFirst({
      where: { projectId, status: 'ACTIVE' },
      select: { baseAmount: true, coefficient: true },
    });
    const contractAmount = Number(contract?.baseAmount || 0) * Number(contract?.coefficient || 1);

    // گروه‌بندی ماهانه
    const monthlyMap: Record<string, { physical: number; financial: number }> = {};

    // پیشرفت فیزیکی: هر ماه، میانگین آخرین درصد هر WBS در آن ماه
    const lastPctByMonthWbs: Record<string, Record<string, number>> = {};
    for (const r of reports) {
      const key = r.reportDate.getFullYear() + '-' + String(r.reportDate.getMonth() + 1).padStart(2, '0');
      if (!lastPctByMonthWbs[key]) lastPctByMonthWbs[key] = {};
      for (const p of r.progresses) {
        if (p.wbsItemId) lastPctByMonthWbs[key][p.wbsItemId] = Number(p.progressPct);
      }
    }

    for (const [month, pcts] of Object.entries(lastPctByMonthWbs)) {
      const vals = Object.values(pcts);
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      if (!monthlyMap[month]) monthlyMap[month] = { physical: 0, financial: 0 };
      monthlyMap[month].physical = avg;
    }

    // پیشرفت مالی: جمع درآمد / مبلغ قرارداد
    for (const line of revenueLines) {
      const key = line.journalEntry.entryDate.getFullYear() + '-' + String(line.journalEntry.entryDate.getMonth() + 1).padStart(2, '0');
      if (!monthlyMap[key]) monthlyMap[key] = { physical: 0, financial: 0 };
      const amount = Number(line.credit) - Number(line.debit);
      monthlyMap[key].financial += amount;
    }

    // مرتب و تبدیل به آرایه
    const months = Object.keys(monthlyMap).sort();
    const points: { month: string; physicalPct: number; financialPct: number; physicalCum: number; financialCum: number }[] = [];

    let physicalCum = 0;
    let financialCum = 0;

    for (const m of months) {
      const d = monthlyMap[m];
      // physical: این ماه = pct absolute، پس cumulative = همان
      // چون progressPct absolute هست نه delta
      const pctThisMonth = d.physical;
      const finThisMonth = contractAmount > 0 ? (d.financial / contractAmount) * 100 : 0;

      physicalCum = Math.max(physicalCum, pctThisMonth);
      financialCum += finThisMonth;

      points.push({
        month: m,
        physicalPct: Math.round(pctThisMonth * 100) / 100,
        financialPct: Math.round(finThisMonth * 100) / 100,
        physicalCum: Math.round(physicalCum * 100) / 100,
        financialCum: Math.round(financialCum * 100) / 100,
      });
    }

    return {
      project,
      contractAmount,
      points,
    };
  }
}
