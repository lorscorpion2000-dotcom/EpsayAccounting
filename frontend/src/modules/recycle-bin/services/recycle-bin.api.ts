import { api } from '@/services/api';

/** entity از بک‌اند می‌آید — رشته آزاد است */
export type RecycleEntity = string;

export interface RecycleItem {
  id: string;
  entity: string;
  entityLabel: string;
  code: string | null;
  title: string | null;
  amount: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string | null;
  link: string;
}

export interface RecycleCounts {
  [key: string]: number;
  total: number;
}

export interface RecycleEntityDef {
  key: string;
  label: string;
}

export const recycleBinApi = {
  list: async (entity: string = 'all', limit = 200): Promise<RecycleItem[]> => {
    const { data } = await api.get<RecycleItem[]>('/recycle-bin', { params: { entity, limit } });
    return data;
  },
  counts: async (): Promise<RecycleCounts> => {
    const { data } = await api.get<RecycleCounts>('/recycle-bin/counts');
    return data;
  },
  entities: async (): Promise<RecycleEntityDef[]> => {
    const { data } = await api.get<RecycleEntityDef[]>('/recycle-bin/entities');
    return data;
  },
  restore: async (entity: string, id: string) => {
    const { data } = await api.post('/recycle-bin/' + entity + '/' + id + '/restore');
    return data;
  },
};
