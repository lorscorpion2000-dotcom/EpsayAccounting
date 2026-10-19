// ===== Enums =====
export type ItemType = 'CONSUMABLE' | 'CAPITAL' | 'MATERIAL';
export type ItemUnit = 'NUMBER' | 'KILOGRAM' | 'TON' | 'METER' | 'SQUARE_METER' | 'CUBIC_METER' | 'LITER' | 'PACKAGE' | 'LUMP_SUM';
export type WarehouseType = 'MAIN' | 'SITE' | 'TEMPORARY';
export type MovementType = 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN';
export type ReceiptStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';
export type IssueStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'CANCELLED';

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  CONSUMABLE: 'کالای مصرفی',
  CAPITAL: 'کالای سرمایه‌ای',
  MATERIAL: 'مصالح',
};

export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  CONSUMABLE: 'bg-blue-50 text-blue-700 border-blue-200',
  CAPITAL: 'bg-purple-50 text-purple-700 border-purple-200',
  MATERIAL: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const ITEM_UNIT_LABELS: Record<ItemUnit, string> = {
  NUMBER: 'عدد',
  KILOGRAM: 'کیلوگرم',
  TON: 'تن',
  METER: 'متر',
  SQUARE_METER: 'مترمربع',
  CUBIC_METER: 'مترمکعب',
  LITER: 'لیتر',
  PACKAGE: 'بسته',
  LUMP_SUM: 'مقطوع',
};

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  MAIN: 'مرکزی',
  SITE: 'کارگاهی',
  TEMPORARY: 'موقت',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  IN: 'ورود',
  OUT: 'خروج',
  TRANSFER_IN: 'انتقال ورودی',
  TRANSFER_OUT: 'انتقال خروجی',
  ADJUSTMENT: 'تعدیل',
  RETURN: 'برگشت',
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  IN: 'bg-emerald-50 text-emerald-700',
  OUT: 'bg-rose-50 text-rose-700',
  TRANSFER_IN: 'bg-blue-50 text-blue-700',
  TRANSFER_OUT: 'bg-cyan-50 text-cyan-700',
  ADJUSTMENT: 'bg-amber-50 text-amber-700',
  RETURN: 'bg-brand-50 text-brand-700',
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  DRAFT: 'پیش‌نویس',
  POSTED: 'ثبت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const RECEIPT_STATUS_COLORS: Record<ReceiptStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  POSTED: 'ثبت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

// ===== Models =====
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  location?: string | null;
  managerId?: string | null;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  _count?: { stocks: number; receipts: number; issues: number };
}

export interface UnitRef {
  id: string;
  name: string;
  symbol?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ItemCategory {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  parentId?: string | null;
  parent?: ItemCategory | null;
  children?: ItemCategory[];
  description?: string | null;
  _count?: { items: number; children: number };
}

export interface Item {
  id: string;
  code: string;
  name: string;
  type: ItemType;
  unit?: ItemUnit;
  unitId?: string | null;
  unitObj?: UnitRef | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  minStock?: string | null;
  maxStock?: string | null;
  reorderPoint?: string | null;
  description?: string | null;
  isActive: boolean;
  totalStock?: number;
  totalValue?: number;
  stocks?: Stock[];
  createdAt: string;
  _count?: { stocks: number };
}

export interface Stock {
  id: string;
  warehouseId: string;
  warehouse?: Warehouse;
  itemId: string;
  item?: Item;
  quantity: string;
  avgCost: string;
  totalValue: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  warehouse?: { id: string; code: string; name: string };
  itemId: string;
  item?: {
    id: string;
    code: string;
    name: string;
    unit?: ItemUnit;
    unitId?: string | null;
    unitObj?: UnitRef | null;
  };
  type: MovementType;
  quantity: string;
  unitCost: string;
  totalCost: string;
  balanceAfter: string;
  referenceType?: string | null;
  referenceCode?: string | null;
  projectId?: string | null;
  description?: string | null;
  movementDate: string;
  createdAt: string;
}

export interface ReceiptItem {
  id: string;
  itemId: string;
  item?: Item;
  rowNumber: number;
  quantity: string;
  unitCost: string;
  totalCost: string;
  notes?: string | null;
}

export interface GoodsReceipt {
  id: string;
  code: string;
  warehouseId: string;
  warehouse?: Warehouse;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  supplierId?: string | null;
  supplier?: { id: string; code: string; name: string } | null;
  receiptDate: string;
  reference?: string | null;
  driverName?: string | null;
  vehiclePlate?: string | null;
  notes?: string | null;
  status: ReceiptStatus;
  totalValue: string;
  items?: ReceiptItem[];
  createdAt: string;
  _count?: { items: number };
}

export interface IssueItem {
  id: string;
  itemId: string;
  item?: Item;
  rowNumber: number;
  quantity: string;
  unitCost: string;
  totalCost: string;
  notes?: string | null;
}

export interface GoodsIssue {
  id: string;
  code: string;
  warehouseId: string;
  warehouse?: Warehouse;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  recipientId?: string | null;
  recipient?: { id: string; code: string; name: string } | null;
  issueDate: string;
  usageLocation?: string | null;
  notes?: string | null;
  status: IssueStatus;
  rejectedReason?: string | null;
  totalValue: string;
  items?: IssueItem[];
  createdAt: string;
  _count?: { items: number };
}

export interface KardexRow {
  id: string;
  date: string;
  type: MovementType;
  warehouse: { id: string; code: string; name: string };
  reference?: string;
  description?: string;
  inQty: number;
  outQty: number;
  balance: number;
  unitCost: number;
  totalCost: number;
}

export interface KardexResult {
  item: Item | null;
  rows: KardexRow[];
  totals: { inQty: number; outQty: number; inValue: number; outValue: number } | null;
}

export interface WarehouseStats {
  warehouses: number;
  items: number;
  lowStockCount: number;
  totalValue: number;
}
