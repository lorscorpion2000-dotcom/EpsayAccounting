import { api } from '@/services/api';
import type {
  InventoryCount, InventoryCountItem,
  WarehouseTransfer, WarehouseTransferItem,
} from '@/types/inventory-count';

export const inventoryCountApi = {
  // ─── Inventory Counts ───
  list: (params?: { warehouseId?: string; status?: string; fromDate?: string; toDate?: string }) =>
    api.get<InventoryCount[]>('/inventory-counts', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<InventoryCount>(`/inventory-counts/${id}`).then((r) => r.data),

  create: (data: {
    warehouseId: string;
    countDate: string;
    notes?: string;
    items?: { itemId: string; physicalQty: number; notes?: string }[];
  }) => api.post<InventoryCount>('/inventory-counts', data).then((r) => r.data),

  setItems: (id: string, items: { itemId: string; physicalQty: number; notes?: string }[]) =>
    api.patch(`/inventory-counts/${id}/items`, { items }).then((r) => r.data),

  removeItem: (itemId: string) =>
    api.delete(`/inventory-counts/items/${itemId}`).then((r) => r.data),

  confirm: (id: string) =>
    api.post(`/inventory-counts/${id}/confirm`).then((r) => r.data),

  post: (id: string) =>
    api.post(`/inventory-counts/${id}/post`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(`/inventory-counts/${id}/cancel`).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/inventory-counts/${id}`).then((r) => r.data),
};

export const warehouseTransferApi = {
  list: (params?: { fromWarehouseId?: string; toWarehouseId?: string; status?: string; projectId?: string }) =>
    api.get<WarehouseTransfer[]>('/warehouse-transfers', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<WarehouseTransfer>(`/warehouse-transfers/${id}`).then((r) => r.data),

  create: (data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    projectId?: string;
    transferDate: string;
    driverName?: string;
    vehiclePlate?: string;
    notes?: string;
    items?: { itemId: string; quantity: number; notes?: string }[];
  }) => api.post<WarehouseTransfer>('/warehouse-transfers', data).then((r) => r.data),

  update: (id: string, data: any) =>
    api.patch<WarehouseTransfer>(`/warehouse-transfers/${id}`, data).then((r) => r.data),

  send: (id: string) =>
    api.post(`/warehouse-transfers/${id}/send`).then((r) => r.data),

  receive: (id: string) =>
    api.post(`/warehouse-transfers/${id}/receive`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(`/warehouse-transfers/${id}/cancel`).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/warehouse-transfers/${id}`).then((r) => r.data),
};
