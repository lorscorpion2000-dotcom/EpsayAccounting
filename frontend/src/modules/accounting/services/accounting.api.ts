import { api } from '@/services/api';
import type {
  Account, FiscalYear, JournalEntry, TrialBalanceResult, LedgerResult,
} from '@/types/accounting';

export const accountingApi = {
  // ===== Fiscal Years =====
  fiscalYears: {
    list: async () => {
      const { data } = await api.get<FiscalYear[]>('/fiscal-years');
      return data;
    },
    current: async () => {
      const { data } = await api.get<FiscalYear | null>('/fiscal-years/current');
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<FiscalYear>('/fiscal-years/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<FiscalYear>('/fiscal-years', payload);
      return data;
    },
    setCurrent: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/set-current');
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      await api.delete('/fiscal-years/' + id);
    },
    close: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/close');
      return data;
    },
    reopen: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/reopen');
      return data;
    },
    summary: async (id: string) => {
      const { data } = await api.get('/fiscal-years/' + id + '/summary');
      return data;
    },
    generateClosing: async (id: string) => {
      const { data } = await api.patch('/fiscal-years/' + id + '/generate-closing');
      return data;
    },
    generateOpening: async (id: string) => {
      const { data } = await api.patch('/fiscal-years/' + id + '/generate-opening');
      return data;
    },
  },

  // ===== Accounts =====
  accounts: {
    tree: async () => {
      const { data } = await api.get<Account[]>('/accounts/tree');
      return data;
    },
    flat: async () => {
      const { data } = await api.get<Account[]>('/accounts/flat');
      return data;
    },
    postable: async () => {
      const { data } = await api.get<Account[]>('/accounts/postable');
      return data;
    },
    generateCode: async (parentId?: string) => {
      const { data } = await api.get<{ code: string }>('/accounts/generate-code', {
        params: parentId ? { parentId } : {},
      });
      return data.code;
    },
    get: async (id: string) => {
      const { data } = await api.get<Account>('/accounts/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Account>('/accounts', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Account>('/accounts/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/accounts/' + id);
      return data;
    },
  },

  // ===== Journals =====
journals: {
  list: async (params?: {
    fiscalYearId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }) => {
    const { data } = await api.get<any>('/journals', { params });
    // Normalize: backend may return array OR paginated { data, total, page }
    if (Array.isArray(data)) return data as JournalEntry[];
    if (data && Array.isArray(data.data)) return data.data as JournalEntry[];
    if (data && Array.isArray(data.items)) return data.items as JournalEntry[];
    if (data && Array.isArray(data.rows)) return data.rows as JournalEntry[];
    console.warn('[journals.list] Unexpected response shape:', data);
    return [] as JournalEntry[];
  },
    get: async (id: string) => {
      const { data } = await api.get<JournalEntry>('/journals/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<JournalEntry>('/journals', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<JournalEntry>('/journals/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/journals/' + id);
      return data;
    },
    post: async (id: string) => {
      const { data } = await api.patch('/journals/' + id + '/post');
      return data;
    },
    removeAdmin: async (id: string, reason: string, force?: boolean) => {
      const { data } = await api.delete('/journals/' + id + '/admin', { data: { reason, force: !!force } });
      return data;
    },
    hardDelete: async (id: string, reason: string) => {
      const { data } = await api.delete('/journals/' + id + '/hard-delete', { data: { reason } });
      return data;
    },
    restore: async (id: string) => {
      const { data } = await api.patch('/journals/' + id + '/restore');
      return data;
    },
    reverse: async (id: string, reason: string) => {
      const { data } = await api.patch('/journals/' + id + '/reverse', { reason });
      return data;
    },
  },

  // ===== Reports =====
  reports: {
    trialBalance: async (params: {
      fiscalYearId: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const { data } = await api.get<TrialBalanceResult>(
        '/accounting/reports/trial-balance',
        { params },
      );
      return data;
    },
    ledger: async (params: {
      accountId: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const { data } = await api.get<LedgerResult>(
        '/accounting/reports/ledger',
        { params },
      );
      return data;
    },
    journalBook: async (params: {
      fiscalYearId: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const { data } = await api.get<JournalEntry[]>(
        '/accounting/reports/journal-book',
        { params },
      );
      return data;
    },

    partyLedger: async (params: { partnerId: string; fiscalYearId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/party-ledger', { params });
      return data;
    },
    projectLedger: async (params: { projectId: string; fiscalYearId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/project-ledger', { params });
      return data;
    },
    arAging: async (params?: { fiscalYearId?: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/ar-aging', { params });
      return data;
    },
    apAging: async (params?: { fiscalYearId?: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/ap-aging', { params });
      return data;
    },
    profitLoss: async (params: { fiscalYearId: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/profit-loss', { params });
      return data;
    },
    balanceSheet: async (params: { fiscalYearId: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/balance-sheet', { params });
      return data;
    },
    detailedTrialBalance: async (params: { fiscalYearId: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/detailed-trial-balance', { params });
      return data;
    },
  },
};
