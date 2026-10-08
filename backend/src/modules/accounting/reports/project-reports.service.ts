import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * گزارشات جامع پروژه — همه‌ی گروه‌ها در یک پاسخ
 */
@Injectable()
export class ProjectReportsService {
  constructor(private prisma: PrismaService) {}

  async getAll(projectId: string, fromISO?: string, toISO?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, code: true, name: true } },
        consultant: { select: { id: true, code: true, name: true } },
      },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const now = new Date();
    const from = fromISO ? new Date(fromISO) : new Date(now.getFullYear(), 0, 1);
    const to = toISO ? new Date(toISO) : now;

    const [
      accounting, budget, warehouse, fixedAssets,
      workerStatements, subcontractorStatements, clientStatements,
      contracts, payroll, equipment, siteOps, kpi,
      cashFlow, costByCategory, aging, progressVsCost,
    ] = await Promise.all([
      this.accountingSummary(projectId, from, to),
      this.budgetVsActual(projectId, from, to),
      this.warehouseSummary(projectId, from, to),
      this.fixedAssetsSummary(projectId),
      this.workerStatementsSummary(projectId, from, to),
      this.subcontractorStatementsSummary(projectId, from, to),
      this.clientStatementsSummary(projectId, from, to),
      this.contractsSummary(projectId),
      this.payrollSummary(projectId, from, to),
      this.equipmentSummary(projectId, from, to),
      this.siteOpsSummary(projectId, from, to),
      this.kpiSummary(projectId, from, to),
      this.cashFlowSummary(projectId, from, to),
      this.costByCategorySummary(projectId, from, to),
      this.agingSummary(projectId),
      this.progressVsCostSummary(projectId),
    ]);

    return {
      project: {
        id: project.id, code: project.code, name: project.name,
        status: project.status, type: project.type,
        client: project.client, consultant: project.consultant,
        totalArea: project.totalArea ? Number(project.totalArea) : null,
        startDate: project.startDate, plannedEndDate: project.plannedEndDate,
      },
      period: { from: from.toISOString(), to: to.toISOString() },
      accounting,
      budget,
      warehouse,
      fixedAssets,
      workerStatements,
      subcontractorStatements,
      clientStatements,
      contracts,
      payroll,
      equipment,
      siteOps,
      kpi,
      cashFlow,
      costByCategory,
      aging,
      progressVsCost,
    };
  }

  // ═══════════ حسابداری ═══════════
  private async accountingSummary(projectId: string, from: Date, to: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
      },
      include: { account: { select: { code: true, name: true, nature: true } } },
    });

    const byAccount: Record<string, any> = {};
    let totalDebit = 0, totalCredit = 0;
    const byNature: Record<string, number> = { DEBIT: 0, CREDIT: 0 };

    for (const l of lines) {
      const key = l.account.code;
      if (!byAccount[key]) {
        byAccount[key] = {
          code: l.account.code, name: l.account.name,
          debit: 0, credit: 0, balance: 0,
        };
      }
      byAccount[key].debit += Number(l.debit);
      byAccount[key].credit += Number(l.credit);
      totalDebit += Number(l.debit);
      totalCredit += Number(l.credit);
      const nat = l.account.nature === 'CREDIT' ? -1 : 1;
      byNature[l.account.nature] = (byNature[l.account.nature] || 0)
        + (Number(l.debit) - Number(l.credit)) * nat;
    }

    // سود و زیان پروژه
    const revenues = Object.values(byAccount).filter((a: any) => a.code.startsWith('4'));
    const expenses = Object.values(byAccount).filter((a: any) => a.code.startsWith('6') || a.code.startsWith('7'));
    const totalRevenue = revenues.reduce((s: number, a: any) => s + (a.credit - a.debit), 0);
    const totalExpense = expenses.reduce((s: number, a: any) => s + (a.debit - a.credit), 0);

    return {
      totalDebit, totalCredit,
      entryCount: new Set(lines.map((l) => l.journalEntryId)).size,
      accounts: Object.values(byAccount)
        .map((a: any) => ({ ...a, balance: a.debit - a.credit }))
        .sort((a: any, b: any) => Math.abs(b.balance) - Math.abs(a.balance))
        .slice(0, 50),
      profitLoss: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        profit: Math.round((totalRevenue - totalExpense) * 100) / 100,
      },
    };
  }

  // ═══════════ بودجه ═══════════
  private async budgetVsActual(projectId: string, from: Date, to: Date) {
    const budgets = await this.prisma.projectBudget.findMany({
      where: { projectId },
      include: { wbsItem: { select: { id: true, code: true, title: true, level: true } } },
    });
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
        account: { code: { startsWith: '6' } },
      },
    });
    const totalActual = lines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      variance: Math.round((totalBudget - totalActual) * 100) / 100,
      percentUsed: totalBudget > 0 ? Math.round((totalActual / totalBudget) * 10000) / 100 : 0,
      lines: budgets.map((b) => ({
        wbsCode: b.wbsItem?.code || '—',
        wbsTitle: b.wbsItem?.title || 'بودجه کل پروژه',
        amount: Number(b.amount),
      })),
    };
  }

  // ═══════════ انبار ═══════════
  private async warehouseSummary(projectId: string, from: Date, to: Date) {
    const [receipts, issues, movements] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: { projectId, receiptDate: { gte: from, lte: to } },
        include: { warehouse: { select: { name: true } } },
      }),
      this.prisma.goodsIssue.findMany({
        where: { projectId, issueDate: { gte: from, lte: to } },
        include: { warehouse: { select: { name: true } } },
      }),
      this.prisma.stockMovement.findMany({
        where: { projectId, movementDate: { gte: from, lte: to } },
        include: { item: { select: { code: true, name: true, unit: true } } },
      }),
    ]);

    const totalIn = receipts.reduce((s, r) => s + Number(r.totalValue), 0);
    const totalOut = issues.reduce((s, i) => s + Number(i.totalValue), 0);

    // خلاصه مصرف به تفکیک کالا
    const consumption: Record<string, any> = {};
    for (const m of movements) {
      if (m.type !== 'OUT' && m.type !== 'TRANSFER_OUT') continue;
      const key = m.itemId;
      if (!consumption[key]) {
        consumption[key] = {
          itemCode: m.item.code, itemName: m.item.name, unit: m.item.unit,
          quantity: 0, value: 0,
        };
      }
      consumption[key].quantity += Number(m.quantity);
      consumption[key].value += Number(m.totalCost);
    }

    return {
      receiptCount: receipts.length,
      issueCount: issues.length,
      totalIn: Math.round(totalIn * 100) / 100,
      totalOut: Math.round(totalOut * 100) / 100,
      consumption: Object.values(consumption)
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 30),
    };
  }

  // ═══════════ دارایی ثابت ═══════════
  private async fixedAssetsSummary(projectId: string) {
    const assets = await this.prisma.fixedAsset.findMany({
      where: { projectId },
    });
    const totalCost = assets.reduce((s, a) => s + Number(a.acquisitionCost), 0);
    const totalDeprec = assets.reduce((s, a) => s + Number(a.accumulatedDepreciation), 0);
    const totalBook = assets.reduce((s, a) => s + Number(a.bookValue), 0);

    return {
      count: assets.length,
      totalCost: Math.round(totalCost * 100) / 100,
      totalDeprec: Math.round(totalDeprec * 100) / 100,
      totalBookValue: Math.round(totalBook * 100) / 100,
      items: assets.slice(0, 30).map((a) => ({
        code: a.code, name: a.name,
        acquisitionCost: Number(a.acquisitionCost),
        accumulatedDepreciation: Number(a.accumulatedDepreciation),
        bookValue: Number(a.bookValue),
        status: a.status,
      })),
    };
  }

  // ═══════════ صورت‌وضعیت پرسنل ═══════════
  private async workerStatementsSummary(projectId: string, from: Date, to: Date) {
    const list = await this.prisma.workerStatement.findMany({
      where: {
        projectId,
        periodStart: { gte: from },
        periodEnd: { lte: to },
      },
      include: { partner: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totalEarnings = list.reduce((s, w) => s + Number(w.totalEarnings), 0);
    const totalNet = list.reduce((s, w) => s + Number(w.netPayable), 0);
    return {
      count: list.length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      items: list.map((w) => ({
        code: w.code, status: w.status,
        partnerName: w.partner.name, partnerCode: w.partner.code,
        periodStart: w.periodStart, periodEnd: w.periodEnd,
        totalEarnings: Number(w.totalEarnings),
        netPayable: Number(w.netPayable),
      })),
    };
  }

  // ═══════════ صورت‌وضعیت پیمانکار ═══════════
  private async subcontractorStatementsSummary(projectId: string, from: Date, to: Date) {
    const list = await this.prisma.subcontractorStatement.findMany({
      where: {
        projectId,
        periodStart: { gte: from },
        periodEnd: { lte: to },
      },
      include: { contractor: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totalAmount = list.reduce((s, x) => s + Number(x.totalAmount), 0);
    const totalNet = list.reduce((s, x) => s + Number(x.netPayable), 0);
    return {
      count: list.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      items: list.map((x) => ({
        code: x.code, status: x.status,
        contractorName: x.contractor.name, contractorCode: x.contractor.code,
        statementNumber: x.statementNumber,
        periodStart: x.periodStart, periodEnd: x.periodEnd,
        totalAmount: Number(x.totalAmount), netPayable: Number(x.netPayable),
      })),
    };
  }

  // ═══════════ صورت‌وضعیت کارفرما ═══════════
  private async clientStatementsSummary(projectId: string, from: Date, to: Date) {
    const list = await this.prisma.clientStatement.findMany({
      where: { projectId, periodStart: { gte: from }, periodEnd: { lte: to } },
      orderBy: { createdAt: 'desc' },
    });
    const total = list.reduce((s, x) => s + Number(x.netPayable), 0);
    return {
      count: list.length,
      totalNet: Math.round(total * 100) / 100,
      items: list.map((x) => ({
        code: x.code, status: x.status,
        statementNumber: x.statementNumber,
        periodStart: x.periodStart, periodEnd: x.periodEnd,
        totalBefore: Number(x.totalBeforeCoefficient),
        netPayable: Number(x.netPayable),
      })),
    };
  }

  // ═══════════ قراردادها ═══════════
  private async contractsSummary(projectId: string) {
    const [proj, legal] = await Promise.all([
      this.prisma.contract.findMany({ where: { projectId } }),
      this.prisma.legalContract.findMany({ where: { projectId } }),
    ]);
    return {
      projectContracts: {
        count: proj.length,
        totalBase: proj.reduce((s, c) => s + Number(c.baseAmount), 0),
        items: proj.map((c) => ({
          code: c.code, type: c.type, status: c.status,
          baseAmount: Number(c.baseAmount), coefficient: Number(c.coefficient),
        })),
      },
      legalContracts: {
        count: legal.length,
        total: legal.reduce((s, c) => s + Number(c.totalAmount || 0), 0),
        items: legal.map((c) => ({
          code: c.code, kind: c.kind, status: c.status, title: c.title,
          totalAmount: Number(c.totalAmount || 0),
        })),
      },
    };
  }

  // ═══════════ حقوق و دستمزد ═══════════
  private async payrollSummary(projectId: string, from: Date, to: Date) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { projectId, startDate: { gte: from }, endDate: { lte: to } },
      include: { _count: { select: { records: true } } },
    });
    return {
      periodCount: periods.length,
      totalGross: periods.reduce((s, p) => s + Number(p.totalGross), 0),
      totalNet: periods.reduce((s, p) => s + Number(p.totalNet), 0),
      items: periods.map((p) => ({
        code: p.code, title: p.title, status: p.status,
        year: p.year, month: p.month,
        totalGross: Number(p.totalGross), totalNet: Number(p.totalNet),
        recordCount: p._count.records,
      })),
    };
  }

  // ═══════════ ماشین‌آلات ═══════════
  private async equipmentSummary(projectId: string, from: Date, to: Date) {
    const logs = await this.prisma.equipmentDailyLog.findMany({
      where: { projectId, logDate: { gte: from, lte: to } },
      include: { equipment: { select: { code: true, name: true, ownership: true } } },
    });
    const totalCost = logs.reduce((s, l) => s + Number(l.computedCost), 0);
    const totalHours = logs.reduce((s, l) => s + Number(l.workHours), 0);
    return {
      logCount: logs.length,
      totalHours: Math.round(totalHours * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      items: logs.slice(0, 30).map((l) => ({
        equipmentCode: l.equipment.code, equipmentName: l.equipment.name,
        logDate: l.logDate, workHours: Number(l.workHours),
        fuelLiters: Number(l.fuelLiters), computedCost: Number(l.computedCost),
      })),
    };
  }

  // ═══════════ کارگاه ═══════════
  private async siteOpsSummary(projectId: string, from: Date, to: Date) {
    const reports = await this.prisma.dailyReport.findMany({
      where: { projectId, reportDate: { gte: from, lte: to } },
      orderBy: { reportDate: 'desc' },
      take: 60,
    });
    return {
      reportCount: reports.length,
      items: reports.map((r) => ({
        code: r.code, reportDate: r.reportDate, status: r.status,
        weather: r.weather,
      })),
    };
  }

  // ═══════════ KPI ═══════════
  private async kpiSummary(projectId: string, from: Date, to: Date) {
    const [budgets, journalLines, workerStmts, subStmts] = await Promise.all([
      this.prisma.projectBudget.findMany({ where: { projectId } }),
      this.prisma.journalLine.findMany({
        where: {
          projectId,
          journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
        },
        include: { account: { select: { code: true, nature: true } } },
      }),
      this.prisma.workerStatement.findMany({ where: { projectId } }),
      this.prisma.subcontractorStatement.findMany({ where: { projectId } }),
    ]);

    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const totalExpense = journalLines
      .filter((l) => l.account.code.startsWith('6'))
      .reduce((s, l) => s + (Number(l.debit) - Number(l.credit)), 0);
    const totalRevenue = journalLines
      .filter((l) => l.account.code.startsWith('4'))
      .reduce((s, l) => s + (Number(l.credit) - Number(l.debit)), 0);
    const costOfLabor = workerStmts.reduce((s, w) => s + Number(w.totalEarnings), 0)
      + subStmts.reduce((s, x) => s + Number(x.totalAmount), 0);

    const percentUsed = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100,
      costOfLabor: Math.round(costOfLabor * 100) / 100,
      laborRatio: totalExpense > 0 ? Math.round((costOfLabor / totalExpense) * 10000) / 100 : 0,
    };
  }
  // ═══════════ جریان نقدی ═══════════
  private async cashFlowSummary(projectId: string, from: Date, to: Date) {
    // دریافت‌ها: خطوط بدهکار حساب‌های بانک/صندوق در پروژه
    const lines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
      },
      include: { account: { select: { code: true, name: true } } },
    });

    // حساب‌های بانک و صندوق معمولاً با 1.1 شروع می‌شن
    const cashCodes = (code: string) => code.startsWith('1.1.') || code === '1.1';

    let inflow = 0, outflow = 0;
    for (const l of lines) {
      if (!cashCodes(l.account.code)) continue;
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      if (debit > credit) inflow += debit - credit;
      else outflow += credit - debit;
    }

    // ریز ماهانه
    const byMonth: Record<string, { in: number; out: number }> = {};
    for (const l of lines) {
      if (!cashCodes(l.account.code)) continue;
      const d = new Date((l as any).journalEntry?.entryDate || new Date());
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!byMonth[key]) byMonth[key] = { in: 0, out: 0 };
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      if (debit > credit) byMonth[key].in += debit - credit;
      else byMonth[key].out += credit - debit;
    }

    return {
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      netCashFlow: Math.round((inflow - outflow) * 100) / 100,
      byMonth: Object.entries(byMonth)
        .map(([month, v]) => ({ month, in: Math.round(v.in * 100) / 100, out: Math.round(v.out * 100) / 100, net: Math.round((v.in - v.out) * 100) / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  // ═══════════ هزینه به تفکیک دسته ═══════════
  private async costByCategorySummary(projectId: string, from: Date, to: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
      },
      include: { account: { select: { code: true, name: true } } },
    });

    // دسته‌بندی بر اساس پیشوند کد حساب
    const categories: Record<string, { code: string; name: string; amount: number }> = {};
    const map: Record<string, { code: string; name: string }> = {
      '6.1': { code: '6.1', name: 'حقوق و دستمزد مستقیم' },
      '6.2': { code: '6.2', name: 'مصالح مصرفی' },
      '6.3': { code: '6.3', name: 'ماشین‌آلات و تجهیزات' },
      '6.4': { code: '6.4', name: 'پیمانکاران دست دوم' },
      '6.5': { code: '6.5', name: 'سربار پروژه' },
      '6.6': { code: '6.6', name: 'سایر هزینه‌ها' },
      '7':   { code: '7',   name: 'هزینه‌های مالی' },
    };

    for (const l of lines) {
      const code = l.account.code;
      // فقط حساب‌های هزینه (6.x و 7)
      if (!code.startsWith('6') && !code.startsWith('7')) continue;
      // پیدا کردن prefix
      let prefix = '6.6';
      for (const k of Object.keys(map)) {
        if (code.startsWith(k)) { prefix = k; break; }
      }
      if (!categories[prefix]) categories[prefix] = { ...map[prefix], amount: 0 };
      categories[prefix].amount += Number(l.debit) - Number(l.credit);
    }

    const total = Object.values(categories).reduce((s, c) => s + c.amount, 0);
    const items = Object.values(categories)
      .map(c => ({ ...c, amount: Math.round(c.amount * 100) / 100, percent: total > 0 ? Math.round((c.amount / total) * 10000) / 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total: Math.round(total * 100) / 100,
      categories: items,
    };
  }

  // ═══════════ سنین مطالبات و بدهی‌ها ═══════════
  private async agingSummary(projectId: string) {
    // فاکتورهای فروش پرداخت‌نشده (AR) و فاکتورهای خرید پرداخت‌نشده (AP)
    const [salesInvoices, purchaseInvoices] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { projectId, status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } },
        select: { id: true, code: true, invoiceDate: true, totalAmount: true, receivedAmount: true, partner: { select: { id: true, name: true } } },
      }).catch(() => []),
      this.prisma.purchaseInvoice.findMany({
        where: { projectId, deletedAt: null, status: { in: ['APPROVED', 'PARTIALLY_PAID'] } },
        select: { id: true, code: true, invoiceDate: true, totalAmount: true, paidAmount: true, supplier: { select: { id: true, name: true } } },
      }).catch(() => []),
    ]);

    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    function ageBucket(date: Date): keyof typeof buckets {
      const days = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
      if (days <= 30) return '0-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    }

    const arBuckets = { ...buckets };
    const apBuckets = { ...buckets };
    const arDetails: any[] = [];
    const apDetails: any[] = [];
    let arTotal = 0, apTotal = 0;

    for (const si of salesInvoices) {
      const remaining = Number(si.totalAmount) - Number(si.receivedAmount);
      if (remaining <= 0.01) continue;
      const b = ageBucket(si.invoiceDate);
      arBuckets[b] += remaining;
      arTotal += remaining;
      arDetails.push({
        code: si.code, partner: si.partner?.name, date: si.invoiceDate,
        remaining: Math.round(remaining * 100) / 100, bucket: b,
      });
    }

    for (const pi of purchaseInvoices) {
      const remaining = Number(pi.totalAmount) - Number(pi.paidAmount);
      if (remaining <= 0.01) continue;
      const b = ageBucket(pi.invoiceDate);
      apBuckets[b] += remaining;
      apTotal += remaining;
      apDetails.push({
        code: pi.code, supplier: pi.supplier?.name, date: pi.invoiceDate,
        remaining: Math.round(remaining * 100) / 100, bucket: b,
      });
    }

    return {
      receivable: { total: Math.round(arTotal * 100) / 100, buckets: arBuckets, details: arDetails.sort((a, b) => b.remaining - a.remaining) },
      payable: { total: Math.round(apTotal * 100) / 100, buckets: apBuckets, details: apDetails.sort((a, b) => b.remaining - a.remaining) },
      netPosition: Math.round((arTotal - apTotal) * 100) / 100,
    };
  }

  // ═══════════ پیشرفت در برابر هزینه ═══════════
  private async progressVsCostSummary(projectId: string) {
    // آخرین snapshot پیشرفت برای هر WBS
    const snapshots = await this.prisma.wbsProgressSnapshot.findMany({
      where: { projectId },
      orderBy: { snapshotDate: 'desc' },
      include: { wbsItem: { select: { id: true, code: true, title: true, totalPrice: true, weight: true } } },
    });

    // فقط آخرین snapshot برای هر WBS
    const latest: Record<string, any> = {};
    for (const s of snapshots) {
      if (!latest[s.wbsItemId]) latest[s.wbsItemId] = s;
    }

    const wbsItems = await this.prisma.wbsItem.findMany({
      where: { projectId },
      select: { id: true, code: true, title: true, totalPrice: true, weight: true },
    }).catch(async () => {
      return this.prisma.wbsItem.findMany({
        where: { projectId },
        select: { id: true, code: true, title: true, totalPrice: true, weight: true },
      });
    });

    // هزینه‌های مرتبط با هر WBS (از journalLine که wbsItemId نداره در schema فعلی)
    // به‌جای آن، از فاکتور خرید آیتم‌ها و حواله مصرف با wbsItemId استفاده می‌کنیم
    const piItems = await this.prisma.purchaseInvoiceItem.findMany({
      where: { wbsItemId: { not: null }, invoice: { projectId, deletedAt: null } },
      select: { wbsItemId: true, totalPrice: true },
    }).catch(() => []);

    const giItems = await this.prisma.goodsIssueItem.findMany({
      where: { issue: { projectId } },
      select: { totalCost: true, issue: { select: { wbsItemId: true } } },
    }).catch(() => []);

    const costByWbs: Record<string, number> = {};
    for (const it of piItems as any[]) {
      if (!it.wbsItemId) continue;
      costByWbs[it.wbsItemId] = (costByWbs[it.wbsItemId] || 0) + Number(it.totalPrice || 0);
    }
    for (const it of giItems as any[]) {
      const wbsId = it.issue?.wbsItemId;
      if (!wbsId) continue;
      costByWbs[wbsId] = (costByWbs[wbsId] || 0) + Number(it.totalCost || 0);
    }

    const rows = wbsItems.map((w: any) => {
      const snap = latest[w.id];
      const progress = snap?.progressPct ? Number(snap.progressPct) : 0;
      const budget = Number(w.totalPrice || 0);
      const cost = costByWbs[w.id] || 0;
      const costPercent = budget > 0 ? (cost / budget) * 100 : 0;
      const deviation = progress - costPercent;
      return {
        id: w.id, code: w.code, title: w.title,
        progress: Math.round(progress * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        budget: Math.round(budget * 100) / 100,
        costPercent: Math.round(costPercent * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        status: deviation < -10 ? 'WARNING' : deviation < -20 ? 'CRITICAL' : 'OK',
      };
    });

    const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const avgProgress = rows.length > 0
      ? rows.reduce((s, r) => s + r.progress * (r.budget || 1), 0) / rows.reduce((s, r) => s + (r.budget || 1), 0)
      : 0;

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      averageProgress: Math.round(avgProgress * 100) / 100,
      totalCostPercent: totalBudget > 0 ? Math.round((totalCost / totalBudget) * 10000) / 100 : 0,
      rows: rows.sort((a, b) => b.budget - a.budget).slice(0, 100),
      warningCount: rows.filter(r => r.status !== 'OK').length,
    };
  }

}
