import { api } from '@/services/api';
import type { PurchaseRequest, RFQ, PurchaseOrder, RFQResponse } from '@/types/procurement';

export const procurementApi = {
  // ===== PR =====
  pr: {
    list: async (params?: { status?: string; projectId?: string; search?: string }) => {
      const { data } = await api.get<PurchaseRequest[]>('/procurement/requests', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PurchaseRequest>('/procurement/requests/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PurchaseRequest>('/procurement/requests', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PurchaseRequest>('/procurement/requests/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/procurement/requests/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/procurement/requests/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/procurement/requests/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/procurement/requests/' + id + '/reject', { reason });
      return data;
    },
  },

  // ===== RFQ =====
  rfq: {
    list: async (prId?: string) => {
      const { data } = await api.get<RFQ[]>('/procurement/rfqs', {
        params: prId ? { prId } : {},
      });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<RFQ>('/procurement/rfqs/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<RFQ>('/procurement/rfqs', payload);
      return data;
    },
    addResponse: async (payload: any) => {
      const { data } = await api.post<RFQResponse>('/procurement/rfqs/responses', payload);
      return data;
    },
    selectSupplier: async (rfqResponseId: string, notes?: string) => {
      const { data } = await api.patch('/procurement/rfqs/select-supplier', {
        rfqResponseId, notes,
      });
      return data;
    },
  },

  // ===== PO =====
  po: {
    list: async (params?: { status?: string; projectId?: string; supplierId?: string; search?: string }) => {
      const { data } = await api.get<PurchaseOrder[]>('/procurement/orders', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PurchaseOrder>('/procurement/orders/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PurchaseOrder>('/procurement/orders', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PurchaseOrder>('/procurement/orders/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/procurement/orders/' + id);
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/procurement/orders/' + id + '/approve');
      return data;
    },
    send: async (id: string) => {
      const { data } = await api.patch('/procurement/orders/' + id + '/send');
      return data;
    },
  },
};
