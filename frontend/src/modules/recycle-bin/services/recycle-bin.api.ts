import { api } from '@/services/api';

export type RecycleEntity =
  | 'purchase-invoice'
  | 'purchase-order'
  | 'purchase-request'
  | 'journal-entry'
;

export interface RecycleItem {
  id: string;
  entity: RecycleEntity;
  code: string | null;
  title: string | null;
  amount: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string | null;
  link: string;
}

export interface RecycleCounts {
  'purchase-invoice': number;
  'purchase-order': number;
  'purchase-request': number;
  'journal-entry': number;
  total: number;
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
  restore: async (entity: RecycleEntity, id: string) => {
    const { data } = await api.post('/recycle-bin/' + entity + '/' + id + '/restore');
    return data;
  },
};
