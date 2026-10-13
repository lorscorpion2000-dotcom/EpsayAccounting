import { api } from '@/services/api';
import type { DailyReport, SiteOpsStats, SuggestedWorkersResponse } from '@/types/site-ops';

export const siteOpsApi = {
  reports: {
    list: async (params?: { projectId?: string; status?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get<DailyReport[]>('/site-ops/daily-reports', { params });
      return data;
    },
    stats: async (projectId?: string) => {
      const { data } = await api.get<SiteOpsStats>('/site-ops/daily-reports/stats', {
        params: projectId ? { projectId } : {},
      });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<DailyReport>('/site-ops/daily-reports/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<DailyReport>('/site-ops/daily-reports', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<DailyReport>('/site-ops/daily-reports/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/site-ops/daily-reports/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/site-ops/daily-reports/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/site-ops/daily-reports/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/site-ops/daily-reports/' + id + '/reject', { reason });
      return data;
    },
    suggestedWorkers: async (year: number, month: number, projectId?: string) => {
      const { data } = await api.get<SuggestedWorkersResponse>(
        '/site-ops/daily-reports/suggested-workers',
        { params: { year, month, ...(projectId ? { projectId } : {}) } },
      );
      return data;
    },
  },
};
