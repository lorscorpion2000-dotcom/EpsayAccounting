import { api } from '@/services/api';
import type {
  Warehouse, ItemCategory, Item, Stock, StockMovement,
  GoodsReceipt, GoodsIssue, KardexResult, WarehouseStats,
} from '@/types/warehouse';

export const warehouseApi = {
  // ===== Warehouses =====
  warehouses: {
    list: async (params?: { active?: boolean; projectId?: string }) => {
      const { data } = await api.get<Warehouse[]>('/warehouses', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Warehouse>('/warehouses/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Warehouse>('/warehouses', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Warehouse>('/warehouses/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/warehouses/' + id);
      return data;
    },
  },

  // ===== Categories =====
  categories: {
    list: async () => {
      const { data } = await api.get<ItemCategory[]>('/warehouse/categories');
      return data;
    },
    tree: async () => {
      const { data } = await api.get<ItemCategory[]>('/warehouse/categories/tree');
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<ItemCategory>('/warehouse/categories/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<ItemCategory>('/warehouse/categories', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<ItemCategory>('/warehouse/categories/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/warehouse/categories/' + id);
      return data;
    },
  },

  // ===== Items =====
  items: {
    list: async (params?: { type?: string; categoryId?: string; search?: string }) => {
      const { data } = await api.get<Item[]>('/warehouse/items', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Item>('/warehouse/items/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Item>('/warehouse/items', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Item>('/warehouse/items/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/warehouse/items/' + id);
      return data;
    },
  },

  // ===== Stock =====
  stock: {
    byWarehouse: async (warehouseId: string) => {
      const { data } = await api.get<Stock[]>('/warehouse/stock/by-warehouse', { params: { warehouseId } });
      return data;
    },
    byItem: async (itemId: string) => {
      const { data } = await api.get<Stock[]>('/warehouse/stock/by-item', { params: { itemId } });
      return data;
    },
    movements: async (params?: { warehouseId?: string; itemId?: string; fromDate?: string; toDate?: string; type?: string }) => {
      const { data } = await api.get<StockMovement[]>('/warehouse/stock/movements', { params });
      return data;
    },
  },

  // ===== Receipts =====
  receipts: {
    list: async (params?: { warehouseId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<GoodsReceipt[]>('/warehouse/receipts', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<GoodsReceipt>('/warehouse/receipts/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<GoodsReceipt>('/warehouse/receipts', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<GoodsReceipt>('/warehouse/receipts/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/warehouse/receipts/' + id);
      return data;
    },
    post: async (id: string) => {
      const { data } = await api.patch('/warehouse/receipts/' + id + '/post');
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/warehouse/receipts/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/warehouse/receipts/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/warehouse/receipts/' + id + '/reject', { reason });
      return data;
    },
  },

  // ===== Issues =====
  issues: {
    list: async (params?: { warehouseId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<GoodsIssue[]>('/warehouse/issues', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<GoodsIssue>('/warehouse/issues/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<GoodsIssue>('/warehouse/issues', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<GoodsIssue>('/warehouse/issues/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/warehouse/issues/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/warehouse/issues/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/warehouse/issues/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/warehouse/issues/' + id + '/reject', { reason });
      return data;
    },
    post: async (id: string) => {
      const { data } = await api.patch('/warehouse/issues/' + id + '/post');
      return data;
    },
  },

  // ===== Reports =====
  reports: {
    kardex: async (params: { itemId: string; warehouseId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get<KardexResult>('/warehouse/reports/kardex', { params });
      return data;
    },
    inventory: async (params?: { warehouseId?: string; type?: string }) => {
      const { data } = await api.get<Stock[]>('/warehouse/reports/inventory', { params });
      return data;
    },
    lowStock: async (warehouseId?: string) => {
      const { data } = await api.get<any[]>('/warehouse/reports/low-stock', {
        params: warehouseId ? { warehouseId } : {},
      });
      return data;
    },
    stats: async () => {
      const { data } = await api.get<WarehouseStats>('/warehouse/reports/stats');
      return data;
    },
  },
};
