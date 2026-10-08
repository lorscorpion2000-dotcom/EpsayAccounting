export type OverheadMethod = 'PERCENT_CONTRACT' | 'PERCENT_REVENUE' | 'MANUAL';
export type OverheadStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export const OVERHEAD_METHOD_LABELS: Record<OverheadMethod, string> = {
  PERCENT_CONTRACT: 'بر اساس مبلغ قرارداد',
  PERCENT_REVENUE: 'بر اساس درآمد شناسایی‌شده',
  MANUAL: 'دستی (درصد ورودی)',
};

export const OVERHEAD_STATUS_LABELS: Record<OverheadStatus, string> = {
  DRAFT: 'پیش‌نویس',
  POSTED: 'ثبت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const OVERHEAD_STATUS_COLORS: Record<OverheadStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface OverheadItem {
  id?: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  project?: { id: string; code: string; name: string };
  percent: string | number;
  amount: string | number;
  notes?: string | null;
  contractAmount?: number;
  revenueAmount?: number;
}

export interface OverheadAllocation {
  id: string;
  code: string;
  fiscalYearId: string;
  fiscalYear?: { id: string; code: string; name: string };
  periodMonth: string;
  method: OverheadMethod;
  totalAmount: string | number;
  sourceAccountId?: string | null;
  destAccountId?: string | null;
  description?: string | null;
  status: OverheadStatus;
  journalEntryId?: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  postedAt?: string | null;
  items: OverheadItem[];
  createdAt: string;
  _count?: { items: number };
}

export interface CreateOverheadPayload {
  fiscalYearId: string;
  periodMonth: string;
  method: OverheadMethod;
  totalAmount: number;
  sourceAccountId?: string;
  destAccountId?: string;
  description?: string;
  items?: { projectId: string; percent: number; notes?: string }[];
}

export interface PreviewResult {
  items: OverheadItem[];
  totalAmount: number;
  method: OverheadMethod;
}
