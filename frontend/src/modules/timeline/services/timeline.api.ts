import { api } from '@/services/api';

// ===== Types =====
export type PermitType = 'DEMOLITION' | 'CONSTRUCTION' | 'NO_VIOLATION' | 'COMPLETION' | 'OTHER';
export type PermitStatus = 'PENDING' | 'ISSUED' | 'EXPIRED' | 'CANCELLED';

export interface Permit {
  id: string;
  code: string;
  projectId: string;
  project: { id: string; code: string; name: string };
  type: PermitType;
  title: string;
  number?: string | null;
  authority?: string | null;
  status: PermitStatus;
  issueDate?: string | null;
  expiryDate?: string | null;
  attachmentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type InsuranceType = 'THIRD_PARTY' | 'ACCIDENT' | 'FIRE' | 'EQUIPMENT' | 'OTHER';

export interface Insurance {
  id: string;
  code: string;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  type: InsuranceType;
  title: string;
  insurer?: string | null;
  policyNumber?: string | null;
  coverageAmount?: string | null;
  premiumAmount?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  attachmentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type GuaranteeType = 'BANK_GUARANTEE' | 'CHECK' | 'DEPOSIT' | 'OTHER';

export interface Guarantee {
  id: string;
  code: string;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  type: GuaranteeType;
  title: string;
  issuer?: string | null;
  beneficiary?: string | null;
  amount: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  attachmentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type DocumentType = 'ARCHITECTURE' | 'STRUCTURE' | 'MEP' | 'SITE_PLAN' | 'OTHER';
export type DocumentPhase = 'PHASE_1' | 'PHASE_2' | 'OTHER';

export interface TechnicalDocument {
  id: string;
  code: string;
  projectId: string;
  project: { id: string; code: string; name: string };
  type: DocumentType;
  phase: DocumentPhase;
  title: string;
  version: string;
  isApproved: boolean;
  approvedAt?: string | null;
  attachmentUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type ChecklistType = 'REBAR_BEFORE_CONCRETE' | 'FORMWORK' | 'ELECTRICAL' | 'PLUMBING' | 'WATERPROOFING' | 'OTHER';
export type ChecklistStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ChecklistItem {
  title: string;
  isChecked: boolean;
  notes?: string;
}

export interface PhaseChecklist {
  id: string;
  code: string;
  projectId: string;
  project: { id: string; code: string; name: string };
  wbsItemId?: string | null;
  type: ChecklistType;
  title: string;
  checklistDate: string;
  status: ChecklistStatus;
  items: ChecklistItem[];
  inspectorName?: string | null;
  supervisorName?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  notes?: string | null;
  createdAt: string;
}

// ===== API =====
export const timelineApi = {
  // ===== Permits =====
  permits: {
    list: async (params?: { projectId?: string; type?: string; status?: string; search?: string }) => {
      const { data } = await api.get<Permit[]>('/timeline/permits', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Permit>('/timeline/permits/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Permit>('/timeline/permits', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Permit>('/timeline/permits/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/timeline/permits/' + id);
      return data;
    },
    expiring: async (days = 60) => {
      const { data } = await api.get<Permit[]>('/timeline/permits/expiring', { params: { days } });
      return data;
    },
  },

  // ===== Insurances =====
  insurances: {
    list: async (params?: { projectId?: string; type?: string; search?: string }) => {
      const { data } = await api.get<Insurance[]>('/timeline/insurances', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Insurance>('/timeline/insurances/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Insurance>('/timeline/insurances', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Insurance>('/timeline/insurances/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/timeline/insurances/' + id);
      return data;
    },
    expiring: async (days = 60) => {
      const { data } = await api.get<Insurance[]>('/timeline/insurances/expiring', { params: { days } });
      return data;
    },
  },

  // ===== Guarantees =====
  guarantees: {
    list: async (params?: { projectId?: string; type?: string; search?: string }) => {
      const { data } = await api.get<Guarantee[]>('/timeline/guarantees', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Guarantee>('/timeline/guarantees/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Guarantee>('/timeline/guarantees', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Guarantee>('/timeline/guarantees/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/timeline/guarantees/' + id);
      return data;
    },
    expiring: async (days = 60) => {
      const { data } = await api.get<Guarantee[]>('/timeline/guarantees/expiring', { params: { days } });
      return data;
    },
  },

  // ===== Documents =====
  documents: {
    list: async (params?: { projectId?: string; type?: string; phase?: string; search?: string }) => {
      const { data } = await api.get<TechnicalDocument[]>('/timeline/documents', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<TechnicalDocument>('/timeline/documents/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<TechnicalDocument>('/timeline/documents', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<TechnicalDocument>('/timeline/documents/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/timeline/documents/' + id);
      return data;
    },
  },

  // ===== Checklists =====
  checklists: {
    list: async (params?: { projectId?: string; type?: string; status?: string; search?: string }) => {
      const { data } = await api.get<PhaseChecklist[]>('/timeline/checklists', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PhaseChecklist>('/timeline/checklists/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PhaseChecklist>('/timeline/checklists', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PhaseChecklist>('/timeline/checklists/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/timeline/checklists/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/timeline/checklists/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/timeline/checklists/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/timeline/checklists/' + id + '/reject', { reason });
      return data;
    },
  },
};
