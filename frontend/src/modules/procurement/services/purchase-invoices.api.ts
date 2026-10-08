import { api } from '@/services/api';

export type PIStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PayMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface PIItem {
  id: string;
  rowNumber: number;
  description: string;
  quantity: number | string;
  unit: string;
  unitPrice: number | string;
  totalPrice: number | string;
  accountId?: string | null;
  account?: { id: string; code: string; name: string } | null;
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  discountPercent?: number | string;
  discountAmount?: number | string;
  additionAmount?: number | string;
  deductionAmount?: number | string;
  taxPercent?: number | string;
  taxAmount?: number | string;
  shippingCost?: number | string;
  loadingCost?: number | string;
  lineTotal?: number | string;
  isCapital?: boolean;
  usefulLifeMonths?: number | null;
  fixedAssetId?: string | null;
  fixedAsset?: { id: string; code: string; name: string } | null;
  notes?: string | null;
}

export interface PurchaseInvoice {
  id: string;
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  supplierId: string;
  supplier?: { id: string; code: string; name: string } | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  poId?: string | null;
  po?: { id: string; code: string } | null;
  grId?: string | null;
  gr?: { id: string; code: string } | null;
  subtotal: number | string;
  taxPercent: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  status: PIStatus;
  notes?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  approvedAt?: string | null;
  items?: PIItem[];
  payments?: SupplierPayment[];
  _count?: { items?: number; payments?: number };
  createdAt?: string;
}

export interface PIItemInput {
  rowNumber?: number;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice?: number;
  accountId?: string | null;
  wbsItemId?: string | null;
  discountPercent?: number;
  discountAmount?: number;
  additionAmount?: number;
  deductionAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  shippingCost?: number;
  loadingCost?: number;
  isCapital?: boolean;
  usefulLifeMonths?: number | null;
  notes?: string | null;
}

export interface CreatePIInput {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  supplierId: string;
  projectId?: string | null;
  poId?: string | null;
  grId?: string | null;
  taxPercent?: number;
  discountAmount?: number;
  notes?: string | null;
  items: PIItemInput[];
}

export interface SupplierPayment {
  id: string;
  code: string;
  supplierId: string;
  supplier?: { id: string; code: string; name: string } | null;
  invoiceId?: string | null;
  invoice?: { id: string; code: string; invoiceNumber: string; totalAmount: number | string } | null;
  method: PayMethod;
  bankAccountId?: string | null;
  bankAccount?: { id: string; code: string; name: string } | null;
  amount: number | string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  journalEntryId?: string | null;
  createdAt?: string;
}

export interface PaySupplierInput {
  invoiceId: string;
  method: PayMethod;
  bankAccountId?: string | null;
  amount: number;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
}

export const purchaseInvoicesApi = {
  list: async (params?: { supplierId?: string; projectId?: string; status?: string }) => {
    const { data } = await api.get<PurchaseInvoice[]>('/purchase-invoices', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<PurchaseInvoice>('/purchase-invoices/' + id);
    return data;
  },
  create: async (payload: CreatePIInput) => {
    const { data } = await api.post<PurchaseInvoice>('/purchase-invoices', payload);
    return data;
  },
  createFromPO: async (poId: string, payload: { invoiceNumber: string; invoiceDate: string; dueDate?: string }) => {
    const { data } = await api.post<PurchaseInvoice>('/purchase-invoices/from-po/' + poId, payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreatePIInput>) => {
    const { data } = await api.patch<PurchaseInvoice>('/purchase-invoices/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/purchase-invoices/' + id);
    return data;
  },
  approve: async (id: string) => {
    const { data } = await api.post<PurchaseInvoice>('/purchase-invoices/' + id + '/approve');
    return data;
  },
};

export const supplierPaymentsApi = {
  list: async (params?: { supplierId?: string; invoiceId?: string }) => {
    const { data } = await api.get<SupplierPayment[]>('/supplier-payments', { params });
    return data;
  },
  pay: async (payload: PaySupplierInput) => {
    const { data } = await api.post<SupplierPayment>('/supplier-payments', payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/supplier-payments/' + id);
    return data;
  },
};

export interface ProjectRef { id: string; code: string; name: string; }
export interface PartnerRef { id: string; code: string; name: string; type?: string; }
export interface BankRef { id: string; code: string; name: string; isActive: boolean; }