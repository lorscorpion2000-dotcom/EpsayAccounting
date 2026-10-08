export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; error: string }[];
}

export type DataType = 'partners' | 'items' | 'wbs' | 'accounts';

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  partners: 'اشخاص',
  items: 'کالاها',
  wbs: 'ساختار شکست کار (WBS)',
  accounts: 'کدینگ حساب‌ها',
};
