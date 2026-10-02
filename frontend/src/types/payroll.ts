// ===== Enums =====
export type EmployeeType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'DAILY_WAGE' | 'HOURLY';
export type MaritalStatus = 'SINGLE' | 'MARRIED';
export type PayrollPeriodStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CLOSED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'SICK' | 'MISSION' | 'HOLIDAY';
export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'MARRIAGE' | 'BEREAVEMENT' | 'HAJJ';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'SETTLED';
export type StatementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CLOSED';

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  FULL_TIME: 'تمام‌وقت',
  PART_TIME: 'پاره‌وقت',
  CONTRACTOR: 'پیمانکاری',
  DAILY_WAGE: 'روزمزد',
  HOURLY: 'ساعتی',
};

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  SINGLE: 'مجرد',
  MARRIED: 'متأهل',
};

export const PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  DRAFT: 'پیش‌نویس',
  CALCULATED: 'محاسبه‌شده',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CLOSED: 'بسته',
};

export const PERIOD_STATUS_COLORS: Record<PayrollPeriodStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  CALCULATED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غایب',
  LEAVE: 'مرخصی',
  SICK: 'استعلاجی',
  MISSION: 'مأموریت',
  HOLIDAY: 'تعطیل',
};

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  ABSENT: 'bg-red-50 text-red-700',
  LEAVE: 'bg-amber-50 text-amber-700',
  SICK: 'bg-orange-50 text-orange-700',
  MISSION: 'bg-blue-50 text-blue-700',
  HOLIDAY: 'bg-slate-100 text-slate-600',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'استحقاقی',
  SICK: 'استعلاجی',
  UNPAID: 'بدون حقوق',
  MATERNITY: 'زایمان',
  MARRIAGE: 'ازدواج',
  BEREAVEMENT: 'فوت بستگان',
  HAJJ: 'حج',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تاییدشده',
  REJECTED: 'ردشده',
  PAID: 'پرداخت‌شده',
  SETTLED: 'تسویه‌شده',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  REJECTED: 'bg-red-50 text-red-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  SETTLED: 'bg-slate-100 text-slate-700',
};

export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CLOSED: 'بسته',
};

export const STATEMENT_STATUS_COLORS: Record<StatementStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

// ===== Models =====
export interface Employee {
  id: string;
  partnerId: string;
  partner?: { id: string; code: string; name: string; phone?: string; nationalId?: string };
  employeeCode: string;
  employeeType: EmployeeType;
  position?: string | null;
  department?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  baseSalary: string;
  housingAllow: string;
  foodAllow: string;
  childAllow: string;
  otherAllow: string;
  dailyWage?: string | null;
  hourlyWage?: string | null;
  bankAccount?: string | null;
  bankIban?: string | null;
  bankName?: string | null;
  insuranceNumber?: string | null;
  insuranceStart?: string | null;
  hasInsurance: boolean;
  maritalStatus: MaritalStatus;
  childrenCount: number;
  nationalId?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  education?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  _count?: { payrollRecords: number };
}

export interface PayrollPeriod {
  id: string;
  code: string;
  title: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  status: PayrollPeriodStatus;
  totalGross: string;
  totalNet: string;
  totalTax: string;
  totalInsurance: string;
  totalAdvances: string;
  calculatedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  records?: PayrollRecord[];
  createdAt: string;
  _count?: { records: number };
}

export interface PayrollRecord {
  id: string;
  periodId: string;
  employeeId: string;
  employee?: { id: string; code: string; name: string };
  employeeProfile?: Employee;
  rowNumber: number;
  workDays: string;
  overtimeHours: string;
  holidayHours: string;
  absentDays: string;
  leaveDays: string;
  baseSalary: string;
  housingAllow: string;
  foodAllow: string;
  childAllow: string;
  otherAllow: string;
  overtimeAmount: string;
  holidayAmount: string;
  bonusAmount: string;
  grossSalary: string;
  insurancePercent: string;
  insuranceAmount: string;
  taxPercent: string;
  taxAmount: string;
  advanceAmount: string;
  absentDeduction: string;
  otherDeduction: string;
  totalDeductions: string;
  netSalary: string;
  notes?: string | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { id: string; code: string; name: string };
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workHours: string;
  overtimeHours: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface WorkLog {
  id: string;
  employeeId: string;
  employee?: { id: string; code: string; name: string };
  workDate: string;
  projectId?: string | null;
  wbsItemId?: string | null;
  regularHours: string;
  overtimeHours: string;
  holidayHours: string;
  description?: string | null;
  status: AttendanceStatus;
}

export interface LeaveRequest {
  id: string;
  code: string;
  employeeId: string;
  employee?: { id: string; code: string; name: string };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: string;
  reason?: string | null;
  status: RequestStatus;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface AdvanceRequest {
  id: string;
  code: string;
  employeeId: string;
  employee?: { id: string; code: string; name: string };
  requestDate: string;
  amount: string;
  reason?: string | null;
  status: RequestStatus;
  approvedAt?: string | null;
  paidAt?: string | null;
  settledAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface SubcontractorStatementItem {
  id: string;
  statementId: string;
  rowNumber: number;
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  description: string;
  unit?: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
}

export interface SubcontractorStatement {
  id: string;
  code: string;
  contractorId: string;
  contractor?: { id: string; code: string; name: string };
  projectId: string;
  project?: { id: string; code: string; name: string };
  statementNumber: number;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  prepaymentPercent: string;
  prepaymentAmount: string;
  prepaymentDepreciation: string;
  insurancePercent: string;
  insuranceAmount: string;
  taxPercent: string;
  taxAmount: string;
  retentionPercent: string;
  retentionAmount: string;
  otherDeduction: string;
  totalDeduction: string;
  netPayable: string;
  status: StatementStatus;
  approvedAt?: string | null;
  paidAt?: string | null;
  description?: string | null;
  items?: SubcontractorStatementItem[];
  createdAt: string;
  _count?: { items: number };
}
