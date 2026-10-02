// ===== PR =====
export type PRStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'IN_RFQ' | 'RFQ_COMPLETED' | 'ORDERED' | 'CLOSED' | 'CANCELLED';
export type PRPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type PRItemUnit = 'NUMBER' | 'KILOGRAM' | 'TON' | 'METER' | 'SQUARE_METER' | 'CUBIC_METER' | 'LITER' | 'PACKAGE' | 'SERVICE' | 'LUMP_SUM';
export type POStatus = 'DRAFT' | 'APPROVED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export const PR_STATUS_LABELS: Record<PRStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  REJECTED: 'ردشده',
  IN_RFQ: 'در استعلام',
  RFQ_COMPLETED: 'استعلام تمام‌شده',
  ORDERED: 'سفارش‌شده',
  CLOSED: 'بسته‌شده',
  CANCELLED: 'لغو‌شده',
};

export const PR_STATUS_COLORS: Record<PRStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  IN_RFQ: 'bg-blue-50 text-blue-700',
  RFQ_COMPLETED: 'bg-brand-50 text-brand-700',
  ORDERED: 'bg-violet-50 text-violet-700',
  CLOSED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const PR_PRIORITY_LABELS: Record<PRPriority, string> = {
  LOW: 'کم',
  NORMAL: 'معمولی',
  HIGH: 'زیاد',
  URGENT: 'فوری',
};

export const PR_PRIORITY_COLORS: Record<PRPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  NORMAL: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

export const PR_UNIT_LABELS: Record<PRItemUnit, string> = {
  NUMBER: 'عدد',
  KILOGRAM: 'کیلوگرم',
  TON: 'تن',
  METER: 'متر',
  SQUARE_METER: 'مترمربع',
  CUBIC_METER: 'مترمکعب',
  LITER: 'لیتر',
  PACKAGE: 'بسته',
  SERVICE: 'سرویس',
  LUMP_SUM: 'مقطوع',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'پیش‌نویس',
  APPROVED: 'تاییدشده',
  SENT: 'ارسال‌شده',
  PARTIALLY_RECEIVED: 'تحویل جزئی',
  RECEIVED: 'تحویل کامل',
  CANCELLED: 'لغو‌شده',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  SENT: 'bg-blue-50 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700',
  RECEIVED: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface PRItem {
  id: string;
  rowNumber: number;
  description: string;
  quantity: string | number;
  unit: PRItemUnit;
  priority: PRPriority;
  notes?: string | null;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  requestDate: string;
  requiredDate?: string | null;
  requesterId: string;
  requester?: { id: string; fullName: string };
  approvedBy?: { id: string; fullName: string } | null;
  department?: string | null;
  deliveryLocation?: string | null;
  reason?: string | null;
  status: PRStatus;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  items?: PRItem[];
  rfqs?: any[];
  createdAt: string;
  _count?: { items: number; rfqs: number };
}

export interface RFQResponseItem {
  id: string;
  prItemId: string;
  prItem?: PRItem;
  unitPrice: string | number;
  totalPrice: string | number;
  deliveryDays?: number | null;
  notes?: string | null;
}

export interface RFQResponse {
  id: string;
  supplierId: string;
  supplier?: { id: string; code: string; name: string; phone?: string };
  respondedAt?: string | null;
  isSelected: boolean;
  selectedAt?: string | null;
  selectionNotes?: string | null;
  totalAmount: string | number;
  items: RFQResponseItem[];
}

export interface RFQ {
  id: string;
  code: string;
  prId: string;
  pr?: PurchaseRequest;
  rfqDate: string;
  validUntil?: string | null;
  minSuppliers: number;
  status: string;
  notes?: string | null;
  responses?: RFQResponse[];
  _count?: { responses: number };
}

export interface POItem {
  id: string;
  rowNumber: number;
  description: string;
  quantity: string | number;
  unit: PRItemUnit;
  unitPrice: string | number;
  totalPrice: string | number;
  notes?: string | null;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  prId?: string | null;
  pr?: { id: string; code: string } | null;
  projectId: string;
  project?: { id: string; code: string; name: string };
  supplierId: string;
  supplier?: { id: string; code: string; name: string; phone?: string; address?: string };
  poDate: string;
  deliveryDate?: string | null;
  subtotal: string | number;
  taxPercent: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  status: POStatus;
  notes?: string | null;
  items?: POItem[];
  createdAt: string;
}
