import { api } from '@/services/api';

export interface FailedForwarding {
  id: string;
  reportId: string;
  reportCode: string | null;
  reportDate: string | null;
  projectId: string | null;
  sectionType: string;
  sectionStatus: string | null;
  rowNumber: number;
  targetType: string;
  status: string;
  errorMessage: string | null;
  updatedAt: string;
}

export interface RetryResult {
  ok: boolean;
  targetId: string | null;
  targetCode: string | null;
  targetModel: string | null;
}

export const forwardingsApi = {
  list: async (limit = 100): Promise<FailedForwarding[]> => {
    const { data } = await api.get('/site-ops/daily-reports/forwardings/failed', { params: { limit } });
    return data;
  },
  retry: async (id: string): Promise<RetryResult> => {
    const { data } = await api.post('/site-ops/daily-reports/forwardings/' + id + '/retry');
    return data;
  },
};
