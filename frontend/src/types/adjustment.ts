export type AdjStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED' | 'CANCELLED';

export const ADJ_STATUS_LABELS: Record<AdjStatus, string> = {
  DRAFT: 'پیش‌نویس',
  CONFIRMED: 'تأییدشده',
  POSTED: 'ثبت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const ADJ_STATUS_COLORS: Record<AdjStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-amber-50 text-amber-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface AdjustmentIndex {
  id: string;
  code: string;
  year: number;
  month: number;
  category: string;
  indexValue: string | number;
  baseYear: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdjustmentCalculation {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  contractId?: string | null;
  statementId?: string | null;
  periodFrom: string;
  periodTo: string;
  category: string;
  baseAmount: string | number;
  baseIndex: string | number;
  currentIndex: string | number;
  coefficient: string | number;
  adjustedAmount: string | number;
  status: AdjStatus;
  journalEntry?: { id: string; code: string; status?: string } | null;
  notes?: string | null;
  createdAt: string;
}

export interface MaterialPriceDiff {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  contractId?: string | null;
  statementId?: string | null;
  materialType: string;
  unit?: string | null;
  quantity: string | number;
  basePrice: string | number;
  actualPrice: string | number;
  diffAmount: string | number;
  periodFrom: string;
  periodTo: string;
  status: AdjStatus;
  journalEntry?: { id: string; code: string; status?: string } | null;
  notes?: string | null;
  createdAt: string;
}

export const PERSIAN_MONTHS_ADJ = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
