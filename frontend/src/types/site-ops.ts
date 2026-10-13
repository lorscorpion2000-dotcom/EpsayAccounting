export type WeatherCondition = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'WINDY' | 'STORM';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'SICK' | 'HOLIDAY';
export type EquipmentStatus = 'ACTIVE' | 'IDLE' | 'BROKEN' | 'MAINTENANCE';
export type RequestType = 'PURCHASE' | 'PETTY_CASH' | 'MANPOWER' | 'TECHNICAL' | 'REPAIR';
export type EventType = 'STOP' | 'INCIDENT' | 'VISIT' | 'INSTRUCTION' | 'OTHER';

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: 'آفتابی',
  CLOUDY: 'ابری',
  RAINY: 'بارانی',
  SNOWY: 'برفی',
  WINDY: 'بادی',
  STORM: 'طوفانی',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  REJECTED: 'ردشده',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غایب',
  LEAVE: 'مرخصی',
  SICK: 'استعلاجی',
  HOLIDAY: 'تعطیل',
};

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  ABSENT: 'bg-red-50 text-red-700',
  LEAVE: 'bg-amber-50 text-amber-700',
  SICK: 'bg-orange-50 text-orange-700',
  HOLIDAY: 'bg-slate-100 text-slate-600',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: 'فعال',
  IDLE: 'بی‌کار',
  BROKEN: 'خراب',
  MAINTENANCE: 'تعمیر',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  IDLE: 'bg-slate-100 text-slate-600',
  BROKEN: 'bg-red-50 text-red-700',
  MAINTENANCE: 'bg-amber-50 text-amber-700',
};


export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  PURCHASE: 'خرید کالا',
  PETTY_CASH: 'تنخواه',
  MANPOWER: 'تأمین نیرو',
  TECHNICAL: 'فنی',
  REPAIR: 'تعمیر',
};

export const REQUEST_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'کم',
  NORMAL: 'معمولی',
  HIGH: 'بالا',
  URGENT: 'فوری',
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تاییدشده',
  REJECTED: 'رد‌شده',
  DONE: 'انجام‌شده',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  STOP: 'توقف کار',
  INCIDENT: 'حادثه',
  VISIT: 'بازدید',
  INSTRUCTION: 'دستورکار',
  OTHER: 'سایر',
};

export const EVENT_SEVERITY_LABELS: Record<string, string> = {
  LOW: 'کم',
  MEDIUM: 'متوسط',
  HIGH: 'شدید',
};

// ═══════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════
export interface DailyReportWorker {
  id?: string;
  rowNumber?: number;
  teamName: string;
  foreman?: string | null;
  workerCount: number;
  workHours: string | number;
  overtime: string | number;
  status: AttendanceStatus;
  wbsItemId?: string | null;
  description?: string | null;
}

export interface DailyReportEquipment {
  id?: string;
  rowNumber?: number;
  equipmentId?: string | null;
  name: string;
  plateNumber?: string | null;
  operator?: string | null;
  hoursWorked: string | number;
  status: EquipmentStatus;
  wbsItemId?: string | null;
  fuelLiters?: string | number | null;
  stopReason?: string | null;
  description?: string | null;
}

export interface DailyReportMaterial {
  id?: string;
  rowNumber?: number;
  itemName: string;
  unit?: string | null;
  quantity: string | number;
  supplier?: string | null;
  vehiclePlate?: string | null;
  billNumber?: string | null;
  movementType?: string | null;
  qcResult?: string | null;
  exitType?: string | null;
  exitDest?: string | null;
  description?: string | null;
}

export interface DailyReportProgress {
  id?: string;
  rowNumber?: number;
  wbsItemId?: string | null;
  description: string;
  progressPct: string | number;
  quantity?: string | number | null;
  location?: string | null;
  notes?: string | null;
}


export interface DailyReportRequest {
  id?: string;
  rowNumber?: number;
  requestType: RequestType;
  title: string;
  description?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  priority?: string | null;
  requiredDate?: string | null;
  wbsItemId?: string | null;
  amount?: string | number | null;
  status?: string;
  managerNote?: string | null;
}

export interface DailyReportEvent {
  id?: string;
  rowNumber?: number;
  eventType: EventType;
  title: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationHrs?: string | number | null;
  severity?: string | null;
  actorName?: string | null;
}

export interface DailyReport {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  reportDate: string;
  weather?: WeatherCondition | null;
  tempMin?: number | null;
  tempMax?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  operations?: string | null;
  issues?: string | null;
  incidents?: string | null;
  status: ReportStatus;
  rejectedReason?: string | null;
  createdBy?: { id: string; fullName: string } | null;
  workers?: DailyReportWorker[];
  equipments?: DailyReportEquipment[];
  materials?: DailyReportMaterial[];
  progresses?: DailyReportProgress[];
  requests?: DailyReportRequest[];
  events?: DailyReportEvent[];
  createdAt: string;
  _count?: {
    workers: number; equipments: number; materials: number;
    progresses: number; requests: number; events: number;
  };
}

export interface SiteOpsStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
}
