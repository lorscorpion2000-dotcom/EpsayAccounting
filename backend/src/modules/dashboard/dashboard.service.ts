import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * KPI Cards - کارت‌های آماری اصلی
   */
  async getKpis() {
    const [
      activeProjects,
      totalUsers,
      totalPartners,
      totalItems,
      pettyCashBalance,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.project.count({ where: { status: 'IN_PROGRESS', isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.partner.count({ where: { isActive: true } }),
      this.prisma.item.count({ where: { isActive: true } }),
      this.prisma.pettyCashAccount.aggregate({
        where: { isActive: true },
        _sum: { balance: true },
      }),
      this.prisma.stock.count({
        where: {
          quantity: { gt: 0 },
          item: { isActive: true },
        },
      }),
    ]);

    // تعداد در انتظار تایید (به‌طور کامل)
    const [pcTx, pcReq, pr, po, dr, gr, ss, lr, ar, cs, ws] = await Promise.all([
      this.prisma.pettyCashTransaction.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.pettyCashRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.purchaseRequest.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      this.prisma.dailyReport.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.goodsReceipt.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.subcontractorStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.advanceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.clientStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.workerStatement.count({ where: { status: 'SUBMITTED' } }),
    ]);
    const totalPending = pcTx + pcReq + pr + po + dr + gr + ss + lr + ar + cs + ws;

    return {
      activeProjects,
      totalUsers,
      totalPartners,
      totalItems,
      pettyCashBalance: Number(pettyCashBalance._sum?.balance || 0),
      pendingApprovals: totalPending,
      lowStockItems: lowStockCount,
    };
  }

  /**
   * نمودار نقدینگی - موجودی بانک‌ها، صندوق و تنخواه
   */
  async getCashFlow() {
    const [pettyCash, bankBalances] = await Promise.all([
      this.prisma.pettyCashAccount.aggregate({
        where: { isActive: true },
        _sum: { balance: true },
      }),
      this.prisma.account.findMany({
        where: {
          isActive: true,
          isPostable: true,
          OR: [
            { code: { startsWith: '1.1.1.01' } }, // صندوق
            { code: { startsWith: '1.1.1.02' } }, // بانک
          ],
        },
        select: { id: true, code: true, name: true },
      }),
    ]);

    // محاسبه مانده هر حساب از روی ژورنال
    const accountBalances = await Promise.all(
      bankBalances.map(async (acc) => {
        const result = await this.prisma.journalLine.aggregate({
          where: {
            accountId: acc.id,
            journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
          },
          _sum: { debit: true, credit: true },
        });
        const balance = Number(result._sum?.debit || 0) - Number(result._sum?.credit || 0);
        return { code: acc.code, name: acc.name, balance };
      }),
    );

    const totalBank = accountBalances
      .filter((a) => a.code.startsWith('1.1.1.02'))
      .reduce((s, a) => s + a.balance, 0);
    const totalCash = accountBalances
      .filter((a) => a.code.startsWith('1.1.1.01'))
      .reduce((s, a) => s + a.balance, 0);

    return {
      pettyCash: Number(pettyCash._sum?.balance || 0),
      bank: totalBank,
      cash: totalCash,
      total: Number(pettyCash._sum?.balance || 0) + totalBank + totalCash,
      accounts: accountBalances,
    };
  }

  /**
   * پیشرفت پروژه‌ها - فیزیکی و مالی
   */
  async getProjectsProgress() {
    const projects = await this.prisma.project.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        contracts: { select: { baseAmount: true } },
        budgets: { select: { amount: true } },
      },
    });

    // محاسبه پیشرفت فیزیکی از WBS (میانگین وزنی)
    const projectsWithProgress = await Promise.all(
      projects.map(async (p) => {
        const wbsItems = await this.prisma.wbsItem.findMany({
          where: { projectId: p.id },
          select: { weight: true, id: true },
        });

        // آخرین snapshot به ازای هر WBS
        const snapshots = await this.prisma.wbsProgressSnapshot.findMany({
          where: { projectId: p.id },
          orderBy: { snapshotDate: 'desc' },
          select: { wbsItemId: true, progressPct: true },
        });
        const lastPct = new Map<string, number>();
        for (const s of snapshots) {
          if (!lastPct.has(s.wbsItemId)) lastPct.set(s.wbsItemId, Number(s.progressPct || 0));
        }

        // پیشرفت فیزیکی بر اساس وزن‌های WBS
        let totalWeight = 0;
        let weightedProgress = 0;
        for (const w of wbsItems) {
          const weight = Number(w.weight || 0);
          if (weight > 0) {
            totalWeight += weight;
            weightedProgress += (lastPct.get(w.id) || 0) * weight;
          }
        }
        const physicalProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;

        // پیشرفت مالی: مجموع هزینه‌های واقعی / بودجه مصوب
        const totalBudget = p.budgets.reduce((s, b) => s + Number(b.amount), 0);

        // هزینه‌های واقعی: تنخواه + حواله انبار + صورت‌وضعیت
        const [pettyExpense, warehouseValue, statementsValue] = await Promise.all([
          this.prisma.pettyCashTransaction.aggregate({
            where: {
              projectId: p.id,
              type: 'EXPENSE',
              status: 'APPROVED',
            },
            _sum: { amount: true },
          }),
          this.prisma.goodsIssue.aggregate({
            where: { projectId: p.id, status: 'POSTED' },
            _sum: { totalValue: true },
          }),
          this.prisma.subcontractorStatement.aggregate({
            where: { projectId: p.id, status: 'APPROVED' },
            _sum: { netPayable: true },
          }),
        ]);

        const totalSpent =
          Number(pettyExpense._sum?.amount || 0) +
          Number(warehouseValue._sum?.totalValue || 0) +
          Number(statementsValue._sum?.netPayable || 0);

        const financialProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          status: p.status,
          physicalProgress: Math.round(physicalProgress * 10) / 10,
          financialProgress: Math.round(financialProgress * 10) / 10,
          totalBudget,
          totalSpent,
        };
      }),
    );

    return projectsWithProgress;
  }

  /**
   * هشدارهای مدیریتی
   */
  async getAlerts() {
    const [
      overBudgetProjects,
      pendingApprovals,
      lowStock,
      recentActivities,
    ] = await Promise.all([
      // پروژه‌هایی که هزینه‌هایشان از بودجه بیشتر است
      this.prisma.project.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          budgets: { select: { amount: true } },
        },
      }),

      // آیتم‌های در انتظار تایید
      this.countPendingApprovals(),

      // اقلام زیر حد بحرانی
      this.prisma.stock.findMany({
        where: {
          item: { isActive: true, reorderPoint: { not: null } },
        },
        include: {
          item: { select: { code: true, name: true, reorderPoint: true } },
          warehouse: { select: { name: true } },
        },
      }),

      // فعالیت‌های اخیر
      this.getRecentActivities(10),
    ]);

    // فیلتر پروژه‌های انحراف بودجه
    const overBudget = [];
    for (const p of overBudgetProjects) {
      const budget = p.budgets.reduce((s, b) => s + Number(b.amount), 0);
      if (budget === 0) continue;

      const [petty, wh, st] = await Promise.all([
        this.prisma.pettyCashTransaction.aggregate({
          where: { projectId: p.id, type: 'EXPENSE', status: 'APPROVED' },
          _sum: { amount: true },
        }),
        this.prisma.goodsIssue.aggregate({
          where: { projectId: p.id, status: 'POSTED' },
          _sum: { totalValue: true },
        }),
        this.prisma.subcontractorStatement.aggregate({
          where: { projectId: p.id, status: 'APPROVED' },
          _sum: { netPayable: true },
        }),
      ]);

      const spent = Number(petty._sum?.amount || 0) + Number(wh._sum?.totalValue || 0) + Number(st._sum?.netPayable || 0);
      if (spent > budget) {
        overBudget.push({
          id: p.id,
          code: p.code,
          name: p.name,
          budget,
          spent,
          deviation: spent - budget,
          deviationPercent: Math.round(((spent - budget) / budget) * 1000) / 10,
        });
      }
    }

    // فیلتر اقلام زیر حد بحرانی
    const criticalStock = lowStock
      .filter((s) => {
        const reorder = Number(s.item.reorderPoint || 0);
        return reorder > 0 && Number(s.quantity) <= reorder;
      })
      .map((s) => ({
        itemCode: s.item.code,
        itemName: s.item.name,
        warehouse: s.warehouse.name,
        currentQty: Number(s.quantity),
        reorderPoint: Number(s.item.reorderPoint),
      }));

    return {
      overBudget,
      pendingApprovals,
      criticalStock: criticalStock.slice(0, 10),
      recentActivities,
    };
  }

  /**
   * شمارش آیتم‌های در انتظار تایید به تفکیک نوع
   */
  private async countPendingApprovals() {
    const [pcTx, pcReq, pr, po, dr, gr, ss, lr, ar, cs, ws] = await Promise.all([
      this.prisma.pettyCashTransaction.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.pettyCashRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.purchaseRequest.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      this.prisma.dailyReport.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.goodsReceipt.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.subcontractorStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.advanceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.clientStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.workerStatement.count({ where: { status: 'SUBMITTED' } }),
    ]);

    return {
      pettyCashTransactions: pcTx,
      pettyCashRequests: pcReq,
      purchaseRequests: pr,
      purchaseOrders: po,
      dailyReports: dr,
      goodsReceipts: gr,
      subcontractorStatements: ss,
      leaveRequests: lr,
      advanceRequests: ar,
      clientStatements: cs,
      workerStatements: ws,
      total: pcTx + pcReq + pr + po + dr + gr + ss + lr + ar + cs + ws,
    };
  }

  /**
   * فعالیت‌های اخیر
   */
  private async getRecentActivities(limit: number) {
    const [journals, receipts, issues, statements] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: { status: 'POSTED' },
        select: { id: true, code: true, description: true, entryDate: true, totalDebit: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.goodsReceipt.findMany({
        where: { status: 'POSTED' },
        select: { id: true, code: true, receiptDate: true, totalValue: true, warehouse: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.goodsIssue.findMany({
        where: { status: 'POSTED' },
        select: { id: true, code: true, issueDate: true, totalValue: true, project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.subcontractorStatement.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, code: true, periodEnd: true, netPayable: true, contractor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const activities = [
      ...journals.map((j) => ({
        type: 'journal',
        title: 'سند حسابداری',
        description: j.description,
        code: j.code,
        date: j.entryDate,
        amount: Number(j.totalDebit),
      })),
      ...receipts.map((r) => ({
        type: 'receipt',
        title: 'رسید انبار',
        description: `انبار: ${r.warehouse?.name || '—'}`,
        code: r.code,
        date: r.receiptDate,
        amount: Number(r.totalValue),
      })),
      ...issues.map((i) => ({
        type: 'issue',
        title: 'حواله انبار',
        description: `پروژه: ${i.project?.name || '—'}`,
        code: i.code,
        date: i.issueDate,
        amount: Number(i.totalValue),
      })),
      ...statements.map((s) => ({
        type: 'statement',
        title: 'صورت‌وضعیت',
        description: `پیمانکار: ${s.contractor?.name || '—'}`,
        code: s.code,
        date: s.periodEnd,
        amount: Number(s.netPayable),
      })),
    ];

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return activities.slice(0, limit);
  }

  /**
   * خلاصه سود و زیان
   */
  async getProfitLoss() {
    const accounts = await this.prisma.account.findMany({
      where: {
        isActive: true,
        isPostable: true,
        OR: [
          { code: { startsWith: '4' } }, // درآمدها
          { code: { startsWith: '5' } }, // هزینه‌ها
        ],
      },
      select: { id: true, code: true, name: true, nature: true },
    });

    const result = await Promise.all(
      accounts.map(async (acc) => {
        const sum = await this.prisma.journalLine.aggregate({
          where: {
            accountId: acc.id,
            journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
          },
          _sum: { debit: true, credit: true },
        });
        const debit = Number(sum._sum?.debit || 0);
        const credit = Number(sum._sum?.credit || 0);
        const balance = acc.nature === 'CREDIT' ? credit - debit : debit - credit;
        return {
          code: acc.code,
          name: acc.name,
          nature: acc.nature,
          amount: balance,
        };
      }),
    );

    const revenues = result.filter((r) => r.nature === 'CREDIT').reduce((s, r) => s + r.amount, 0);
    const expenses = result.filter((r) => r.nature === 'DEBIT').reduce((s, r) => s + r.amount, 0);

    return {
      revenues,
      expenses,
      profit: revenues - expenses,
      revenueDetails: result.filter((r) => r.nature === 'CREDIT'),
      expenseDetails: result.filter((r) => r.nature === 'DEBIT'),
    };
  }
}
