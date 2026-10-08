import { api } from '@/services/api';

export type ARBucket = 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'OVER_90';
export interface ARInvoiceRow {
  id: string; code: string; invoiceNumber: string;
  invoiceDate: string; dueDate: string | null;
  totalAmount: number; receivedAmount: number; remaining: number;
  daysOverdue: number; bucket: ARBucket; status: string;
  projectId: string | null; projectCode: string | null;
}
export interface ARCustomerRow {
  customerId: string; customerName: string;
  totalRemaining: number;
  bucket: { CURRENT: number; D1_30: number; D31_60: number; D61_90: number; OVER_90: number };
  invoices: ARInvoiceRow[];
}
export interface ARAgingDetailReport {
  asOf: string;
  totals: { current: number; d1_30: number; d31_60: number; d61_90: number; over90: number; total: number };
  customers: ARCustomerRow[];
}
export const arAgingDetailApi = {
  get: async (asOf?: string) => {
    const { data } = await api.get<ARAgingDetailReport>('/reports/ar-aging-detail', { params: { asOf } });
    return data;
  },
};