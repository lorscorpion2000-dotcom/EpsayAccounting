import { api } from '@/services/api';

export type FixedAssetStatus = 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';
export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE';

export interface AccountRef { id: string; code: string; name: string; }

export interface DepreciationEntry {
  id: string;
  code: string;
  fixedAssetId: string;
  periodYear: number;
  periodMonth: number;
  entryDate: string;
  amount: number | string;
  accumulatedBefore: number | string;
  accumulatedAfter: number | string;
  bookValueAfter: number | string;
  journalEntryId?: string | null;
  createdAt?: string;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  acquisitionDate: string;
  acquisitionCost: number | string;
  residualValue: number | string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  monthlyDepreciation: number | string;
  accumulatedDepreciation: number | string;
  bookValue: number | string;
  status: FixedAssetStatus;
  assetAccountId: string;
  assetAccount?: AccountRef | null;
  depreciationAccountId: string;
  depreciationAccount?: AccountRef | null;
  accumulatedDeprecAccountId: string;
  accumulatedDeprecAccount?: AccountRef | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  costCenterId?: string | null;
  costCenter?: { id: string; code: string; name: string } | null;
  depreciationEntries?: DepreciationEntry[];
  _count?: { depreciationEntries?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface FixedAssetInput {
  name: string;
  description?: string | null;
  acquisitionDate: string;
  acquisitionCost: number;
  residualValue?: number;
  usefulLifeMonths: number;
  depreciationMethod?: DepreciationMethod;
  assetAccountId: string;
  depreciationAccountId: string;
  accumulatedDeprecAccountId: string;
  counterAccountId?: string | null;
  projectId?: string | null;
  costCenterId?: string | null;
}

export interface DepreciationRunResult {
  assetId: string;
  code: string;
  amount?: number;
  jeCode?: string;
  bookValueAfter?: number;
  status?: string;
  skipped?: string;
  error?: string;
}


export interface ScheduleRow {
  index: number;
  amount: number;
  accumulated: number;
  bookValue: number;
}
export interface ScheduleResponse {
  asset: FixedAsset;
  recorded: DepreciationEntry[];
  recordedCount: number;
  projected: ScheduleRow[];
  summary: {
    acquisitionCost: number;
    residualValue: number;
    monthlyDepreciation: number;
    usefulLifeMonths: number;
    accumulatedRecorded: number;
    bookValueNow: number;
    remainingMonths: number;
  };
}
export interface DisposalReport {
  assets: FixedAsset[];
  totalProceeds: number;
  totalBookValue: number;
  count: number;
}

export const fixedAssetsApi = {
  list: async (params?: { status?: string; projectId?: string }) => {
    const { data } = await api.get<FixedAsset[]>('/fixed-assets', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<FixedAsset>('/fixed-assets/' + id);
    return data;
  },
  create: async (payload: FixedAssetInput) => {
    const { data } = await api.post<FixedAsset>('/fixed-assets', payload);
    return data;
  },
  update: async (id: string, payload: Partial<FixedAssetInput>) => {
    const { data } = await api.patch<FixedAsset>('/fixed-assets/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/fixed-assets/' + id);
    return data;
  },
  runDepreciation: async (year: number, month: number) => {
    const { data } = await api.post<DepreciationRunResult[]>('/fixed-assets/run-depreciation', { year, month });
    return data;
  },
  dispose: async (id: string, payload: { disposalDate: string; disposalProceeds: number }) => {
    const { data } = await api.post<FixedAsset>('/fixed-assets/' + id + '/dispose', payload);
    return data;
  },
  schedule: async (id: string): Promise<ScheduleResponse> => {
    const { data } = await api.get<ScheduleResponse>('/fixed-assets/' + id + '/schedule');
    return data;
  },
  disposals: async (params?: { from?: string; to?: string }): Promise<DisposalReport> => {
    const { data } = await api.get<DisposalReport>('/fixed-assets/reports/disposals', { params });
    return data;
  },
};
