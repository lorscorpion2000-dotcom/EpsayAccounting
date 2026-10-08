import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DashboardExecutiveService {
  constructor(private prisma: PrismaService) {}

  async executive() {
    // ═══ KPI Totals ═══
    const activeProjects = await this.prisma.project.count({ where: { isActive: true, status: 'IN_PROGRESS' } });

    const contractsAgg = await this.prisma.contract.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { baseAmount: true },
      _count: true,
    });

    // YTD Revenue (accounts 4.x)
    const ytdStart = new Date(new Date().getFullYear(), 0, 1);
    const ytdRevenueAgg = await this.prisma.journalLine.aggregate({
      where: {
        account: { code: { startsWith: '4' } },
        journalEntry: { status: 'POSTED', entryDate: { gte: ytdStart } },
      },
      _sum: { debit: true, credit: true },
    });
    const ytdRevenue = Number(ytdRevenueAgg._sum.credit || 0) - Number(ytdRevenueAgg._sum.debit || 0);

    // YTD Cost (accounts 5.x)
    const ytdCostAgg = await this.prisma.journalLine.aggregate({
      where: {
        account: { code: { startsWith: '5' } },
        journalEntry: { status: 'POSTED', entryDate: { gte: ytdStart } },
      },
      _sum: { debit: true, credit: true },
    });
    const ytdCost = Number(ytdCostAgg._sum.debit || 0) - Number(ytdCostAgg._sum.credit || 0);

    // Cash + Bank balance
    const cashAccounts = await this.prisma.account.findMany({
      where: {
        code: { in: ['1.1.1.01', '1.1.1.02', '1.1.1.03'] },
      },
      select: { id: true },
    });
    const cashIds = cashAccounts.map((a) => a.id);
    let cashOnHand = 0;
    if (cashIds.length > 0) {
      const cashAgg = await this.prisma.journalLine.aggregate({
        where: {
          accountId: { in: cashIds },
          journalEntry: { status: 'POSTED' },
        },
        _sum: { debit: true, credit: true },
      });
      cashOnHand = Number(cashAgg._sum.debit || 0) - Number(cashAgg._sum.credit || 0);
    }

    // Receivables (1.1.2)
    const arAgg = await this.prisma.journalLine.aggregate({
      where: {
        account: { code: { startsWith: '1.1.2' } },
        journalEntry: { status: 'POSTED' },
      },
      _sum: { debit: true, credit: true },
    });
    const receivables = Number(arAgg._sum.debit || 0) - Number(arAgg._sum.credit || 0);

    // Payables (2.1.1)
    const apAgg = await this.prisma.journalLine.aggregate({
      where: {
        account: { code: { startsWith: '2.1.1' } },
        journalEntry: { status: 'POSTED' },
      },
      _sum: { debit: true, credit: true },
    });
    const payables = Number(apAgg._sum.credit || 0) - Number(apAgg._sum.debit || 0);

    // Pending approvals
    const pendingDailyReports = await this.prisma.dailyReport.count({ where: { status: 'SUBMITTED' } });
    const pendingPurchaseReqs  = await this.prisma.purchaseRequest.count({ where: { status: 'SUBMITTED' } });
    const pendingStatements    = await this.prisma.clientStatement.count({ where: { status: 'SUBMITTED' } });

    // ═══ Top 5 projects by contract ═══
    const projectsWithContracts = await this.prisma.project.findMany({
      where: { isActive: true },
      select: {
        id: true, code: true, name: true, status: true,
        contracts: { where: { status: 'ACTIVE' }, select: { baseAmount: true } },
      },
      take: 20,
    });
    const projectsRanked = projectsWithContracts
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        contractAmount: p.contracts.reduce((s, c) => s + Number(c.baseAmount), 0),
      }))
      .filter((p) => p.contractAmount > 0)
      .sort((a, b) => b.contractAmount - a.contractAmount)
      .slice(0, 5);

    // ═══ Monthly trend (last 6 months) ═══
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyLines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: { status: 'POSTED', entryDate: { gte: sixMonthsAgo } },
        OR: [
          { account: { code: { startsWith: '4' } } },
          { account: { code: { startsWith: '5' } } },
        ],
      },
      include: {
        account: { select: { code: true } },
        journalEntry: { select: { entryDate: true } },
      },
    });

    const monthlyMap: Record<string, { revenue: number; cost: number }> = {};
    for (const l of monthlyLines) {
      const key = l.journalEntry.entryDate.getFullYear() + '-' +
        String(l.journalEntry.entryDate.getMonth() + 1).padStart(2, '0');
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, cost: 0 };
      const isRevenue = l.account.code.startsWith('4');
      const amount = isRevenue
        ? Number(l.credit) - Number(l.debit)
        : Number(l.debit) - Number(l.credit);
      if (isRevenue) monthlyMap[key].revenue += amount;
      else monthlyMap[key].cost += amount;
    }
    const monthlyTrend = Object.keys(monthlyMap)
      .sort()
      .map((m) => ({
        month: m,
        revenue: Math.round(monthlyMap[m].revenue),
        cost: Math.round(monthlyMap[m].cost),
        profit: Math.round(monthlyMap[m].revenue - monthlyMap[m].cost),
      }));

    // ═══ Alerts ═══
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const chequeAlerts = await this.prisma.cheque.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: sevenDays, gte: now },
      },
      include: {
        partner: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const guaranteeAlerts = await this.prisma.guarantee.findMany({
      where: {
        expiryDate: { lte: thirtyDays, gte: now },
      },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    const insuranceAlerts = await this.prisma.insurance.findMany({
      where: {
        expiryDate: { lte: thirtyDays, gte: now },
      },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    // ═══ Cash Flow Forecast 30/60/90 ═══
    const cashFlowForecast = {
      d30: await this.forecastWindow(now, 30),
      d60: await this.forecastWindow(now, 60),
      d90: await this.forecastWindow(now, 90),
    };

    return {
      kpi: {
        activeProjects,
        activeContracts: contractsAgg._count,
        totalContractValue: Number(contractsAgg._sum.baseAmount || 0),
        ytdRevenue,
        ytdCost,
        ytdProfit: ytdRevenue - ytdCost,
        cashOnHand,
        receivables,
        payables,
        netWorkingCapital: cashOnHand + receivables - payables,
      },
      pendingApprovals: {
        dailyReports: pendingDailyReports,
        purchaseRequests: pendingPurchaseReqs,
        statements: pendingStatements,
        total: pendingDailyReports + pendingPurchaseReqs + pendingStatements,
      },
      projects: projectsRanked,
      monthlyTrend,
      chequeAlerts: chequeAlerts.map((c) => ({
        id: c.id, code: c.code, partner: c.partner?.name || '',
        amount: Number(c.amount), dueDate: c.dueDate, direction: c.direction,
      })),
      guaranteeAlerts: guaranteeAlerts.map((g) => ({
        id: g.id, code: g.code, title: g.title, amount: Number(g.amount), expiryDate: g.expiryDate,
      })),
      insuranceAlerts: insuranceAlerts.map((i) => ({
        id: i.id, code: i.code, title: i.title, insurer: i.insurer, expiryDate: i.expiryDate,
      })),
      cashFlowForecast,
    };
  }

  private async forecastWindow(from: Date, days: number) {
    const to = new Date(from);
    to.setDate(to.getDate() + days);

    // Cheques payable
    const chequeOut = await this.prisma.cheque.aggregate({
      where: {
        direction: 'ISSUED',
        status: 'PENDING',
        dueDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });

    // Cheques receivable
    const chequeIn = await this.prisma.cheque.aggregate({
      where: {
        direction: 'RECEIVED',
        status: 'PENDING',
        dueDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });

    return {
      days,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      inflow: Number(chequeIn._sum.amount || 0),
      outflow: Number(chequeOut._sum.amount || 0),
      net: Number(chequeIn._sum.amount || 0) - Number(chequeOut._sum.amount || 0),
    };
  }
}
