import { api } from '@/services/api';
import type { DashboardExecutive } from '@/types/dashboard-exec';

export const dashboardExecApi = {
  executive: () => api.get<DashboardExecutive>('/dashboard/executive').then((r) => r.data),
};
