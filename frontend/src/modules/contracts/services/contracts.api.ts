import { api } from '@/services/api';

export type LegalContractKind =
  | 'WORKER_EMPLOYMENT' | 'CONTRACTOR_AGREEMENT'
  | 'CLIENT_CONTRACT' | 'SUBCONTRACTOR';

export type LegalContractStatus =
  | 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED';

export type LegalContractPartyKind = 'INDIVIDUAL' | 'COMPANY';

export interface LegalContractParty {
  id: string;
  kind: LegalContractPartyKind;
  fullName: string;
  fatherName?: string;
  nationalId?: string;
  economicCode?: string;
  registrationNumber?: string;
  birthDate?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  email?: string;
  maritalStatus?: string;
  childrenCount?: number;
  education?: string;
  job?: string;
  insuranceNumber?: string;
  address?: string;
  postalCode?: string;
  bankName?: string;
  bankAccount?: string;
  bankSheba?: string;
  notes?: string;
  createdAt: string;
}

export interface LegalContract {
  id: string;
  code: string;
  kind: LegalContractKind;
  status: LegalContractStatus;
  registrationNumber?: string;
  registrationDate?: string;
  partyId: string;
  party: LegalContractParty;
  projectId?: string;
  project?: { id: string; name: string; code: string };
  title: string;
  subject?: string;
  bodyHtml?: string;
  totalAmount?: string;
  salaryMonthly?: string;
  salaryDaily?: string;
  salaryHourly?: string;
  workHoursPerWeek?: number;
  startDate?: string;
  endDate?: string;
  durationText?: string;
  workLocation?: string;
  guaranteeType?: string;
  guaranteeNumber?: string;
  guaranteeAmount?: string;
  guaranteeBank?: string;
  supervisorName?: string;
  companySignerName?: string;
  workerSignerName?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  attachments?: any[];
  items?: LegalContractItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LegalContractItem {
  id?: string;
  rowNumber?: number;
  description: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
}


export interface LegalContractTemplate {
  id: string;
  kind: LegalContractKind;
  title: string;
  bodyHtml: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const contractsApi = {
  list: (params?: { kind?: string; status?: string; search?: string; projectId?: string }) =>
    api.get<LegalContract[]>('/contracts', { params }).then((r: any) => r.data),
  get: (id: string) =>
    api.get<LegalContract>('/contracts/' + id).then((r: any) => r.data),
  create: (data: Partial<LegalContract>) =>
    api.post<LegalContract>('/contracts', data).then((r: any) => r.data),
  update: (id: string, data: Partial<LegalContract>) =>
    api.patch<LegalContract>('/contracts/' + id, data).then((r: any) => r.data),
  cancel: (id: string, reason: string) =>
    api.post('/contracts/' + id + '/cancel', { reason }).then((r: any) => r.data),
  remove: (id: string, force?: boolean) =>
    api.delete('/contracts/' + id + (force ? '?force=true' : '')).then((r: any) => r.data),
  activate: (id: string) =>
    api.post('/contracts/' + id + '/activate').then((r: any) => r.data),
  complete: (id: string) =>
    api.post('/contracts/' + id + '/complete').then((r: any) => r.data),

  suspend: (id: string) =>
    api.post('/contracts/' + id + '/suspend').then((r: any) => r.data),
  terminate: (id: string) =>
    api.post('/contracts/' + id + '/terminate').then((r: any) => r.data),
  reactivate: (id: string) =>
    api.post('/contracts/' + id + '/reactivate').then((r: any) => r.data),

  listParties: (search?: string) =>
    api.get<LegalContractParty[]>('/contracts/parties/list', { params: { search } }).then((r: any) => r.data),
  getParty: (id: string) =>
    api.get<LegalContractParty>('/contracts/parties/' + id).then((r: any) => r.data),
  createParty: (data: Partial<LegalContractParty>) =>
    api.post<LegalContractParty>('/contracts/parties', data).then((r: any) => r.data),
  updateParty: (id: string, data: Partial<LegalContractParty>) =>
    api.patch<LegalContractParty>('/contracts/parties/' + id, data).then((r: any) => r.data),
  // Templates
  listTemplates: () =>
    api.get<LegalContractTemplate[]>('/contracts/templates/list').then((r: any) => r.data),
  getTemplate: (kind: LegalContractKind) =>
    api.get<LegalContractTemplate | null>('/contracts/templates/' + kind).then((r: any) => r.data),
  upsertTemplate: (kind: LegalContractKind, data: { title: string; bodyHtml: string }) =>
    api.patch<LegalContractTemplate>('/contracts/templates/' + kind, data).then((r: any) => r.data),
  // Build or fetch a Party from an EmployeeProfile (payroll)
  findOrCreatePartyFromEmployee: (employeeId: string) =>
    api.post<LegalContractParty>('/contracts/parties/from-employee/' + employeeId).then((r: any) => r.data),

  // Build or fetch a Party from a Partner (CONTRACTOR / SUPPLIER etc.)
  findOrCreatePartyFromPartner: (partnerId: string) =>
    api.post<LegalContractParty>('/contracts/parties/from-partner/' + partnerId).then((r: any) => r.data),

  // لیست قراردادهای یک طرف قرارداد (برای فرم صورت‌وضعیت)
  listByParty: (partyId: string, kind?: LegalContractKind) =>
    api.get<LegalContract[]>('/contracts/by-party/' + partyId, { params: kind ? { kind } : {} })
      .then((r: any) => r.data),
};
