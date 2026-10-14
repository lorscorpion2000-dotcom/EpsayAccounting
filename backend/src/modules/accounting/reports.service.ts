import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * تراز آزمایشی ۴ ستونی
   */
  async trialBalance(query: { fiscalYearId: string; fromDate?: string; toDate?: string }) {
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };

    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: true },
    });

    const byAccount = new Map<string, any>();
    for (const line of lines) {
      const acc = line.account;
      if (!byAccount.has(acc.id)) {
        byAccount.set(acc.id, {
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          accountLevel: acc.level,
          nature: acc.nature,
          debit: 0,
          credit: 0,
        });
      }
      const row = byAccount.get(acc.id);
      row.debit += Number(line.debit);
      row.credit += Number(line.credit);
    }

    const rows = Array.from(byAccount.values()).map((r) => {
      const balance = r.debit - r.credit;
      return {
        ...r,
        debit: Number(r.debit.toFixed(2)),
        credit: Number(r.credit.toFixed(2)),
        balance: Number(balance.toFixed(2)),
      };
    }).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totals = rows.reduce(
      (sum, r) => ({
        debit: sum.debit + r.debit,
        credit: sum.credit + r.credit,
      }),
      { debit: 0, credit: 0 },
    );

    return {
      rows,
      totals: {
        debit: Number(totals.debit.toFixed(2)),
        credit: Number(totals.credit.toFixed(2)),
        difference: Number((totals.debit - totals.credit).toFixed(2)),
      },
    };
  }

  /**
   * دفتر معین (Ledger) یک حساب
   */
  async ledger(query: {
    accountId: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const account = await this.prisma.account.findUnique({
      where: { id: query.accountId },
    });
    if (!account) return { account: null, rows: [], totals: null };

    const where: any = {
      accountId: query.accountId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
    };

    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { journalEntry: true },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let runningBalance = 0;
    const rows = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      runningBalance += debit - credit;
      return {
        id: l.id,
        entryCode: l.journalEntry.code,
        entryDate: l.journalEntry.entryDate,
        description: l.description || l.journalEntry.description,
        reference: l.journalEntry.reference,
        debit,
        credit,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      account,
      rows,
      totals: {
        debit: Number(totalDebit.toFixed(2)),
        credit: Number(totalCredit.toFixed(2)),
        balance: Number((totalDebit - totalCredit).toFixed(2)),
      },
    };
  }

  /**
   * دفتر روزنامه
   */
  async journalBook(query: {
    fiscalYearId: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {
      fiscalYearId: query.fiscalYearId,
      status: { in: ['POSTED', 'REVERSED'] },
      deletedAt: null,
    };

    if (query.fromDate || query.toDate) {
      where.entryDate = {};
      if (query.fromDate) where.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.entryDate.lte = new Date(query.toDate);
    }

    return this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ entryDate: 'asc' }, { entryNumber: 'asc' }],
    });
  }


  // ═══════════════════════════════════════════════════════════════
  // ۱) ریز حساب طرف حساب (Party Ledger)
  // ═══════════════════════════════════════════════════════════════
  async partyLedger(query: {
    partnerId: string;
    fiscalYearId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: query.partnerId },
      select: { id: true, code: true, name: true, type: true, phone: true, nationalId: true },
    });
    if (!partner) return { partner: null, rows: [], totals: null };

    const where: any = {
      partnerId: query.partnerId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: {
        journalEntry: { select: { code: true, entryDate: true, description: true, reference: true } },
        account: { select: { code: true, name: true } },
      },
      orderBy: [{ journalEntry: { entryDate: 'asc' } }, { journalEntry: { entryNumber: 'asc' } }],
    });

    let runningBalance = 0;
    const rows = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      runningBalance += debit - credit;
      return {
        id: l.id,
        entryCode: l.journalEntry.code,
        entryDate: l.journalEntry.entryDate,
        description: l.description || l.journalEntry.description,
        reference: l.journalEntry.reference,
        accountCode: l.account.code,
        accountName: l.account.name,
        debit,
        credit,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      partner,
      rows,
      totals: {
        debit: Number(totalDebit.toFixed(2)),
        credit: Number(totalCredit.toFixed(2)),
        balance: Number((totalDebit - totalCredit).toFixed(2)),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ۲) ریز حساب پروه (Project Ledger)
  // ═══════════════════════════════════════════════════════════════
  async projectLedger(query: {
    projectId: string;
    fiscalYearId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: query.projectId },
      select: { id: true, code: true, name: true, status: true },
    });
    if (!project) return { project: null, rows: [], totals: null };

    const where: any = {
      projectId: query.projectId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: {
        journalEntry: { select: { code: true, entryDate: true, description: true } },
        account: { select: { code: true, name: true } },
      },
      orderBy: [{ journalEntry: { entryDate: 'asc' } }, { journalEntry: { entryNumber: 'asc' } }],
    });

    let runningBalance = 0;
    const rows = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      runningBalance += debit - credit;
      return {
        id: l.id,
        entryCode: l.journalEntry.code,
        entryDate: l.journalEntry.entryDate,
        description: l.description || l.journalEntry.description,
        accountCode: l.account.code,
        accountName: l.account.name,
        debit,
        credit,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      project,
      rows,
      totals: {
        debit: Number(totalDebit.toFixed(2)),
        credit: Number(totalCredit.toFixed(2)),
        balance: Number((totalDebit - totalCredit).toFixed(2)),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ۳ & ۴) سنی بدهکاران / بستانکاران (AR/AP Aging)
  // ═══════════════════════════════════════════════════════════════
  async agingReport(query: { type: 'AR' | 'AP'; fiscalYearId?: string; asOfDate?: string }) {
    const asOf = query.asOfDate ? new Date(query.asOfDate) : new Date();

    // نوع حساب: AR = دارایی دریافتنی AP = بدهی پرداختنی
    const codePrefix = query.type === 'AR' ? '1.1.2' : '2.1.1';

    const where: any = {
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
      partnerId: { not: null },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;

    // فیلتر بر اساس حساب: کد با prefix شروع شود
    const accounts = await this.prisma.account.findMany({
      where: { code: { startsWith: codePrefix } },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) return { rows: [], totals: null, asOfDate: asOf };

    where.accountId = { in: accountIds };
    where.journalEntry.entryDate = { lte: asOf };

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { entryDate: true } },
      },
    });

    // گروهبندی بر اساس partner
    const byPartner = new Map<string, any>();
    for (const l of lines) {
      const pid = l.partnerId!;
      if (!byPartner.has(pid)) {
        byPartner.set(pid, {
          partnerId: pid,
          partnerCode: l.partner?.code || '',
          partnerName: l.partner?.name || '',
          balance: 0,
          current: 0,      // 0-30 روز
          days31_60: 0,
          days61_90: 0,
          days91_180: 0,
          days180plus: 0,
        });
      }
      const row = byPartner.get(pid);
      const days = Math.floor((asOf.getTime() - new Date(l.journalEntry.entryDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(l.debit) - Number(l.credit);
      row.balance += amount;

      // دستهبندی
      if (days <= 30) row.current += amount;
      else if (days <= 60) row.days31_60 += amount;
      else if (days <= 90) row.days61_90 += amount;
      else if (days <= 180) row.days91_180 += amount;
      else row.days180plus += amount;
    }

    const rows = Array.from(byPartner.values())
      .map((r) => ({
        ...r,
        balance: Number(r.balance.toFixed(2)),
        current: Number(r.current.toFixed(2)),
        days31_60: Number(r.days31_60.toFixed(2)),
        days61_90: Number(r.days61_90.toFixed(2)),
        days91_180: Number(r.days91_180.toFixed(2)),
        days180plus: Number(r.days180plus.toFixed(2)),
      }))
      .filter((r) => Math.abs(r.balance) > 0.01)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const totals = rows.reduce(
      (s, r) => ({
        balance: s.balance + r.balance,
        current: s.current + r.current,
        days31_60: s.days31_60 + r.days31_60,
        days61_90: s.days61_90 + r.days61_90,
        days91_180: s.days91_180 + r.days91_180,
        days180plus: s.days180plus + r.days180plus,
      }),
      { balance: 0, current: 0, days31_60: 0, days61_90: 0, days91_180: 0, days180plus: 0 },
    );

    return {
      rows,
      totals,
      asOfDate: asOf,
      type: query.type,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ۵) سود و زیان (P&L)
  // ═══════════════════════════════════════════════════════════════
  async profitLoss(query: { fiscalYearId: string; fromDate?: string; toDate?: string }) {
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: { select: { id: true, code: true, name: true, level: true } } },
    });

    // گروهبندی توسط حساب
    const byAccount = new Map<string, any>();
    for (const l of lines) {
      const acc = l.account;
      const first = acc.code.charAt(0);
      if (first !== '4' && first !== '5') continue;

      if (!byAccount.has(acc.id)) {
        byAccount.set(acc.id, {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          level: acc.level,
          debit: 0,
          credit: 0,
        });
      }
      const row = byAccount.get(acc.id);
      row.debit += Number(l.debit);
      row.credit += Number(l.credit);
    }

    const accounts = Array.from(byAccount.values());

    // درآمد: مانده بستانکار (credit - debit)
    const incomeAccounts = accounts
      .filter((a) => a.code.charAt(0) === '4')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: Number((a.credit - a.debit).toFixed(2)),
      }))
      .filter((a) => Math.abs(a.amount) > 0.01)
      .sort((a, b) => a.code.localeCompare(b.code));

    // هزینه: مانده بدهکار (debit - credit)
    const expenseAccounts = accounts
      .filter((a) => a.code.charAt(0) === '5')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: Number((a.debit - a.credit).toFixed(2)),
      }))
      .filter((a) => Math.abs(a.amount) > 0.01)
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalIncome = Number(incomeAccounts.reduce((s, a) => s + a.amount, 0).toFixed(2));
    const totalExpense = Number(expenseAccounts.reduce((s, a) => s + a.amount, 0).toFixed(2));
    const netIncome = Number((totalIncome - totalExpense).toFixed(2));

    return {
      incomes: incomeAccounts,
      expenses: expenseAccounts,
      totals: {
        totalIncome,
        totalExpense,
        netIncome,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ۶) ترازنامه (Balance Sheet)
  // ═══════════════════════════════════════════════════════════════
  async balanceSheet(query: { fiscalYearId: string; asOfDate?: string }) {
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };
    if (query.asOfDate) {
      where.journalEntry.entryDate = { lte: new Date(query.asOfDate) };
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: { select: { id: true, code: true, name: true, level: true, nature: true } } },
    });

    const byAccount = new Map<string, any>();
    for (const l of lines) {
      const acc = l.account;
      const first = acc.code.charAt(0);
      if (!['1','2','3','4','5'].includes(first)) continue;

      if (!byAccount.has(acc.id)) {
        byAccount.set(acc.id, {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          level: acc.level,
          nature: acc.nature,
          debit: 0,
          credit: 0,
        });
      }
      const row = byAccount.get(acc.id);
      row.debit += Number(l.debit);
      row.credit += Number(l.credit);
    }

    const accounts = Array.from(byAccount.values());

    // دارایی: مانده بدهکار (debit - credit)
    const assets = accounts
      .filter((a) => a.code.charAt(0) === '1')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: Number((a.debit - a.credit).toFixed(2)),
      }))
      .filter((a) => Math.abs(a.amount) > 0.01)
      .sort((a, b) => a.code.localeCompare(b.code));

    // بدهی: مانده بستانکار (credit - debit)
    const liabilities = accounts
      .filter((a) => a.code.charAt(0) === '2')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: Number((a.credit - a.debit).toFixed(2)),
      }))
      .filter((a) => Math.abs(a.amount) > 0.01)
      .sort((a, b) => a.code.localeCompare(b.code));

    // سرمایه: مانده بستانکار (credit - debit)
    const equity = accounts
      .filter((a) => a.code.charAt(0) === '3')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: Number((a.credit - a.debit).toFixed(2)),
      }))
      .filter((a) => Math.abs(a.amount) > 0.01)
      .sort((a, b) => a.code.localeCompare(b.code));

// Current-period earnings (codes 4 and 5)
    let revenueSum = 0;
    let expenseSum = 0;
    for (const a of accounts) {
      const first = a.code.charAt(0);
      if (first === '4') revenueSum += a.credit - a.debit;
      else if (first === '5') expenseSum += a.debit - a.credit;
    }
    const netIncome = Number((revenueSum - expenseSum).toFixed(2));
    if (Math.abs(netIncome) > 0.01) {
      equity.push({
        code: '3999',
        name: 'Current Period Earnings',
        amount: netIncome,
      });
    }
    const totalAssets = Number(assets.reduce((s, a) => s + a.amount, 0).toFixed(2));
    const totalLiabilities = Number(liabilities.reduce((s, a) => s + a.amount, 0).toFixed(2));
    const totalEquity = Number(equity.reduce((s, a) => s + a.amount, 0).toFixed(2));

    return {
      assets,
      liabilities,
      equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesEquity: Number((totalLiabilities + totalEquity).toFixed(2)),
        difference: Number((totalAssets - totalLiabilities - totalEquity).toFixed(2)),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ۷) تراز آزمایشی تفصیلی (Detailed TB)
  // ═══════════════════════════════════════════════════════════════
  async detailedTrialBalance(query: {
    fiscalYearId: string;
    fromDate?: string;
    toDate?: string;
  }) {
    // مانده ابتدای دوره (اگر fromDate داده شده)
    const opening: Record<string, { debit: number; credit: number }> = {};
    if (query.fromDate) {
      const openingLines = await this.prisma.journalLine.findMany({
        where: {
          journalEntry: {
            fiscalYearId: query.fiscalYearId,
            status: { in: ['POSTED', 'REVERSED'] },
            deletedAt: null,
            entryDate: { lt: new Date(query.fromDate) },
          },
        },
      });
      for (const l of openingLines) {
        if (!opening[l.accountId]) opening[l.accountId] = { debit: 0, credit: 0 };
        opening[l.accountId].debit += Number(l.debit);
        opening[l.accountId].credit += Number(l.credit);
      }
    }

    // گردش دوره
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: true },
    });

    const byAccount = new Map<string, any>();
    // ابتدا حسابهای دارای مانده اولیه
    for (const [accId, v] of Object.entries(opening)) {
      byAccount.set(accId, {
        accountId: accId,
        accountCode: '',
        accountName: '',
        openingDebit: v.debit,
        openingCredit: v.credit,
        periodDebit: 0,
        periodCredit: 0,
      });
    }

    for (const l of lines) {
      if (!byAccount.has(l.accountId)) {
        byAccount.set(l.accountId, {
          accountId: l.accountId,
          accountCode: l.account.code,
          accountName: l.account.name,
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        });
      }
      const row = byAccount.get(l.accountId);
      row.accountCode = l.account.code;
      row.accountName = l.account.name;
      row.periodDebit += Number(l.debit);
      row.periodCredit += Number(l.credit);
    }

    const rows = Array.from(byAccount.values()).map((r) => {
      const openingNet = r.openingDebit - r.openingCredit;
      const closingNet = openingNet + r.periodDebit - r.periodCredit;
      return {
        accountId: r.accountId,
        accountCode: r.accountCode,
        accountName: r.accountName,
        openingDebit: Number(Math.max(r.openingDebit - r.openingCredit, 0).toFixed(2)),
        openingCredit: Number(Math.max(r.openingCredit - r.openingDebit, 0).toFixed(2)),
        periodDebit: Number(r.periodDebit.toFixed(2)),
        periodCredit: Number(r.periodCredit.toFixed(2)),
        closingDebit: Number(Math.max(closingNet, 0).toFixed(2)),
        closingCredit: Number(Math.max(-closingNet, 0).toFixed(2)),
      };
    }).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totals = {
      openingDebit: Number(rows.reduce((s, r) => s + r.openingDebit, 0).toFixed(2)),
      openingCredit: Number(rows.reduce((s, r) => s + r.openingCredit, 0).toFixed(2)),
      periodDebit: Number(rows.reduce((s, r) => s + r.periodDebit, 0).toFixed(2)),
      periodCredit: Number(rows.reduce((s, r) => s + r.periodCredit, 0).toFixed(2)),
      closingDebit: Number(rows.reduce((s, r) => s + r.closingDebit, 0).toFixed(2)),
      closingCredit: Number(rows.reduce((s, r) => s + r.closingCredit, 0).toFixed(2)),
    };

    return { rows, totals };
  }
}
