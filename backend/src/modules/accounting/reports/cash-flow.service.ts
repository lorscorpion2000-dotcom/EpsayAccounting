import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export type CashFlowSection = 'OPERATING' | 'INVESTING' | 'FINANCING';

export interface CashFlowRow {
  counterpartId: string;
  counterpartCode: string;
  counterpartName: string;
  section: CashFlowSection;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
}

export interface CashFlowReport {
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  netChange: number;
  cashAccountCodes: string[];
  sections: {
    OPERATING: CashFlowRow[];
    INVESTING: CashFlowRow[];
    FINANCING: CashFlowRow[];
  };
  sectionTotals: {
    OPERATING: { inflow: number; outflow: number; net: number };
    INVESTING: { inflow: number; outflow: number; net: number };
    FINANCING: { inflow: number; outflow: number; net: number };
  };
}

const CASH_ROOT_CODES = ['1.1.1', '1.1.5'];

@Injectable()
export class CashFlowService {
  constructor(private prisma: PrismaService) {}

  private async collectCashAccountIds(): Promise<{ ids: string[]; codes: string[] }> {
    const roots = await this.prisma.account.findMany({
      where: { code: { in: CASH_ROOT_CODES } },
      select: { id: true, code: true },
    });
    if (!roots.length) return { ids: [], codes: [] };

    const ids = new Set<string>();
    const codes = new Set<string>();
    const queue: string[] = roots.map((r) => r.id);
    const visited = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      ids.add(id);
      const kids = await this.prisma.account.findMany({
        where: { parentId: id },
        select: { id: true, code: true },
      });
      for (const k of kids) {
        codes.add(k.code);
        queue.push(k.id);
      }
    }
    for (const r of roots) codes.add(r.code);
    return { ids: Array.from(ids), codes: Array.from(codes).sort() };
  }

  private classify(counterCode: string): CashFlowSection {
    // دارایی غیرجاری → سرمایه‌گذاری
    if (counterCode.startsWith('1.2')) return 'INVESTING';
    // حقوق صاحبان سهام یا بدهی غیرجاری → تأمین مالی
    if (counterCode.startsWith('3') || counterCode.startsWith('2.2')) return 'FINANCING';
    // بقیه (درآمد/هزینه/سرمایه در گردش) → عملیاتی
    return 'OPERATING';
  }

  async buildReport(fromISO: string, toISO: string): Promise<CashFlowReport> {
    const from = new Date(fromISO);
    const to   = new Date(toISO);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new Error('تاریخ نامعتبر');
    }

    const { ids: cashIds, codes: cashCodes } = await this.collectCashAccountIds();

    // Opening balance: sum up to `from - 1ms`
    const openingLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: cashIds },
        journalEntry: {
          entryDate: { lt: from },
          deletedAt: null,
        },
      },
      select: { debit: true, credit: true },
    });
    const openingBalance = openingLines.reduce(
      (s, l) => s + Number(l.debit) - Number(l.credit), 0);

    // In-period lines (only cash accounts)
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: cashIds },
        journalEntry: {
          entryDate: { gte: from, lte: to },
          deletedAt: null,
        },
      },
      include: {
        journalEntry: {
          include: {
            lines: {
              include: {
                account: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    // For each cash line, find the "counterpart" — the highest-amount non-cash line in same entry.
    // For entries with multiple non-cash lines, we group by each counterpart.
    const rowMap = new Map<string, CashFlowRow>(); // key = section|counterId

    for (const cashLine of lines) {
      const debit  = Number(cashLine.debit);
      const credit = Number(cashLine.credit);
      const netCash = debit - credit;
      if (netCash === 0) continue;

      const counterparts = cashLine.journalEntry.lines
        .filter((l) => !cashIds.includes(l.accountId))
        .filter((l) => Number(l.debit) !== 0 || Number(l.credit) !== 0);

      if (!counterparts.length) continue;

      // total of non-cash lines in that entry (should equal |netCash| for balanced entries,
      // but might differ if multiple cash lines). Use total to weight distribution.
      const totalWeight = counterparts.reduce(
        (s, l) => s + Number(l.debit) + Number(l.credit), 0);
      if (totalWeight === 0) continue;

      for (const c of counterparts) {
        const weight = (Number(c.debit) + Number(c.credit)) / totalWeight;
        const allocated = netCash * weight;
        if (Math.abs(allocated) < 0.01) continue;

        const section = this.classify(c.account.code);
        const key = section + '|' + c.account.id;
        const inflow  = allocated > 0 ? allocated : 0;
        const outflow = allocated < 0 ? -allocated : 0;

        if (!rowMap.has(key)) {
          rowMap.set(key, {
            counterpartId: c.account.id,
            counterpartCode: c.account.code,
            counterpartName: c.account.name,
            section,
            inflow: 0,
            outflow: 0,
            net: 0,
            count: 0,
          });
        }
        const row = rowMap.get(key)!;
        row.inflow  += inflow;
        row.outflow += outflow;
        row.net     += allocated;
        row.count   += 1;
      }
    }

    const sections = {
      OPERATING: [] as CashFlowRow[],
      INVESTING: [] as CashFlowRow[],
      FINANCING: [] as CashFlowRow[],
    };
    for (const row of rowMap.values()) {
      row.inflow  = Math.round(row.inflow  * 100) / 100;
      row.outflow = Math.round(row.outflow * 100) / 100;
      row.net     = Math.round(row.net     * 100) / 100;
      sections[row.section].push(row);
    }
    // sort each section by |net| desc
    for (const k of Object.keys(sections) as (keyof typeof sections)[]) {
      sections[k].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    }

    const totals = (rows: CashFlowRow[]) => ({
      inflow:  Math.round(rows.reduce((s, r) => s + r.inflow, 0)  * 100) / 100,
      outflow: Math.round(rows.reduce((s, r) => s + r.outflow, 0) * 100) / 100,
      net:     Math.round(rows.reduce((s, r) => s + r.net, 0)     * 100) / 100,
    });

    const sectionTotals = {
      OPERATING: totals(sections.OPERATING),
      INVESTING: totals(sections.INVESTING),
      FINANCING: totals(sections.FINANCING),
    };

    const netChange =
      sectionTotals.OPERATING.net +
      sectionTotals.INVESTING.net +
      sectionTotals.FINANCING.net;
    const closingBalance = openingBalance + netChange;

    return {
      from: from.toISOString(),
      to:   to.toISOString(),
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      netChange:      Math.round(netChange * 100) / 100,
      cashAccountCodes: cashCodes,
      sections,
      sectionTotals,
    };
  }
}