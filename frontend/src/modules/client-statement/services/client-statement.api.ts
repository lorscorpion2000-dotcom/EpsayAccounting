import { api } from '@/services/api';
import type { ClientStatement, CreateCSPayload, CSItem, CSCategory } from '@/types/client-statement';

interface ListParams { projectId?: string; status?: string; search?: string }

export const clientStatementApi = {
  list: (params?: ListParams) =>
    api.get<ClientStatement[]>('/client-statements', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ClientStatement>(`/client-statements/${id}`).then((r) => r.data),

  stats: (projectId?: string) =>
    api.get('/client-statements/stats', { params: { projectId } }).then((r) => r.data),

  nextNumber: (projectId: string) =>
    api.get<number>(`/client-statements/next-number/${projectId}`).then((r) => r.data),

  create: (data: CreateCSPayload) =>
    api.post<ClientStatement>('/client-statements', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateCSPayload>) =>
    api.patch<ClientStatement>(`/client-statements/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/client-statements/${id}`).then((r) => r.data),

  importItems: (id: string, category: CSCategory, items: Partial<CSItem>[]) =>
    api.post(`/client-statements/${id}/items/import`, { category, items }).then((r) => r.data),

  deleteItem: (itemId: string) =>
    api.delete(`/client-statements/items/${itemId}`).then((r) => r.data),

  submit: (id: string) =>
    api.post(`/client-statements/${id}/submit`).then((r) => r.data),

  approve: (id: string) =>
    api.post(`/client-statements/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.post(`/client-statements/${id}/reject`, { reason }).then((r) => r.data),

  post: (id: string) =>
    api.post(`/client-statements/${id}/post`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(`/client-statements/${id}/cancel`).then((r) => r.data),
};
