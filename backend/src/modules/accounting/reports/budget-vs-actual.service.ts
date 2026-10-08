import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface BudgetLine {
  id: string;
  projectId: string;
  wbsItemId: string | null;
  wbsCode: string | null;
  wbsTitle: string | null;
  wbsLevel: string | null;
  amount: number;
  approvedAt: string;
  isLocked: boolean;
  description: string | null;
}

export interface ActualLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  actual: number;
  count: number;
}

export interface BudgetVsActualReport {
  project: { id: string; code: string; name: string };
  from: string;
  to: string;
  summary: {
    totalBudget: number;
    totalActual: number;
    variance: number;
    percentUsed: number;
  };
  budgetLines: BudgetLine[];
  actualByAccount: ActualLine[];
  totalsByLevel: Array<{ level: string; budget: number }>;
}

@Injectable()
export class BudgetVsActualService {
  constructor(private prisma: PrismaService) {}

  private isExpenseAccount(code: string): boolean {
    return code === '6' || code === '7' ||
           code.startsWith('6.') || code.startsWith('7.');
  }

  async buildReport(projectId: string, fromISO: string, toISO: string): Promise<BudgetVsActualReport> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const from = new Date(fromISO);
    const to   = new Date(toISO);

    // بودجه‌ها
    const budgets = await this.prisma.projectBudget.findMany({
      where: { projectId },
      include: {
        wbsItem: { select: { id: true, code: true, title: true, level: true } },
      },
      orderBy: [{ approvedAt: 'desc' }],
    });

    const budgetLines: BudgetLine[] = budgets.map((b) => ({
      id: b.id,
      projectId: b.projectId,
      wbsItemId: b.wbsItemId,
      wbsCode: b.wbsItem?.code ?? null,
      wbsTitle: b.wbsItem?.title ?? null,
      wbsLevel: (b.wbsItem as any)?.level ?? null,
      amount: Number(b.amount),
      approvedAt: b.approvedAt.toISOString(),
      isLocked: b.isLocked,
      description: b.description ?? null,
    }));

    const totalBudget = budgetLines.reduce((s, b) => s + b.amount, 0);

    // جمع بودجه بر اساس level
    const levelMap = new Map<string, number>();
    for (const b of budgetLines) {
      const lvl = b.wbsLevel ?? 'PROJECT_LEVEL';
      levelMap.set(lvl, (levelMap.get(lvl) ?? 0) + b.amount);
    }
    const totalsByLevel = Array.from(levelMap.entries()).map(([level, budget]) => ({ level, budget }));

    // واقعی: از journal_lines با project_id
    const lines = await this.prisma.journalLine.findMany({
      where: {
        projectId,
        journalEntry: {
          deletedAt: null,
          entryDate: { gte: from, lte: to },
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true } },
      },
    });

    const accMap = new Map<string, ActualLine>();
    for (const l of lines) {
      const code = l.account.code;
      if (!this.isExpenseAccount(code)) continue;
      const net = Number(l.debit) - Number(l.credit);
      if (Math.abs(net) < 0.01) continue;
      const key = l.account.id;
      if (!accMap.has(key)) {
        accMap.set(key, {
          accountId: l.account.id,
          accountCode: code,
          accountName: l.account.name,
          actual: 0,
          count: 0,
        });
      }
      const r = accMap.get(key)!;
      r.actual += net;
      r.count += 1;
    }

    const actualByAccount = Array.from(accMap.values())
      .map((r) => ({ ...r, actual: Math.round(r.actual * 100) / 100 }))
      .sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual));

    const totalActual = actualByAccount.reduce((s, a) => s + a.actual, 0);
    const variance = totalBudget - totalActual;
    const percentUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      project,
      from: from.toISOString(),
      to: to.toISOString(),
      summary: {
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalActual: Math.round(totalActual * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        percentUsed: Math.round(percentUsed * 100) / 100,
      },
      budgetLines,
      actualByAccount,
      totalsByLevel,
    };
  }
}