import { api } from '@/services/api';
import type {
  OverheadAllocation, CreateOverheadPayload, PreviewResult, OverheadMethod,
} from '@/types/overhead';

export const overheadApi = {
  list: (params?: { fiscalYearId?: string; status?: string }) =>
    api.get<OverheadAllocation[]>('/overhead-allocations', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<OverheadAllocation>(`/overhead-allocations/${id}`).then((r) => r.data),

  stats: (fiscalYearId?: string) =>
    api.get('/overhead-allocations/stats', { params: { fiscalYearId } }).then((r) => r.data),

  preview: (data: {
    fiscalYearId: string;
    periodMonth: string;
    method: OverheadMethod;
    totalAmount: number;
  }) =>
    api.post<PreviewResult>('/overhead-allocations/preview', data).then((r) => r.data),

  create: (data: CreateOverheadPayload) =>
    api.post<OverheadAllocation>('/overhead-allocations', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateOverheadPayload>) =>
    api.patch<OverheadAllocation>(`/overhead-allocations/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/overhead-allocations/${id}`).then((r) => r.data),

  post: (id: string) =>
    api.post(`/overhead-allocations/${id}/post`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(`/overhead-allocations/${id}/cancel`).then((r) => r.data),
};
