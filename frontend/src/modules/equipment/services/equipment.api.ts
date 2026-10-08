import { api } from '@/services/api';
import type {
  Equipment, CreateEquipmentPayload,
  EquipmentDailyLog, CreateDailyLogPayload,
  EquipmentMaintenance, CreateMaintenancePayload,
  EquipmentReport, EquipmentStats,
} from '@/types/equipment';

interface ListEquipmentParams {
  search?: string;
  ownership?: string;
  status?: string;
  projectId?: string;
  isActive?: boolean;
}

interface ListLogsParams {
  equipmentId?: string;
  projectId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

interface ListMaintenanceParams {
  equipmentId?: string;
  projectId?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
}

interface ReportParams {
  fromDate?: string;
  toDate?: string;
  projectId?: string;
  equipmentId?: string;
}

export const equipmentApi = {
  // ─── Equipment ───
  equipment: {
    list: (params?: ListEquipmentParams) =>
      api.get<Equipment[]>('/equipment', { params }).then((r) => r.data),

    get: (id: string) =>
      api.get<Equipment>(`/equipment/${id}`).then((r) => r.data),

    create: (data: CreateEquipmentPayload) =>
      api.post<Equipment>('/equipment', data).then((r) => r.data),

    update: (id: string, data: Partial<CreateEquipmentPayload>) =>
      api.patch<Equipment>(`/equipment/${id}`, data).then((r) => r.data),

    remove: (id: string, force?: boolean) =>
      api.delete(`/equipment/${id}` + (force ? '?force=true' : '')).then((r) => r.data),

    stats: () =>
      api.get<EquipmentStats>('/equipment/stats').then((r) => r.data),
  },

  // ─── Daily Logs ───
  logs: {
    list: (params?: ListLogsParams) =>
      api.get<EquipmentDailyLog[]>('/equipment/logs/list', { params }).then((r) => r.data),

    get: (id: string) =>
      api.get<EquipmentDailyLog>(`/equipment/logs/${id}`).then((r) => r.data),

    create: (data: CreateDailyLogPayload) =>
      api.post<EquipmentDailyLog>('/equipment/logs', data).then((r) => r.data),

    update: (id: string, data: Partial<CreateDailyLogPayload>) =>
      api.patch<EquipmentDailyLog>(`/equipment/logs/${id}`, data).then((r) => r.data),

    remove: (id: string) =>
      api.delete(`/equipment/logs/${id}`).then((r) => r.data),

    confirm: (id: string) =>
      api.patch<EquipmentDailyLog>(`/equipment/logs/${id}/confirm`).then((r) => r.data),
  },

  // ─── Maintenance ───
  maintenances: {
    list: (params?: ListMaintenanceParams) =>
      api.get<EquipmentMaintenance[]>('/equipment/maintenances/list', { params }).then((r) => r.data),

    get: (id: string) =>
      api.get<EquipmentMaintenance>(`/equipment/maintenances/${id}`).then((r) => r.data),

    create: (data: CreateMaintenancePayload) =>
      api.post<EquipmentMaintenance>('/equipment/maintenances', data).then((r) => r.data),

    remove: (id: string) =>
      api.delete(`/equipment/maintenances/${id}`).then((r) => r.data),
  },

  // ─── Reports ───
  reports: {
    usage: (params?: ReportParams) =>
      api.get<EquipmentReport>('/equipment/reports/usage', { params }).then((r) => r.data),
  },
};