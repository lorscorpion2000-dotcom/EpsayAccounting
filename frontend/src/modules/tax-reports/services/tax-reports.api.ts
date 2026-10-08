import { api } from '@/services/api';
import type { VATReport, PayrollTaxReport, InsuranceReport } from '@/types/tax-reports';

export const taxReportsApi = {
  vat: (params: { fromDate: string; toDate: string; projectId?: string; partnerId?: string }) =>
    api.get<VATReport>('/tax-reports/vat', { params }).then((r) => r.data),

  payrollTax: (params: { year: number; month: number; projectId?: string }) =>
    api.get<PayrollTaxReport>('/tax-reports/payroll-tax', { params }).then((r) => r.data),

  insurance: (params: { year: number; month: number; projectId?: string }) =>
    api.get<InsuranceReport>('/tax-reports/insurance', { params }).then((r) => r.data),
};
