import * as jalaali from 'jalaali-js';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

export async function kpiSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const [budgets, journalLines, workerStmts, subStmts] = await Promise.all([
    prisma.projectBudget.findMany({ where: { projectId } }),
    prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
      },
      include: { account: { select: { code: true, nature: true } } },
    }),
    prisma.workerStatement.findMany({ where: { projectId } }),
    prisma.subcontractorStatement.findMany({ where: { projectId } }),
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

export async function cashFlowSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      projectId,
      journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
    },
    include: { account: { select: { code: true, name: true } } },
  });

  const cashCodes = (code: string) => code.startsWith('1.1.') || code === '1.1';

  let inflow = 0, outflow = 0;
  for (const l of lines) {
    if (!cashCodes(l.account.code)) continue;
    const debit = Number(l.debit);
    const credit = Number(l.credit);
    if (debit > credit) inflow += debit - credit;
    else outflow += credit - debit;
  }

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

export async function costByCategorySummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      projectId,
      journalEntry: { deletedAt: null, entryDate: { gte: from, lte: to } },
    },
    include: { account: { select: { code: true, name: true } } },
  });

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
    if (!code.startsWith('6') && !code.startsWith('7')) continue;
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

export async function agingSummary(prisma: PrismaService, projectId: string) {
  const [salesInvoices, purchaseInvoices] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { projectId, status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } },
      select: { id: true, code: true, invoiceDate: true, totalAmount: true, receivedAmount: true, partner: { select: { id: true, name: true } } },
    }).catch(() => []),
    prisma.purchaseInvoice.findMany({
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

export async function progressVsCostSummary(prisma: PrismaService, projectId: string) {
  const snapshots = await prisma.wbsProgressSnapshot.findMany({
    where: { projectId },
    orderBy: { snapshotDate: 'desc' },
    include: { wbsItem: { select: { id: true, code: true, title: true, totalPrice: true, weight: true } } },
  });

  const latest: Record<string, any> = {};
  for (const s of snapshots) {
    if (!latest[s.wbsItemId]) latest[s.wbsItemId] = s;
  }

  const wbsItems = await prisma.wbsItem.findMany({
    where: { projectId },
    select: { id: true, code: true, title: true, totalPrice: true, weight: true },
  }).catch(async () => {
    return prisma.wbsItem.findMany({
      where: { projectId },
      select: { id: true, code: true, title: true, totalPrice: true, weight: true },
    });
  });

  const piItems = await prisma.purchaseInvoiceItem.findMany({
    where: { wbsItemId: { not: null }, invoice: { projectId, deletedAt: null } },
    select: { wbsItemId: true, totalPrice: true },
  }).catch(() => []);

  const giItems = await prisma.goodsIssueItem.findMany({
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
