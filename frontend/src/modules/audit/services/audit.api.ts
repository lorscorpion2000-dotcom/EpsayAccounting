import { api } from '@/services/api';
import type { AuditListResponse, AuditStats, SecurityStats } from '@/types/audit';

export const auditApi = {
  list: (params: any) => api.get<AuditListResponse>('/audit', { params }).then((r) => r.data),
  stats: (params?: any) => api.get<AuditStats>('/audit/stats', { params }).then((r) => r.data),
  get: (id: string) => api.get('/audit/' + id).then((r) => r.data),
  securityList: (params: any) =>
    api.get<AuditListResponse>('/audit/security', { params }).then((r) => r.data),
  securityStats: (params?: any) =>
    api.get<SecurityStats>('/audit/security/stats', { params }).then((r) => r.data),
};
