import { api } from '@/services/api';
import type { ImportResult, DataType } from '@/types/data-io';

export const dataIoApi = {
  exportData: (type: DataType, params?: any) =>
    api.get(`/data-io/${type}/export`, { params }).then((r) => r.data),

  importData: (type: DataType, rows: any[]): Promise<ImportResult> =>
    api.post(`/data-io/${type}/import`, { rows }).then((r) => r.data),
};
