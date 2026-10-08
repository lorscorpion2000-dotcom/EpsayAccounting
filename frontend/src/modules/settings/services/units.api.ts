import { api } from '@/services/api';

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnitUsage {
  items: number;
  purchaseRequestItems: number;
  purchaseOrderItems: number;
  purchaseInvoiceItems: number;
  wbsItems: number;
  priceListItems: number;
  total: number;
}

export const unitsApi = {
  list: async (params?: { active?: boolean; search?: string }): Promise<Unit[]> => {
    const { data } = await api.get<Unit[]>('/units', { params });
    return data;
  },
  get: async (id: string): Promise<Unit> => {
    const { data } = await api.get<Unit>('/units/' + id);
    return data;
  },
  usage: async (id: string): Promise<UnitUsage> => {
    const { data } = await api.get<UnitUsage>('/units/' + id + '/usage');
    return data;
  },
  create: async (payload: Partial<Unit>): Promise<Unit> => {
    const { data } = await api.post<Unit>('/units', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Unit>): Promise<Unit> => {
    const { data } = await api.patch<Unit>('/units/' + id, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/units/' + id);
  },
};
