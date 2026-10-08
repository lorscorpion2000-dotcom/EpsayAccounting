import { api } from '@/services/api';
import type {
  EquipmentEfficiencyReport, SubcontractorPerformanceReport, WarehouseDiscrepancyReport,
} from '@/types/operational-reports';

export const operationalReportsApi = {
  equipmentEfficiency: (params: { fromDate: string; toDate: string; projectId?: string; equipmentId?: string }) =>
    api.get<EquipmentEfficiencyReport>('/operational-reports/equipment-efficiency', { params }).then((r) => r.data),

  subcontractorPerformance: (params?: { projectId?: string; fromDate?: string; toDate?: string }) =>
    api.get<SubcontractorPerformanceReport>('/operational-reports/subcontractor-performance', { params }).then((r) => r.data),

  warehouseDiscrepancy: (params: { fromDate: string; toDate: string; warehouseId?: string; itemId?: string }) =>
    api.get<WarehouseDiscrepancyReport>('/operational-reports/warehouse-discrepancy', { params }).then((r) => r.data),
};
