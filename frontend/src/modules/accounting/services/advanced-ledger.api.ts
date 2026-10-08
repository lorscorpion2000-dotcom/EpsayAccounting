import { api } from '@/services/api';
import type { AdvLedgerResponse, ProfitLossByPeriod } from '@/types/advanced-ledger';

export const advancedLedgerApi = {
  report: (params: {
    accountId?: string;
    accountCodePrefix?: string;
    projectId?: string;
    partnerId?: string;
    costCenterId?: string;
    fromDate: string;
    toDate: string;
    includeSubAccounts?: boolean;
  }) =>
    api.get<AdvLedgerResponse>('/accounting/advanced-ledger/report', { params }).then((r) => r.data),

  profitLoss: (params: { fromDate: string; toDate: string; projectId?: string }) =>
    api.get<ProfitLossByPeriod>('/accounting/advanced-ledger/profit-loss', { params }).then((r) => r.data),
};
