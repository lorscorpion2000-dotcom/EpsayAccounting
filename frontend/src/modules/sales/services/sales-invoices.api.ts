import { api } from '@/services/api';

export type SIStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'PAID' | 'CANCELLED';
export type SRMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface SIItem {
  id: string;
  rowNumber: number;
  description: string;
  quantity: number | string;
  unit?: string | null;
  unitPrice: number | string;
  totalPrice: number | string;
  accountId?: string | null;
  account?: { id: string; code: string; name: string } | null;
  notes?: string | null;
}

export interface SalesInvoice {
  id: string;
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  customerId: string;
  customer?: { id: string; fullName: string; mobilePhone?: string | null; nationalId?: string | null } | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  contractId?: string | null;
  contract?: { id: string; code: string } | null;
  partnerId?: string | null;
  partner?: { id: string; code: string; name: string } | null;
  subtotal: number | string;
  taxPercent: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  receivedAmount: number | string;
  status: SIStatus;
  notes?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  items?: SIItem[];
  receipts?: SalesReceipt[];
  _count?: { items?: number; receipts?: number };
  createdAt?: string;
}

export interface SIItemInput {
  rowNumber?: number;
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  totalPrice?: number;
  accountId?: string | null;
  notes?: string | null;
}

export interface CreateSIInput {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  customerId: string;
  contractId?: string | null;
  projectId?: string | null;
  taxPercent?: number;
  discountAmount?: number;
  notes?: string | null;
  items: SIItemInput[];
}

export interface SalesReceipt {
  id: string;
  code: string;
  customerId: string;
  customer?: { id: string; fullName: string } | null;
  invoiceId?: string | null;
  invoice?: { id: string; code: string; invoiceNumber: string; totalAmount: number | string } | null;
  method: SRMethod;
  bankAccountId?: string | null;
  bankAccount?: { id: string; code: string; name: string } | null;
  amount: number | string;
  receiptDate: string;
  reference?: string | null;
  notes?: string | null;
  journalEntryId?: string | null;
  createdAt?: string;
}

export interface SalesCustomerRef { id: string; fullName: string; mobilePhone?: string | null; nationalId?: string | null; isActive?: boolean; }
export interface ProjectRef { id: string; code: string; name: string; }
export interface BankRef { id: string; code: string; name: string; isActive: boolean; }

export const salesInvoicesApi = {
  list: async (params?: { customerId?: string; projectId?: string; status?: string }) => {
    const { data } = await api.get<SalesInvoice[]>('/sales-invoices', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<SalesInvoice>('/sales-invoices/' + id);
    return data;
  },
  create: async (payload: CreateSIInput) => {
    const { data } = await api.post<SalesInvoice>('/sales-invoices', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreateSIInput>) => {
    const { data } = await api.patch<SalesInvoice>('/sales-invoices/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/sales-invoices/' + id);
    return data;
  },
  approve: async (id: string) => {
    const { data } = await api.post<SalesInvoice>('/sales-invoices/' + id + '/approve');
    return data;
  },
  updateItem: async (itemId: string, payload: Partial<SIItemInput>) => {
    const { data } = await api.patch<SIItem>('/sales-invoices/items/' + itemId, payload);
    return data;
  },
  deleteItem: async (itemId: string) => {
    const { data } = await api.delete('/sales-invoices/items/' + itemId);
    return data;
  },
  customers: async (): Promise<SalesCustomerRef[]> => {
    const { data } = await api.get<SalesCustomerRef[]>('/sales/customers');
    return data;
  },
};

export const salesReceiptsApi = {
  list: async (params?: { customerId?: string; invoiceId?: string }) => {
    const { data } = await api.get<SalesReceipt[]>('/sales-receipts', { params });
    return data;
  },
  create: async (payload: {
    invoiceId: string; method: SRMethod; bankAccountId?: string | null;
    amount: number; receiptDate: string; reference?: string | null; notes?: string | null;
  }) => {
    const { data } = await api.post<SalesReceipt>('/sales-receipts', payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/sales-receipts/' + id);
    return data;
  },
};