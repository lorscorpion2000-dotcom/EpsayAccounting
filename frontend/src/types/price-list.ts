export type PriceListStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WbsUnit =
  | 'SQUARE_METER' | 'CUBIC_METER' | 'LINEAR_METER'
  | 'TON' | 'KILOGRAM' | 'NUMBER' | 'SERVICE' | 'LUMP';

export const PRICE_LIST_STATUS_LABELS: Record<PriceListStatus, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشرشده',
  ARCHIVED: 'بایگانی‌شده',
};

export const PRICE_LIST_STATUS_COLORS: Record<PriceListStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-amber-50 text-amber-700',
};

export const WBS_UNIT_LABELS: Record<WbsUnit, string> = {
  SQUARE_METER: 'متر مربع',
  CUBIC_METER: 'متر مکعب',
  LINEAR_METER: 'متر طول',
  TON: 'تن',
  KILOGRAM: 'کیلوگرم',
  NUMBER: 'عدد',
  SERVICE: 'سرویس',
  LUMP: 'مقطوع',
};

export interface PriceList {
  id: string;
  code: string;
  title: string;
  year: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: PriceListStatus;
  description?: string | null;
  createdAt: string;
  _count?: { items: number };
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  code: string;
  description: string;
  unit: WbsUnit;
  basePrice: string | number;
  category?: string | null;
  chapter?: string | null;
  notes?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreatePriceListPayload {
  title: string;
  year: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status?: PriceListStatus;
  description?: string;
}

export interface CreatePriceListItemPayload {
  code: string;
  description: string;
  unit: WbsUnit;
  basePrice: number;
  category?: string;
  chapter?: string;
  notes?: string;
  sortOrder?: number;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; code: string; reason: string }[];
  priceListCode: string;
}

export interface BoqStats {
  lists: number;
  published: number;
  items: number;
  linked: number;
}