export type ProjectType = 'MAIN_CONTRACTOR' | 'COST_PLUS' | 'SELF_OWNER' | 'PARTNERSHIP' | 'RENOVATION';
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED';
export type ProjectUsage = 'RESIDENTIAL' | 'COMMERCIAL' | 'OFFICE' | 'HOSPITAL' | 'INDUSTRIAL' | 'CIVIL' | 'OTHER';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'در حال برنامه‌ریزی',
  IN_PROGRESS: 'در حال اجرا',
  SUSPENDED: 'متوقف',
  COMPLETED: 'تمام‌شده',
  CANCELLED: 'لغو شده',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  MAIN_CONTRACTOR: 'پیمانکار ارشد',
  COST_PLUS: 'مدیریت پیمان (Cost-Plus)',
  SELF_OWNER: 'پروژه خودمالک',
  PARTNERSHIP: 'مشارکت در ساخت',
  RENOVATION: 'بازسازی و نوسازی',
};

export const PROJECT_USAGE_LABELS: Record<ProjectUsage, string> = {
  RESIDENTIAL: 'مسکونی',
  COMMERCIAL: 'تجاری',
  OFFICE: 'اداری',
  HOSPITAL: 'بیمارستانی',
  INDUSTRIAL: 'صنعتی',
  CIVIL: 'عمرانی',
  OTHER: 'سایر',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export interface Partner {
  id: string;
  code: string;
  name: string;
  type: string;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  usage?: ProjectUsage | null;
  client?: Partner | null;
  consultant?: Partner | null;
  addressProvince?: string | null;
  addressCity?: string | null;
  addressFull?: string | null;
  totalArea?: number | string | null;
  floorsCount?: number | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { contracts: number; wbsItems: number };
}

export type ContractType = 'LUMP_SUM' | 'UNIT_PRICE' | 'PERCENTAGE' | 'TRUST';
export type ContractStatus = 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'TERMINATED';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  LUMP_SUM: 'مقطوع',
  UNIT_PRICE: 'متری',
  PERCENTAGE: 'درصدی',
  TRUST: 'امانی',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته',
  TERMINATED: 'فسخ‌شده',
};

export interface Contract {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  type: ContractType;
  status: ContractStatus;
  baseAmount: string;
  coefficient: string;
  signDate?: string | null;
  durationValue?: number | null;
  durationUnit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  paymentTerms?: string | null;
  prepaymentPercent?: string | null;
  prepaymentAmount?: string | null;
  prepaymentDepreciationPercent?: string | null;
  insurancePercent: string;
  taxPercent: string;
  retentionPercent: string;
  otherDeductions?: { name: string; percent: number }[] | null;
  description?: string | null;
  createdAt: string;
}

export type WbsLevel = 'PHASE' | 'WORK_PACKAGE' | 'ACTIVITY' | 'SUB_ACTIVITY';
export type WbsUnit = 'SQUARE_METER' | 'CUBIC_METER' | 'LINEAR_METER' | 'TON' | 'KILOGRAM' | 'NUMBER' | 'SERVICE' | 'LUMP';

export const WBS_LEVEL_LABELS: Record<WbsLevel, string> = {
  PHASE: 'فاز',
  WORK_PACKAGE: 'بسته کاری',
  ACTIVITY: 'فعالیت',
  SUB_ACTIVITY: 'زیرفعالیت',
};

export const WBS_UNIT_LABELS: Record<WbsUnit, string> = {
  SQUARE_METER: 'مترمربع',
  CUBIC_METER: 'مترمکعب',
  LINEAR_METER: 'مترطول',
  TON: 'تن',
  KILOGRAM: 'کیلوگرم',
  NUMBER: 'عدد',
  SERVICE: 'سرویس',
  LUMP: 'مقطوع',
};

export interface WbsItem {
  id: string;
  projectId: string;
  parentId?: string | null;
  code: string;
  title: string;
  level: WbsLevel;
  unit?: WbsUnit | null;
  quantity?: string | null;
  unitPrice?: string | null;
  totalPrice?: string | null;
  weight?: string | null;
  sortOrder: number;
  description?: string | null;
  children?: WbsItem[];
}