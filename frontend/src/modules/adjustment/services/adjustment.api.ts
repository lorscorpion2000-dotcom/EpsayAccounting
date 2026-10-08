import { api } from '@/services/api';
import type { AdjustmentIndex, AdjustmentCalculation, MaterialPriceDiff } from '@/types/adjustment';

export const adjustmentApi = {
  // ─── Indices ───
  indices: {
    list: (params?: { year?: number; category?: string; isActive?: boolean }) =>
      api.get<AdjustmentIndex[]>('/adjustment-indices', { params }).then((r) => r.data),
    get: (id: string) =>
      api.get<AdjustmentIndex>(`/adjustment-indices/${id}`).then((r) => r.data),
    create: (data: any) =>
      api.post<AdjustmentIndex>('/adjustment-indices', data).then((r) => r.data),
    update: (id: string, data: any) =>
      api.patch<AdjustmentIndex>(`/adjustment-indices/${id}`, data).then((r) => r.data),
    remove: (id: string) =>
      api.delete(`/adjustment-indices/${id}`).then((r) => r.data),
    stats: () =>
      api.get('/adjustment-indices/stats').then((r) => r.data),
  },

  // ─── Adjustment Calculations ───
  calculations: {
    list: (params?: { projectId?: string; status?: string; category?: string }) =>
      api.get<AdjustmentCalculation[]>('/adjustments', { params }).then((r) => r.data),
    get: (id: string) =>
      api.get<AdjustmentCalculation>(`/adjustments/${id}`).then((r) => r.data),
    calculate: (data: any) =>
      api.post<AdjustmentCalculation>('/adjustments/calculate', data).then((r) => r.data),
    confirm: (id: string) =>
      api.post(`/adjustments/${id}/confirm`).then((r) => r.data),
    post: (id: string) =>
      api.post(`/adjustments/${id}/post`).then((r) => r.data),
    cancel: (id: string) =>
      api.post(`/adjustments/${id}/cancel`).then((r) => r.data),
    remove: (id: string) =>
      api.delete(`/adjustments/${id}`).then((r) => r.data),
  },

  // ─── Material Price Diffs ───
  priceDiffs: {
    list: (params?: { projectId?: string; status?: string; materialType?: string }) =>
      api.get<MaterialPriceDiff[]>('/material-price-diffs', { params }).then((r) => r.data),
    get: (id: string) =>
      api.get<MaterialPriceDiff>(`/material-price-diffs/${id}`).then((r) => r.data),
    create: (data: any) =>
      api.post<MaterialPriceDiff>('/material-price-diffs', data).then((r) => r.data),
    confirm: (id: string) =>
      api.post(`/material-price-diffs/${id}/confirm`).then((r) => r.data),
    post: (id: string) =>
      api.post(`/material-price-diffs/${id}/post`).then((r) => r.data),
    cancel: (id: string) =>
      api.post(`/material-price-diffs/${id}/cancel`).then((r) => r.data),
    remove: (id: string) =>
      api.delete(`/material-price-diffs/${id}`).then((r) => r.data),
    stats: () =>
      api.get('/material-price-diffs/stats').then((r) => r.data),
  },
};
