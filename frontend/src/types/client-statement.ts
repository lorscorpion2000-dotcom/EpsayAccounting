export type CSCategory = 'MATERIAL' | 'LABOR' | 'MISC' | 'TRANSPORT' | 'EQUIPMENT';
export type CSStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const CS_CATEGORY_LABELS: Record<CSCategory, string> = {
  MATERIAL: 'خرید مصالح',
  LABOR: 'اجرت و دستمزد',
  MISC: 'هزینه‌های متفرقه',
  TRANSPORT: 'کرایه حمل',
  EQUIPMENT: 'ماشین آلات',
};

export const CS_CATEGORY_ORDER: CSCategory[] = [
  'MATERIAL', 'LABOR', 'MISC', 'TRANSPORT', 'EQUIPMENT',
];

export const CS_STATUS_LABELS: Record<CSStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const CS_STATUS_COLORS: Record<CSStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface CSItem {
  id?: string;
  category: CSCategory;
  rowNumber?: number;
  priceListCode?: string | null;
  description: string;
  unit?: string | null;
  unitPrice: string | number;
  quantity: string | number;
  totalPrice?: string | number;
  itemDate?: string | null;
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  notes?: string | null;
}

export interface ClientStatement {
  id: string;
  code: string;
  projectId: string;
  project?: {
    id: string;
    code: string;
    name: string;
    addressFull?: string | null;
    addressCity?: string | null;
    addressProvince?: string | null;
    client?: { id: string; name: string; nationalId?: string | null } | null;
    consultant?: { id: string; name: string } | null;
  };
  contractId?: string | null;
  statementNumber: number;
  periodStart: string;
  periodEnd: string;
  coefficient: string | number;
  contractorSharePercent: string | number;
  prepaymentDeductionPercent: string | number;
  subtotalMaterial: string | number;
  subtotalLabor: string | number;
  subtotalMisc: string | number;
  subtotalTransport: string | number;
  subtotalEquipment: string | number;
  totalBeforeCoefficient: string | number;
  totalAfterCoefficient: string | number;
  contractorShareAmount: string | number;
  prepaymentDeductionAmount: string | number;
  netPayable: string | number;
  status: CSStatus;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectedReason?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  description?: string | null;
  items?: CSItem[];
  createdAt: string;
  contract?: {
    id: string;
    code: string;
    taxPercent: string | number;
    baseAmount: string | number;
    prepaymentAmount: string | number | null;
    prepaymentDepreciationPercent: string | number | null;
  } | null;
  previousStatements?: {
    id: string;
    code: string;
    statementNumber: number;
    netPayable: string | number;
    paidAt?: string | null;
    periodStart: string;
    periodEnd: string;
  }[];
  totalPreviousPaid?: number;
  _count?: { items: number };
}

export interface CreateCSPayload {
  projectId: string;
  contractId?: string;
  statementNumber?: number;
  periodStart: string;
  periodEnd: string;
  coefficient?: number;
  contractorSharePercent?: number;
  prepaymentDeductionPercent?: number;
  description?: string;
  items?: {
    category: CSCategory;
    priceListCode?: string;
    description: string;
    unit?: string;
    unitPrice: number;
    quantity?: number;
    itemDate?: string;
    wbsItemId?: string;
    notes?: string;
  }[];
}
