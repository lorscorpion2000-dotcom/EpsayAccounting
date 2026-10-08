import { api } from '@/services/api';
import type { WipOverview, WipProject, SCurveData } from '@/types/wip';

export const wipApi = {
  overview: () => api.get<WipOverview>('/wip/overview').then((r) => r.data),
  project: (id: string) => api.get<WipProject>(`/wip/project/${id}`).then((r) => r.data),
  sCurve: (id: string) => api.get<SCurveData>(`/wip/s-curve/${id}`).then((r) => r.data),
};
