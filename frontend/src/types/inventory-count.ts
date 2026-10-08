export type InvCountStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED' | 'CANCELLED';
export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export const INV_COUNT_STATUS_LABELS: Record<InvCountStatus, string> = {
  DRAFT: 'پیش‌نویس',
  CONFIRMED: 'تأییدشده',
  POSTED: 'ثبت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const INV_COUNT_STATUS_COLORS: Record<InvCountStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-amber-50 text-amber-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'پیش‌نویس',
  IN_TRANSIT: 'در راه',
  RECEIVED: 'دریافت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  IN_TRANSIT: 'bg-amber-50 text-amber-700',
  RECEIVED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface InventoryCountItem {
  id?: string;
  itemId: string;
  item?: { id: string; code: string; name: string; unit: string };
  rowNumber?: number;
  systemQty: string | number;
  physicalQty: string | number;
  difference: string | number;
  unitCost: string | number;
  differenceCost: string | number;
  notes?: string | null;
}

export interface InventoryCount {
  id: string;
  code: string;
  warehouseId: string;
  warehouse?: { id: string; code: string; name: string };
  countDate: string;
  status: InvCountStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  postedAt?: string | null;
  notes?: string | null;
  items?: InventoryCountItem[];
  createdAt: string;
  _count?: { items: number };
}

export interface WarehouseTransferItem {
  id?: string;
  itemId: string;
  item?: { id: string; code: string; name: string; unit: string };
  rowNumber?: number;
  quantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  notes?: string | null;
}

export interface WarehouseTransfer {
  id: string;
  code: string;
  fromWarehouseId: string;
  fromWarehouse?: { id: string; code: string; name: string };
  toWarehouseId: string;
  toWarehouse?: { id: string; code: string; name: string };
  projectId?: string | null;
  transferDate: string;
  status: TransferStatus;
  driverName?: string | null;
  vehiclePlate?: string | null;
  notes?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  totalValue: string | number;
  items?: WarehouseTransferItem[];
  createdAt: string;
  _count?: { items: number };
}
