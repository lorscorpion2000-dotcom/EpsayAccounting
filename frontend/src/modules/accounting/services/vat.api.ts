import { api } from '@/services/api';

export interface VatLine {
  entryId: string;
  entryCode: string;
  entryDate: string;
  description: string;
  counterpartCode: string;
  counterpartName: string;
  taxCode: string;
  taxName: string;
  baseAmount: number;
  vatAmount: number;
  direction: 'SALE' | 'PURCHASE';
}

export interface VatReport {
  from: string;
  to: string;
  sales: VatLine[];
  purchases: VatLine[];
  totals: {
    salesBase: number;
    salesVat: number;
    purchaseBase: number;
    purchaseVat: number;
    netPayable: number;
  };
  byMonth: Array<{ yearMonth: string; salesVat: number; purchaseVat: number; net: number }>;
}

export const vatApi = {
  get: async (from: string, to: string) => {
    const { data } = await api.get<VatReport>('/reports/vat', { params: { from, to } });
    return data;
  },
};