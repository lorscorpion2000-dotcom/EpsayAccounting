import { api } from '@/services/api';
import type { ConsumptionResult, WbsUnitCostResult } from '@/types/material-report';

export const materialReportApi = {
  consumption: (params?: {
    projectId?: string;
    wbsItemId?: string;
    itemId?: string;
    fromDate?: string;
    toDate?: string;
  }) => api.get<ConsumptionResult>('/material-report/consumption', { params }).then((r) => r.data),

  unitCost: (projectId: string, wbsItemId?: string) =>
    api.get<WbsUnitCostResult>(`/material-report/unit-cost/${projectId}`, { params: { wbsItemId } }).then((r) => r.data),
};
