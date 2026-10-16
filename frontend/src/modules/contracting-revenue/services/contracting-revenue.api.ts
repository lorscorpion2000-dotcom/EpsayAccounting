import { api } from '@/services/api';

export interface RevenueFilters {
  fromDate?: string;
  toDate?: string;
  projectId?: string;
  clientId?: string;
  groupBy?: 'month' | 'quarter';
}

export interface SummaryResponse {
  totalRevenue: number;
  totalNetPayable: number;
  totalPassThrough: number;
  totalCost: number;
  profit: number;
  margin: number;
  statementCount: number;
  projectCount: number;
}

export interface ProjectRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientId: string | null;
  clientName: string | null;
  revenue: number;
  netPayable: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ClientRow {
  clientId: string | null;
  clientName: string;
  revenue: number;
  netPayable: number;
  cost: number;
  profit: number;
  margin: number;
  projectCount: number;
}

export interface PeriodRow {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

function qs(f: RevenueFilters): string {
  const p = new URLSearchParams();
  if (f.fromDate) p.set('fromDate', f.fromDate);
  if (f.toDate) p.set('toDate', f.toDate);
  if (f.projectId) p.set('projectId', f.projectId);
  if (f.clientId) p.set('clientId', f.clientId);
  if (f.groupBy) p.set('groupBy', f.groupBy);
  const s = p.toString();
  return s ? '?' + s : '';
}

export const contractingRevenueApi = {
  summary: (f: RevenueFilters) =>
    api.get<SummaryResponse>('/contracting-revenue/summary' + qs(f)).then(r => r.data),
  byProject: (f: RevenueFilters) =>
    api.get<ProjectRow[]>('/contracting-revenue/by-project' + qs(f)).then(r => r.data),
  byClient: (f: RevenueFilters) =>
    api.get<ClientRow[]>('/contracting-revenue/by-client' + qs(f)).then(r => r.data),
  byPeriod: (f: RevenueFilters) =>
    api.get<PeriodRow[]>('/contracting-revenue/by-period' + qs(f)).then(r => r.data),
  projectsList: () =>
    api.get<ProjectOption[]>('/contracting-revenue/projects-list').then(r => r.data),
  clientsList: () =>
    api.get<ClientOption[]>('/contracting-revenue/clients-list').then(r => r.data),
  exportExcel: async (f: RevenueFilters): Promise<Blob> => {
    const r = await api.get('/contracting-revenue/export.xlsx' + qs(f), { responseType: 'blob' });
    return r.data;
  },
};
