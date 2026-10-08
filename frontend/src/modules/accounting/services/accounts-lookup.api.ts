import { api } from '@/services/api';

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  level?: string;
  nature?: string;
  isPostable?: boolean;
}

/** لیست حساب‌های قابل استفاده برای انتخاب (postable) — از endpoints مختلف تلاش می‌کند. */
export const accountsLookupApi = {
  postable: async (): Promise<AccountOption[]> => {
    const tries = [
      { url: '/accounts', params: { postable: true } },
      { url: '/accounts', params: { isPostable: true } },
      { url: '/accounting/accounts', params: { postable: true } },
    ];
    for (const t of tries) {
      try {
        const { data } = await api.get<AccountOption[]>(t.url, { params: t.params });
        if (Array.isArray(data) && data.length) {
          // اگر ساختار درختی بود، flatten کن
          const flat: AccountOption[] = [];
          const walk = (arr: any[]) => {
            for (const x of arr) {
              if (x?.isPostable !== false) flat.push(x);
              if (Array.isArray(x?.children)) walk(x.children);
            }
          };
          walk(data);
          if (flat.length) return flat;
          return data;
        }
      } catch { /* try next */ }
    }
    // آخرین تلاش: بدون پارامتر
    const { data } = await api.get<AccountOption[]>('/accounts');
    return data;
  },
};