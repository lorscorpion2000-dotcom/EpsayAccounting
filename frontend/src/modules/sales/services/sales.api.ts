import { api } from '@/services/api';

export type SalesUnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DELIVERED' | 'CANCELLED';
export type SalesPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface SalesUnit {
  id: string;
  projectId: string;
  project?: { id: string; name: string; code?: string };
  unitNumber: string;
  block?: string;
  floor?: number;
  area?: string;
  bedrooms?: number;
  parkingCount?: number;
  storageCount?: number;
  listPrice?: string;
  status: SalesUnitStatus;
  notes?: string;
  createdAt: string;
}

export interface SalesCustomer {
  id: string;
  fullName: string;
  nationalId?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  bankSheba?: string;
  notes?: string;
  createdAt: string;
}

export interface SalesInstallment {
  id: string;
  contractId: string;
  sequence: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  status: SalesPaymentStatus;
  paidAt?: string;
  notes?: string;
}

export interface SalesPayment {
  id: string;
  contractId: string;
  amount: string;
  paidAt: string;
  paymentMethod?: string;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
}

export interface SalesContract {
  id: string;
  code: string;
  status: string;
  unitId: string;
  unit: SalesUnit;
  customerId: string;
  customer: SalesCustomer;
  totalPrice: string;
  discountAmount?: string;
  finalPrice: string;
  downPayment?: string;
  contractDate: string;
  deliveryDate?: string;
  bodyHtml?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  installments?: SalesInstallment[];
  payments?: SalesPayment[];
  _count?: { installments: number; payments: number };
  createdAt: string;
}

export const salesApi = {
  units: {
    list: (params?: { projectId?: string; status?: string; search?: string }) =>
      api.get<SalesUnit[]>('/sales/units', { params }).then((r: any) => r.data),
    get: (id: string) => api.get<SalesUnit>('/sales/units/' + id).then((r: any) => r.data),
    create: (data: Partial<SalesUnit>) =>
      api.post<SalesUnit>('/sales/units', data).then((r: any) => r.data),
    update: (id: string, data: Partial<SalesUnit>) =>
      api.patch<SalesUnit>('/sales/units/' + id, data).then((r: any) => r.data),
    cancel: (id: string) => api.post('/sales/units/' + id + '/cancel').then((r: any) => r.data),
  },
  customers: {
    list: (search?: string) =>
      api.get<SalesCustomer[]>('/sales/customers', { params: { search } }).then((r: any) => r.data),
    get: (id: string) => api.get<SalesCustomer>('/sales/customers/' + id).then((r: any) => r.data),
    create: (data: Partial<SalesCustomer>) =>
      api.post<SalesCustomer>('/sales/customers', data).then((r: any) => r.data),
    update: (id: string, data: Partial<SalesCustomer>) =>
      api.patch<SalesCustomer>('/sales/customers/' + id, data).then((r: any) => r.data),
  },
  contracts: {
    list: (params?: { status?: string; search?: string; unitId?: string; customerId?: string }) =>
      api.get<SalesContract[]>('/sales/contracts', { params }).then((r: any) => r.data),
    get: (id: string) => api.get<SalesContract>('/sales/contracts/' + id).then((r: any) => r.data),
    create: (data: any) => api.post<SalesContract>('/sales/contracts', data).then((r: any) => r.data),
    update: (id: string, data: any) =>
      api.patch<SalesContract>('/sales/contracts/' + id, data).then((r: any) => r.data),
    activate: (id: string) => api.post('/sales/contracts/' + id + '/activate').then((r: any) => r.data),
    cancel: (id: string, reason: string) =>
      api.post('/sales/contracts/' + id + '/cancel', { reason }).then((r: any) => r.data),
    summary: () => api.get('/sales/contracts/summary').then((r: any) => r.data),
  },
  payments: {
    list: (contractId?: string) =>
      api.get<SalesPayment[]>('/sales/payments', { params: { contractId } }).then((r: any) => r.data),
    create: (data: Partial<SalesPayment>) =>
      api.post<SalesPayment>('/sales/payments', data).then((r: any) => r.data),
  },
};
