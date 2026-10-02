export type PettyCashTxType = 'FUNDING' | 'EXPENSE' | 'SETTLEMENT' | 'ADJUSTMENT';
export type PettyCashTxStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type PettyCashRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export const TX_TYPE_LABELS: Record<PettyCashTxType, string> = {
  FUNDING: 'شارژ تنخواه',
  EXPENSE: 'هزینه',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'تعدیل',
};

export const TX_TYPE_COLORS: Record<PettyCashTxType, string> = {
  FUNDING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPENSE: 'bg-rose-50 text-rose-700 border-rose-200',
  SETTLEMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  ADJUSTMENT: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const TX_STATUS_LABELS: Record<PettyCashTxStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تایید شده',
  REJECTED: 'رد شده',
};

export const TX_STATUS_COLORS: Record<PettyCashTxStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export const REQUEST_STATUS_LABELS: Record<PettyCashRequestStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تایید شده',
  REJECTED: 'رد شده',
  PAID: 'پرداخت شده',
};

export const REQUEST_STATUS_COLORS: Record<PettyCashRequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  REJECTED: 'bg-red-50 text-red-700',
  PAID: 'bg-emerald-50 text-emerald-700',
};

export interface PettyCashAccount {
  id: string;
  code: string;
  name: string;
  holderId?: string;
  employeeId?: string;
  holder?: { id: string; fullName: string; username?: string; mobile?: string };
  employee?: { id: string; fullName: string; code: string };
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  ceilingPerTx: string | number;
  weeklyLimit: string | number;
  balance: string | number;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number; requests: number };
}

export interface PettyCashTransaction {
  id: string;
  accountId: string;
  account?: { id: string; code: string; name: string };
  code: string;
  type: PettyCashTxType;
  status: PettyCashTxStatus;
  txDate: string;
  amount: string | number;
  description: string;
  recipient?: string | null;
  category?: string | null;
  invoiceNumber?: string | null;
  invoiceImage?: string | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  wbsItemId?: string | null;
  partnerId?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashRequest {
  id: string;
  accountId: string;
  account?: { id: string; code: string; name: string };
  code: string;
  requestDate: string;
  amount: string | number;
  currentBalance: string | number;
  reason: string;
  iban?: string | null;
  status: PettyCashRequestStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
