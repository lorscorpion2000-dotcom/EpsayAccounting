import { api } from '@/services/api';

export type CashFlowSection = 'OPERATING' | 'INVESTING' | 'FINANCING';

export interface CashFlowRow {
  counterpartId: string;
  counterpartCode: string;
  counterpartName: string;
  section: CashFlowSection;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
}

export interface SectionTotals {
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowReport {
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  netChange: number;
  cashAccountCodes: string[];
  sections: {
    OPERATING: CashFlowRow[];
    INVESTING: CashFlowRow[];
    FINANCING: CashFlowRow[];
  };
  sectionTotals: {
    OPERATING: SectionTotals;
    INVESTING: SectionTotals;
    FINANCING: SectionTotals;
  };
}

export const cashFlowApi = {
  get: async (from: string, to: string) => {
    const { data } = await api.get<CashFlowReport>('/reports/cash-flow', {
      params: { from, to },
    });
    return data;
  },
};