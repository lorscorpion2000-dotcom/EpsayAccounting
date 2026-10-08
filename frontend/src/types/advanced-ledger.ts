export interface AdvLedgerRow {
  id: string;
  entryId: string;
  entryCode: string;
  entryNumber?: number;
  entryDate: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNature: string;
  description: string;
  reference?: string | null;
  project?: { id: string; code: string; name: string } | null;
  partner?: { id: string; code: string; name: string } | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface AdvLedgerAccount {
  id: string;
  code: string;
  name: string;
  nature: string;
  openingBalance: number;
  closingBalance: number;
}

export interface AdvLedgerResponse {
  accounts: AdvLedgerAccount[];
  opening: { total: number; byAccount: Record<string, any> };
  rows: AdvLedgerRow[];
  summary: {
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    rowCount: number;
  };
  period: { from: string; to: string };
}

export interface ProfitLossByPeriod {
  period: { from: string; to: string };
  revenues: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totals: { totalRevenue: number; totalExpense: number; profit: number };
}
