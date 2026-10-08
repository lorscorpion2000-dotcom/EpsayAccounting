import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AdvancedLedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * گزارش دفتر معین پیشرفته
   * - یک حساب (کل/معین/تفصیلی) یا یک رنج از حساب‌ها
   * - فیلتر پروژه، شخص، مرکز هزینه
   * - محاسبه مانده اول دوره، بدهکار، بستانکار، مانده پایان
   */
  async report(params: {
    accountId?: string;
    accountCodePrefix?: string;
    projectId?: string;
    partnerId?: string;
    costCenterId?: string;
    fromDate: string;
    toDate: string;
    includeSubAccounts?: boolean;
  }) {
    if (!params.fromDate || !params.toDate) {
      throw new BadRequestException('بازه تاریخ الزامی است');
    }

    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    // ═══ حساب‌ها ═══
    let accounts: any[] = [];
    if (params.accountId) {
      const acc = await this.prisma.account.findUnique({ where: { id: params.accountId } });
      if (!acc) throw new BadRequestException('حساب یافت نشد');

      if (params.includeSubAccounts) {
        accounts = await this.getAccountTree(acc.id);
      } else {
        accounts = [acc];
      }
    } else if (params.accountCodePrefix) {
      accounts = await this.prisma.account.findMany({
        where: { code: { startsWith: params.accountCodePrefix } },
      });
    } else {
      throw new BadRequestException('حداقل یک حساب انتخاب کنید');
    }

    if (accounts.length === 0) {
      return { accounts: [], opening: {}, rows: [], summary: {}, period: { from: params.fromDate, to: params.toDate } };
    }

    const accountIds = accounts.map((a) => a.id);

    // ═══ فیلتر مشترک ═══
    const commonWhere: any = {
      accountId: { in: accountIds },
      journalEntry: { status: 'POSTED' },
    };
    if (params.projectId) commonWhere.projectId = params.projectId;
    if (params.partnerId) commonWhere.partnerId = params.partnerId;
    if (params.costCenterId) commonWhere.costCenterId = params.costCenterId;

    // ═══ مانده اول دوره ═══
    const openingLines = await this.prisma.journalLine.findMany({
      where: {
        ...commonWhere,
        journalEntry: { ...commonWhere.journalEntry, entryDate: { lt: fromDate } },
      },
      select: { accountId: true, debit: true, credit: true },
    });

    const opening: Record<string, { debit: number; credit: number; balance: number }> = {};
    for (const a of accounts) {
      opening[a.id] = { debit: 0, credit: 0, balance: 0 };
    }
    for (const l of openingLines) {
      if (opening[l.accountId]) {
        opening[l.accountId].debit += Number(l.debit);
        opening[l.accountId].credit += Number(l.credit);
      }
    }
    for (const aid of Object.keys(opening)) {
      const op = opening[aid];
      const acc = accounts.find((a) => a.id === aid);
      // مانده: برای حساب‌های DEBIT → بدهکار - بستانکار
      // برای CREDIT → بستانکار - بدهکار
      const natural = acc?.nature === 'CREDIT' ? -1 : 1;
      op.balance = (op.debit - op.credit) * natural;
    }

    // ═══ تراکنش‌های دوره ═══
    const lines = await this.prisma.journalLine.findMany({
      where: {
        ...commonWhere,
        journalEntry: { ...commonWhere.journalEntry, entryDate: { gte: fromDate, lte: toDate } },
      },
      include: {
        account: { select: { id: true, code: true, name: true, nature: true } },
        journalEntry: {
          select: {
            id: true, code: true, entryDate: true, description: true, reference: true,
            sourceType: true, sourceId: true,
          },
        },
        project: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, code: true, name: true } },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { journalEntry: { entryNumber: 'asc' } },
        { sortOrder: 'asc' },
      ],
    });

    // ═══ محاسبه مانده جاری هر حساب ═══
    const runningBalance: Record<string, number> = {};
    for (const aid of Object.keys(opening)) {
      runningBalance[aid] = opening[aid].balance;
    }

    const rows = lines.map((l) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      const natural = acc?.nature === 'CREDIT' ? -1 : 1;
      const delta = (Number(l.debit) - Number(l.credit)) * natural;
      runningBalance[l.accountId] += delta;
      return {
        id: l.id,
        entryId: l.journalEntry.id,
        entryCode: l.journalEntry.code,
        entryNumber: (l.journalEntry as any).entryNumber,
        entryDate: l.journalEntry.entryDate,
        accountId: l.accountId,
        accountCode: l.account.code,
        accountName: l.account.name,
        accountNature: l.account.nature,
        description: l.description || l.journalEntry.description,
        reference: l.journalEntry.reference,
        project: l.project,
        partner: l.partner,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: runningBalance[l.accountId],
      };
    });

    // ═══ خلاصه ═══
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    const openingTotal = Object.values(opening).reduce((s, o) => s + o.balance, 0);

    // closing = opening + sum(delta)
    const closingTotal = Object.values(runningBalance).reduce((s, v) => s + v, 0);

    return {
      accounts: accounts.map((a) => ({
        id: a.id, code: a.code, name: a.name, nature: a.nature,
        openingBalance: opening[a.id]?.balance || 0,
        closingBalance: runningBalance[a.id] || 0,
      })),
      opening: {
        total: openingTotal,
        byAccount: opening,
      },
      rows,
      summary: {
        openingBalance: openingTotal,
        totalDebit,
        totalCredit,
        closingBalance: closingTotal,
        rowCount: rows.length,
      },
      period: { from: params.fromDate, to: params.toDate },
    };
  }

  private async getAccountTree(rootId: string): Promise<any[]> {
    const all = await this.prisma.account.findMany();
    const map = new Map(all.map((a) => [a.id, a]));
    const result: any[] = [];
    const visit = (id: string) => {
      const acc = map.get(id);
      if (!acc) return;
      result.push(acc);
      const children = all.filter((a) => a.parentId === id);
      for (const c of children) visit(c.id);
    };
    visit(rootId);
    return result;
  }

  /**
   * سود و زیان دوره — به تفکیک حساب‌های 4.x و 5.x
   */
  async profitLossByPeriod(params: { fromDate: string; toDate: string; projectId?: string }) {
    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    const where: any = {
      journalEntry: { status: 'POSTED', entryDate: { gte: fromDate, lte: toDate } },
      account: { code: { in: ['4', '5'] } }, // via startsWith below
    };
    if (params.projectId) where.projectId = params.projectId;

    const lines = await this.prisma.journalLine.findMany({
      where: {
        ...where,
        OR: [
          { account: { code: { startsWith: '4' } } },
          { account: { code: { startsWith: '5' } } },
        ],
      },
      include: {
        account: { select: { code: true, name: true } },
      },
    });

    const byAccount: Record<string, any> = {};
    for (const l of lines) {
      const code = l.account.code;
      if (!byAccount[code]) {
        byAccount[code] = {
          code, name: l.account.name,
          debit: 0, credit: 0,
          isRevenue: code.startsWith('4'),
        };
      }
      byAccount[code].debit += Number(l.debit);
      byAccount[code].credit += Number(l.credit);
    }

    const revenues = Object.values(byAccount)
      .filter((a: any) => a.isRevenue)
      .map((a: any) => ({ ...a, amount: a.credit - a.debit }));
    const expenses = Object.values(byAccount)
      .filter((a: any) => !a.isRevenue)
      .map((a: any) => ({ ...a, amount: a.debit - a.credit }));

    const totalRevenue = revenues.reduce((s: number, r: any) => s + r.amount, 0);
    const totalExpense = expenses.reduce((s: number, r: any) => s + r.amount, 0);
    const profit = totalRevenue - totalExpense;

    return {
      period: { from: params.fromDate, to: params.toDate },
      revenues, expenses,
      totals: { totalRevenue, totalExpense, profit },
    };
  }
}
