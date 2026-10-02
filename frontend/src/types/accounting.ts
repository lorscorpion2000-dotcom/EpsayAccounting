export type AccountLevel = 'GROUP' | 'GENERAL' | 'SUBSIDIARY' | 'DETAIL';
export type AccountNature = 'DEBIT' | 'CREDIT';
export type FiscalYearStatus = 'OPEN' | 'CLOSED';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export const ACCOUNT_LEVEL_LABELS: Record<AccountLevel, string> = {
  GROUP: 'گروه',
  GENERAL: 'کل',
  SUBSIDIARY: 'معین',
  DETAIL: 'تفصیلی',
};

export const ACCOUNT_NATURE_LABELS: Record<AccountNature, string> = {
  DEBIT: 'بدهکار',
  CREDIT: 'بستانکار',
};

export const ACCOUNT_LEVEL_COLORS: Record<AccountLevel, string> = {
  GROUP: 'bg-brand-50 text-brand-700 border-brand-200',
  GENERAL: 'bg-blue-50 text-blue-700 border-blue-200',
  SUBSIDIARY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DETAIL: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  DRAFT: 'پیش‌نویس',
  POSTED: 'ثبت‌شده',
  REVERSED: 'ابطال‌شده',
};

export const JOURNAL_STATUS_COLORS: Record<JournalStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  REVERSED: 'bg-red-50 text-red-700',
};

export interface Account {
  id: string;
  code: string;
  name: string;
  level: AccountLevel;
  nature: AccountNature;
  parentId?: string | null;
  isActive: boolean;
  isPostable: boolean;
  description?: string | null;
  children?: Account[];
}

export interface FiscalYear {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  isCurrent: boolean;
}

export interface JournalLine {
  id?: string;
  accountId: string;
  account?: Account;
  description?: string | null;
  debit: string | number;
  credit: string | number;
  projectId?: string | null;
  partnerId?: string | null;
  sortOrder?: number;
}

export interface JournalEntry {
  id: string;
  code: string;
  entryNumber: number;
  entryDate: string;
  fiscalYearId: string;
  fiscalYear?: FiscalYear;
  description: string;
  reference?: string | null;
  status: JournalStatus;
  totalDebit: string;
  totalCredit: string;
  sourceType?: string | null;
  sourceId?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  reversalReason?: string | null;
  lines?: JournalLine[];
  _count?: { lines: number };
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountLevel: AccountLevel;
  nature: AccountNature;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
    difference: number;
  };
}

export interface LedgerResult {
  account: Account | null;
  rows: Array<{
    id: string;
    entryCode: string;
    entryDate: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totals: {
    debit: number;
    credit: number;
    balance: number;
  } | null;
}
