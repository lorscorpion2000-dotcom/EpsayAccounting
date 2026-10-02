import { api } from '@/services/api';
import type { Partner } from '@/types/project';

export interface CreatePartnerPayload {
  name: string;
  type?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const partnersApi = {
  list: async (params?: { type?: string; search?: string }) => {
    const { data } = await api.get<Partner[]>('/partners', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<Partner>('/partners/' + id);
    return data;
  },
  create: async (payload: CreatePartnerPayload) => {
    const { data } = await api.post<Partner>('/partners', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreatePartnerPayload>) => {
    const { data } = await api.patch<Partner>('/partners/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/partners/' + id);
    return data;
  },
};
