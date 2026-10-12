import type { PrismaService } from '../../../../shared/prisma/prisma.service';

export async function accountingSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const lines = await prisma.journalLine.findMany({
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

export async function budgetVsActual(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const budgets = await prisma.projectBudget.findMany({
    where: { projectId },
    include: { wbsItem: { select: { id: true, code: true, title: true, level: true } } },
  });
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

  const lines = await prisma.journalLine.findMany({
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
