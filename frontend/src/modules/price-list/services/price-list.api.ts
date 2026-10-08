import { api } from '@/services/api';
import type {
  PriceList, PriceListItem, CreatePriceListPayload, CreatePriceListItemPayload,
  ImportResult, BoqStats,
} from '@/types/price-list';

interface ListParams { year?: number; status?: string; search?: string }
interface ListItemsParams { search?: string; chapter?: string }

export const priceListApi = {
  lists: {
    list: (params?: ListParams) =>
      api.get<PriceList[]>('/price-lists', { params }).then((r) => r.data),
    get: (id: string) =>
      api.get<PriceList>(`/price-lists/${id}`).then((r) => r.data),
    create: (data: CreatePriceListPayload) =>
      api.post<PriceList>('/price-lists', data).then((r) => r.data),
    update: (id: string, data: Partial<CreatePriceListPayload>) =>
      api.patch<PriceList>(`/price-lists/${id}`, data).then((r) => r.data),
    remove: (id: string) =>
      api.delete(`/price-lists/${id}`).then((r) => r.data),
    publish: (id: string) =>
      api.post<PriceList>(`/price-lists/${id}/publish`).then((r) => r.data),
    stats: () =>
      api.get<BoqStats>('/price-lists/stats').then((r) => r.data),
  },
  items: {
    list: (priceListId: string, params?: ListItemsParams) =>
      api.get<PriceListItem[]>(`/price-lists/${priceListId}/items`, { params }).then((r) => r.data),
    get: (itemId: string) =>
      api.get<PriceListItem>(`/price-lists/items/${itemId}`).then((r) => r.data),
    create: (priceListId: string, data: CreatePriceListItemPayload) =>
      api.post<PriceListItem>(`/price-lists/${priceListId}/items`, data).then((r) => r.data),
    update: (itemId: string, data: Partial<CreatePriceListItemPayload>) =>
      api.patch<PriceListItem>(`/price-lists/items/${itemId}`, data).then((r) => r.data),
    remove: (itemId: string) =>
      api.delete(`/price-lists/items/${itemId}`).then((r) => r.data),
    import: (priceListId: string, items: CreatePriceListItemPayload[]) =>
      api.post<ImportResult>(`/price-lists/${priceListId}/items/import`, { items }).then((r) => r.data),
    clear: (priceListId: string) =>
      api.delete(`/price-lists/${priceListId}/items/clear`).then((r) => r.data),
  },
  wbs: {
    get: (wbsItemId: string) =>
      api.get(`/price-lists/wbs/${wbsItemId}`).then((r) => r.data),
    projectMapping: (projectId: string) =>
      api.get(`/price-lists/project/${projectId}/wbs-mapping`).then((r) => r.data),
    link: (wbsItemId: string, priceListItemId: string | null) =>
      api.patch(`/price-lists/wbs/${wbsItemId}/link`, { priceListItemId }).then((r) => r.data),
  },
};