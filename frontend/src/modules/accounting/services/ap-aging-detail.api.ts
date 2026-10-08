import { api } from '@/services/api';

export type APBucket = 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'OVER_90';

export interface APInvoiceRow {
  id: string;
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  daysOverdue: number;
  bucket: APBucket;
  status: string;
  projectId: string | null;
  projectCode: string | null;
}

export interface APSupplierRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  totalRemaining: number;
  bucket: { CURRENT: number; D1_30: number; D31_60: number; D61_90: number; OVER_90: number };
  invoices: APInvoiceRow[];
}

export interface APAgingDetailReport {
  asOf: string;
  totals: {
    current: number;
    d1_30: number;
    d31_60: number;
    d61_90: number;
    over90: number;
    total: number;
  };
  suppliers: APSupplierRow[];
}

export const apAgingDetailApi = {
  get: async (asOf?: string) => {
    const { data } = await api.get<APAgingDetailReport>('/reports/ap-aging-detail', {
      params: { asOf },
    });
    return data;
  },
};