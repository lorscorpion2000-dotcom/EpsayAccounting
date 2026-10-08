// ═════════════════════════════════════════════
// Enums
// ═════════════════════════════════════════════
export type EquipmentOwnership = 'OWNED' | 'RENTED';
export type EquipmentStatus =
  | 'ACTIVE' | 'IDLE' | 'BROKEN' | 'MAINTENANCE' | 'RETIRED';
export type MaintenanceType =
  | 'PREVENTIVE' | 'REPAIR' | 'OVERHAUL' | 'TIRE' | 'OTHER';
export type EquipmentLogStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED';

// ═════════════════════════════════════════════
// Labels & Colors
// ═════════════════════════════════════════════
export const EQUIPMENT_OWNERSHIP_LABELS: Record<EquipmentOwnership, string> = {
  OWNED: 'ملکی',
  RENTED: 'اجاره‌ای',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: 'فعال',
  IDLE: 'بی‌کار',
  BROKEN: 'خراب',
  MAINTENANCE: 'در تعمیر',
  RETIRED: 'اسقاط',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  IDLE: 'bg-slate-100 text-slate-600',
  BROKEN: 'bg-red-50 text-red-700',
  MAINTENANCE: 'bg-amber-50 text-amber-700',
  RETIRED: 'bg-slate-200 text-slate-500',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'سرویس دوره‌ای',
  REPAIR: 'تعمیر',
  OVERHAUL: 'اورهال',
  TIRE: 'لاستیک',
  OTHER: 'سایر',
};

export const EQUIPMENT_LOG_STATUS_LABELS: Record<EquipmentLogStatus, string> = {
  DRAFT: 'پیش‌نویس',
  CONFIRMED: 'تأییدشده',
  POSTED: 'ثبت‌شده',
};

export const EQUIPMENT_LOG_STATUS_COLORS: Record<EquipmentLogStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-amber-50 text-amber-700',
  POSTED: 'bg-emerald-50 text-emerald-700',
};

// ═════════════════════════════════════════════
// Equipment
// ═════════════════════════════════════════════
export interface Equipment {
  id: string;
  code: string;
  name: string;
  ownership: EquipmentOwnership;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plateNumber?: string | null;
  serialNumber?: string | null;
  hourlyRate?: string | number | null;
  dailyRate?: string | number | null;
  monthlyRate?: string | number | null;
  fuelType?: string | null;
  fuelNormPerHour?: string | number | null;
  ownerId?: string | null;
  owner?: { id: string; code: string; name: string } | null;
  currentProjectId?: string | null;
  currentProject?: { id: string; code: string; name: string } | null;
  status: EquipmentStatus;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { dailyLogs: number; maintenances: number };
}

export interface CreateEquipmentPayload {
  name: string;
  ownership?: EquipmentOwnership;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  serialNumber?: string;
  hourlyRate?: number;
  dailyRate?: number;
  monthlyRate?: number;
  fuelType?: string;
  fuelNormPerHour?: number;
  ownerId?: string;
  currentProjectId?: string;
  status?: EquipmentStatus;
  isActive?: boolean;
  description?: string;
}

// ═════════════════════════════════════════════
// Daily Log
// ═════════════════════════════════════════════
export interface EquipmentDailyLog {
  id: string;
  code: string;
  equipmentId: string;
  equipment?: {
    id: string;
    code: string;
    name: string;
    ownership?: EquipmentOwnership;
    hourlyRate?: string | number | null;
  };
  projectId: string;
  project?: { id: string; code: string; name: string };
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  logDate: string;
  shift?: string | null;
  startMeter?: string | number | null;
  endMeter?: string | number | null;
  workHours: string | number;
  idleHours: string | number;
  stopHours: string | number;
  breakdownHours: string | number;
  fuelLiters: string | number;
  fuelCost: string | number;
  operatorId?: string | null;
  operator?: { id: string; code: string; name: string } | null;
  workLocation?: string | null;
  stopReason?: string | null;
  notes?: string | null;
  computedCost: string | number;
  status: EquipmentLogStatus;
  createdAt: string;
}

export interface CreateDailyLogPayload {
  equipmentId: string;
  projectId: string;
  wbsItemId?: string;
  logDate: string;
  shift?: string;
  startMeter?: number;
  endMeter?: number;
  workHours?: number;
  idleHours?: number;
  stopHours?: number;
  breakdownHours?: number;
  fuelLiters?: number;
  fuelCost?: number;
  operatorId?: string;
  workLocation?: string;
  stopReason?: string;
  notes?: string;
}

// ═════════════════════════════════════════════
// Maintenance
// ═════════════════════════════════════════════
export interface EquipmentMaintenance {
  id: string;
  code: string;
  equipmentId: string;
  equipment?: { id: string; code: string; name: string };
  type: MaintenanceType;
  maintenanceDate: string;
  description: string;
  cost: string | number;
  parts?: any;
  vendor?: string | null;
  invoiceNumber?: string | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  nextServiceDate?: string | null;
  nextServiceHours?: string | number | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateMaintenancePayload {
  equipmentId: string;
  type: MaintenanceType;
  maintenanceDate: string;
  description: string;
  cost: number;
  parts?: any;
  vendor?: string;
  invoiceNumber?: string;
  projectId?: string;
  nextServiceDate?: string;
  nextServiceHours?: number;
  notes?: string;
}

// ═════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════
export interface EquipmentReportByItem {
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  workHours: number;
  idleHours: number;
  stopHours: number;
  breakdownHours: number;
  fuelLiters: number;
  cost: number;
  logCount: number;
}

export interface EquipmentReport {
  summary: {
    totalWorkHours: number;
    totalIdleHours: number;
    totalStopHours: number;
    totalBreakdownHours: number;
    totalFuelLiters: number;
    totalCost: number;
    totalLogs: number;
  };
  byEquipment: EquipmentReportByItem[];
}

// ═════════════════════════════════════════════
// Stats
// ═════════════════════════════════════════════
export interface EquipmentStats {
  total: number;
  active: number;
  idle: number;
  maintenance: number;
  broken: number;
  retired: number;
}