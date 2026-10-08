export interface VATRow {
  id: string;
  type: 'PURCHASE' | 'SALE';
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  partyNationalId?: string | null;
  projectName?: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export interface VATReport {
  period: { from: string; to: string };
  summary: {
    inputVAT: number;
    outputVAT: number;
    netVAT: number;
    payable: number;
    receivable: number;
    purchaseCount: number;
    salesCount: number;
  };
  purchases: VATRow[];
  sales: VATRow[];
}

export interface PayrollTaxRow {
  id: string;
  employeeCode: string;
  employeeName: string;
  nationalId?: string | null;
  insuranceNumber?: string | null;
  maritalStatus?: string | null;
  childrenCount?: number | null;
  workDays: number;
  grossSalary: number;
  baseSalary: number;
  housingAllow: number;
  foodAllow: number;
  childAllow: number;
  overtimeAmount: number;
  bonusAmount: number;
  insuranceAmount: number;
  taxPercent: number;
  taxAmount: number;
  netSalary: number;
  projectName?: string | null;
  periodTitle?: string | null;
}

export interface PayrollTaxReport {
  period: { year: number; month: number };
  rows: PayrollTaxRow[];
  totals: {
    grossSalary: number;
    insuranceAmount: number;
    taxAmount: number;
    netSalary: number;
    employees: number;
  };
}

export interface InsuranceRow {
  id: string;
  insuranceNumber: string;
  employeeCode: string;
  employeeName: string;
  nationalId?: string | null;
  maritalStatus?: string | null;
  childrenCount: number;
  insuranceStart?: string | null;
  workDays: number;
  grossSalary: number;
  employeeShare: number;
  employerShare: number;
  totalInsurance: number;
  projectName?: string | null;
}

export interface InsuranceReport {
  period: { year: number; month: number };
  rows: InsuranceRow[];
  totals: {
    grossSalary: number;
    employeeShare: number;
    employerShare: number;
    totalInsurance: number;
    employees: number;
  };
}
