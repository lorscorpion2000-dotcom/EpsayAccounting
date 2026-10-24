import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface VatLine {
  entryId: string;
  entryCode: string;
  entryDate: string;
  description: string;
  counterpartCode: string;
  counterpartName: string;
  taxCode: string;
  taxName: string;
  baseAmount: number;   // مبلغ مبنا (بدون مالیات) — مقدار حساب مقابل
  vatAmount: number;    // مقدار خود مالیات
  direction: 'SALE' | 'PURCHASE';
  projectId?: string | null;
}

export interface VatReport {
  from: string;
  to: string;
  sales: VatLine[];
  purchases: VatLine[];
  totals: {
    salesBase: number;
    salesVat: number;
    purchaseBase: number;
    purchaseVat: number;
    netPayable: number;
  };
  byMonth: Array<{
    yearMonth: string; // YYYY-MM
    salesVat: number;
    purchaseVat: number;
    net: number;
  }>;
}

const VAT_ROOT_CODE = '2.1.3';

@Injectable()
export class VatService {
  constructor(private prisma: PrismaService) {}

  private async collectVatAccountIds(): Promise<string[]> {
    const root = await this.prisma.account.findFirst({
      where: { code: VAT_ROOT_CODE },
      select: { id: true },
    });
    if (!root) return [];
    const ids = new Set<string>([root.id]);
    const queue = [root.id];
    while (queue.length) {
      const id = queue.shift()!;
      const kids = await this.prisma.account.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      for (const k of kids) { ids.add(k.id); queue.push(k.id); }
    }
    return Array.from(ids);
  }

  async buildReport(fromISO: string, toISO: string, projectId?: string): Promise<VatReport> {
    const from = new Date(fromISO);
    const to   = new Date(toISO);
    const vatIds = await this.collectVatAccountIds();
    if (!vatIds.length) {
      return {
        from: from.toISOString(), to: to.toISOString(),
        sales: [], purchases: [],
        totals: { salesBase: 0, salesVat: 0, purchaseBase: 0, purchaseVat: 0, netPayable: 0 },
        byMonth: [],
      };
    }

      const where: Prisma.JournalEntryWhereInput = {
        deletedAt: null,
        status: { in: ['POSTED', 'REVERSED'] },
        entryDate: { gte: from, lte: to },
        lines: { some: { accountId: { in: vatIds } } },
      };
      if (projectId) {
        where.lines = {
          some: { accountId: { in: vatIds }, projectId },
        };
      }

      const entries = await this.prisma.journalEntry.findMany({
        where,
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    const sales: VatLine[] = [];
    const purchases: VatLine[] = [];

    for (const e of entries) {
      const vatLines = e.lines.filter((l) => vatIds.includes(l.accountId));
      if (!vatLines.length) continue;

      const netVat = vatLines.reduce(
        (s, l) => s + Number(l.credit) - Number(l.debit), 0);
      if (Math.abs(netVat) < 0.01) continue;

      const direction: 'SALE' | 'PURCHASE' = netVat > 0 ? 'SALE' : 'PURCHASE';
      const vatAmount = Math.abs(netVat);
      const vatLine = vatLines.find((l) =>
        direction === 'SALE' ? Number(l.credit) > 0 : Number(l.debit) > 0) ?? vatLines[0];

      // مبنا: حساب(های) مقابل با مقدار بزرگ
      const counterparts = e.lines
        .filter((l) => !vatIds.includes(l.accountId))
        .sort((a, b) =>
          (Number(b.debit) + Number(b.credit)) - (Number(a.debit) + Number(a.credit)));
      const main = counterparts[0];
      const baseAmount = main ? Number(main.debit) + Number(main.credit) : 0;

      const line: VatLine = {
        entryId: e.id,
        entryCode: e.code,
        entryDate: e.entryDate.toISOString(),
        description: e.description,
        counterpartCode: main?.account.code ?? '—',
        counterpartName: main?.account.name ?? '—',
        taxCode: vatLine.account.code,
        taxName: vatLine.account.name,
        baseAmount: Math.round(baseAmount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        direction,
      };
      line.projectId = e.lines.find((l) => l.projectId)?.projectId || null;
      (direction === 'SALE' ? sales : purchases).push(line);
    }

    sales.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    purchases.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    const salesVat    = sales.reduce((s, x) => s + x.vatAmount, 0);
    const purchaseVat = purchases.reduce((s, x) => s + x.vatAmount, 0);
    const salesBase   = sales.reduce((s, x) => s + x.baseAmount, 0);
    const purchaseBase = purchases.reduce((s, x) => s + x.baseAmount, 0);

    // by month
    const monthMap = new Map<string, { salesVat: number; purchaseVat: number }>();
    for (const x of sales) {
      const key = x.entryDate.slice(0, 7);
      const cur = monthMap.get(key) ?? { salesVat: 0, purchaseVat: 0 };
      cur.salesVat += x.vatAmount; monthMap.set(key, cur);
    }
    for (const x of purchases) {
      const key = x.entryDate.slice(0, 7);
      const cur = monthMap.get(key) ?? { salesVat: 0, purchaseVat: 0 };
      cur.purchaseVat += x.vatAmount; monthMap.set(key, cur);
    }
    const byMonth = Array.from(monthMap.entries())
      .map(([ym, v]) => ({
        yearMonth: ym,
        salesVat: Math.round(v.salesVat * 100) / 100,
        purchaseVat: Math.round(v.purchaseVat * 100) / 100,
        net: Math.round((v.salesVat - v.purchaseVat) * 100) / 100,
      }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return {
      from: from.toISOString(),
      to:   to.toISOString(),
      sales, purchases,
      totals: {
        salesBase:    Math.round(salesBase * 100) / 100,
        salesVat:     Math.round(salesVat * 100) / 100,
        purchaseBase: Math.round(purchaseBase * 100) / 100,
        purchaseVat:  Math.round(purchaseVat * 100) / 100,
        netPayable:   Math.round((salesVat - purchaseVat) * 100) / 100,
      },
      byMonth,
    };
  }
}