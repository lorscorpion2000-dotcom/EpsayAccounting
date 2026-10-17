import { api } from '@/services/api';

export interface CompanyProfile {
  id: string;
  name: string;
  stampUrl: string | null;
  logoUrl: string | null;
  updatedAt: string;
}

export const companyProfileApi = {
  get: async (): Promise<CompanyProfile> => {
    const { data } = await api.get('/company-profile');
    return data;
  },
  update: async (payload: { name?: string; stampUrl?: string | null; logoUrl?: string | null }): Promise<CompanyProfile> => {
    const { data } = await api.patch('/company-profile', payload);
    return data;
  },
};
