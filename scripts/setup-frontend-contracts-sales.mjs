// E:\EpsayAccounting\scripts\setup-frontend-contracts-sales.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

function w(rel, content) {
  const full = path.join(FRONTEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Contracts API Service ===\n');

w('src/modules/contracts/services/contracts.api.ts', `import api from '@/services/api';

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
  createdAt: string;
  updatedAt: string;
}

export const contractsApi = {
  list: (params?: { kind?: string; status?: string; search?: string; projectId?: string }) =>
    api.get<LegalContract[]>('/contracts', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<LegalContract>('/contracts/' + id).then((r) => r.data),
  create: (data: Partial<LegalContract>) =>
    api.post<LegalContract>('/contracts', data).then((r) => r.data),
  update: (id: string, data: Partial<LegalContract>) =>
    api.patch<LegalContract>('/contracts/' + id, data).then((r) => r.data),
  cancel: (id: string, reason: string) =>
    api.post('/contracts/' + id + '/cancel', { reason }).then((r) => r.data),
  activate: (id: string) =>
    api.post('/contracts/' + id + '/activate').then((r) => r.data),
  complete: (id: string) =>
    api.post('/contracts/' + id + '/complete').then((r) => r.data),

  listParties: (search?: string) =>
    api.get<LegalContractParty[]>('/contracts/parties/list', { params: { search } }).then((r) => r.data),
  getParty: (id: string) =>
    api.get<LegalContractParty>('/contracts/parties/' + id).then((r) => r.data),
  createParty: (data: Partial<LegalContractParty>) =>
    api.post<LegalContractParty>('/contracts/parties', data).then((r) => r.data),
  updateParty: (id: string, data: Partial<LegalContractParty>) =>
    api.patch<LegalContractParty>('/contracts/parties/' + id, data).then((r) => r.data),
};
`);

console.log('\n=== 2. Sales API Service ===\n');

w('src/modules/sales/services/sales.api.ts', `import api from '@/services/api';

export type SalesUnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DELIVERED' | 'CANCELLED';
export type SalesPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface SalesUnit {
  id: string;
  projectId: string;
  project?: { id: string; name: string; code?: string };
  unitNumber: string;
  block?: string;
  floor?: number;
  area?: string;
  bedrooms?: number;
  parkingCount?: number;
  storageCount?: number;
  listPrice?: string;
  status: SalesUnitStatus;
  notes?: string;
  createdAt: string;
}

export interface SalesCustomer {
  id: string;
  fullName: string;
  nationalId?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  bankSheba?: string;
  notes?: string;
  createdAt: string;
}

export interface SalesInstallment {
  id: string;
  contractId: string;
  sequence: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  status: SalesPaymentStatus;
  paidAt?: string;
  notes?: string;
}

export interface SalesPayment {
  id: string;
  contractId: string;
  amount: string;
  paidAt: string;
  paymentMethod?: string;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
}

export interface SalesContract {
  id: string;
  code: string;
  status: string;
  unitId: string;
  unit: SalesUnit;
  customerId: string;
  customer: SalesCustomer;
  totalPrice: string;
  discountAmount?: string;
  finalPrice: string;
  downPayment?: string;
  contractDate: string;
  deliveryDate?: string;
  bodyHtml?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  installments?: SalesInstallment[];
  payments?: SalesPayment[];
  _count?: { installments: number; payments: number };
  createdAt: string;
}

export const salesApi = {
  units: {
    list: (params?: { projectId?: string; status?: string; search?: string }) =>
      api.get<SalesUnit[]>('/sales/units', { params }).then((r) => r.data),
    get: (id: string) => api.get<SalesUnit>('/sales/units/' + id).then((r) => r.data),
    create: (data: Partial<SalesUnit>) =>
      api.post<SalesUnit>('/sales/units', data).then((r) => r.data),
    update: (id: string, data: Partial<SalesUnit>) =>
      api.patch<SalesUnit>('/sales/units/' + id, data).then((r) => r.data),
    cancel: (id: string) => api.post('/sales/units/' + id + '/cancel').then((r) => r.data),
  },
  customers: {
    list: (search?: string) =>
      api.get<SalesCustomer[]>('/sales/customers', { params: { search } }).then((r) => r.data),
    get: (id: string) => api.get<SalesCustomer>('/sales/customers/' + id).then((r) => r.data),
    create: (data: Partial<SalesCustomer>) =>
      api.post<SalesCustomer>('/sales/customers', data).then((r) => r.data),
    update: (id: string, data: Partial<SalesCustomer>) =>
      api.patch<SalesCustomer>('/sales/customers/' + id, data).then((r) => r.data),
  },
  contracts: {
    list: (params?: { status?: string; search?: string; unitId?: string; customerId?: string }) =>
      api.get<SalesContract[]>('/sales/contracts', { params }).then((r) => r.data),
    get: (id: string) => api.get<SalesContract>('/sales/contracts/' + id).then((r) => r.data),
    create: (data: any) => api.post<SalesContract>('/sales/contracts', data).then((r) => r.data),
    update: (id: string, data: any) =>
      api.patch<SalesContract>('/sales/contracts/' + id, data).then((r) => r.data),
    activate: (id: string) => api.post('/sales/contracts/' + id + '/activate').then((r) => r.data),
    cancel: (id: string, reason: string) =>
      api.post('/sales/contracts/' + id + '/cancel', { reason }).then((r) => r.data),
    summary: () => api.get('/sales/contracts/summary').then((r) => r.data),
  },
  payments: {
    list: (contractId?: string) =>
      api.get<SalesPayment[]>('/sales/payments', { params: { contractId } }).then((r) => r.data),
    create: (data: Partial<SalesPayment>) =>
      api.post<SalesPayment>('/sales/payments', data).then((r) => r.data),
  },
};
`);

console.log('\n=== 3. Contracts Pages ===\n');

w('src/modules/contracts/pages/ContractsListPage.tsx', `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, FileText, Edit, Ban, RefreshCw, Printer, FileSpreadsheet, CheckCircle2, Play } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { contractsApi, LegalContract, LegalContractKind, LegalContractStatus } from '../services/contracts.api';
import { formatJalaliDate } from '@/utils/format';
import ContractFormModal from '../components/ContractFormModal';
import CancelDialog from '../components/CancelDialog';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const STATUS_LABELS: Record<LegalContractStatus, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته',
  CANCELLED: 'ابطال‌شده',
  TERMINATED: 'فسخ‌شده',
};

const STATUS_COLORS: Record<LegalContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

export default function ContractsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LegalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LegalContract | null>(null);
  const [cancelling, setCancelling] = useState<LegalContract | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await contractsApi.list({
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [kindFilter, statusFilter]);

  const handleCancel = async (reason: string) => {
    if (!cancelling) return;
    setActionLoading(true);
    try {
      await contractsApi.cancel(cancelling.id, reason);
      toast.success('ابطال شد');
      setCancelling(null); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleActivate = async (c: LegalContract) => {
    try { await contractsApi.activate(c.id); toast.success('فعال شد'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleComplete = async (c: LegalContract) => {
    try { await contractsApi.complete(c.id); toast.success('خاتمه یافت'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => ({
      'ردیف': i + 1,
      'کد': c.code,
      'نوع': KIND_LABELS[c.kind],
      'عنوان': c.title,
      'طرف قرارداد': c.party?.fullName || '',
      'پروژه': c.project?.name || '',
      'شماره ثبت': c.registrationNumber || '',
      'وضعیت': STATUS_LABELS[c.status],
      'شروع': c.startDate ? new Date(c.startDate).toLocaleDateString('fa-IR') : '',
      'پایان': c.endDate ? new Date(c.endDate).toLocaleDateString('fa-IR') : '',
      'مبلغ کل': c.totalAmount ? Number(c.totalAmount) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Contracts');
    XLSX.writeFile(wb, 'Contracts-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            قراردادها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت قراردادهای کارگری، پیمانکاری، کارفرمایی و پیمانکار جزء</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> قرارداد جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ قراردادی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین قرارداد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">طرف قرارداد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3 text-xs">{KIND_LABELS[c.kind]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.party?.fullName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md border', STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => nav('/contracts/' + c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="مشاهده و چاپ">
                          <Printer className="w-4 h-4" />
                        </button>
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(c); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleActivate(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="فعال‌سازی">
                              <Play className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => handleComplete(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="خاتمه">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                          <button onClick={() => setCancelling(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="ابطال">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContractFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <CancelDialog isOpen={!!cancelling} title="ابطال قرارداد"
        message={'دلیل ابطال قرارداد «' + (cancelling?.title || '') + '» را وارد کنید. این عمل برگشت‌پذیر نیست.'}
        loading={actionLoading} onConfirm={handleCancel} onCancel={() => setCancelling(null)} />
    </div>
  );
}
`);

console.log('\n=== 4. Contract Form Modal ===\n');

w('src/modules/contracts/components/ContractFormModal.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2, Plus } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractParty } from '../services/contracts.api';
import { projectsApi } from '@/modules/projects/services/projects.api';
import PartyFormModal from './PartyFormModal';
import PersianDatePicker from '@/components/PersianDatePicker';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

interface Props {
  isOpen: boolean;
  editing: LegalContract | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContractFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<LegalContractParty[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showPartyModal, setShowPartyModal] = useState(false);

  const [form, setForm] = useState<any>({
    kind: 'WORKER_EMPLOYMENT',
    title: '',
    partyId: '',
    projectId: '',
    registrationNumber: '',
    registrationDate: '',
    subject: '',
    bodyHtml: '',
    totalAmount: '',
    salaryMonthly: '',
    salaryDaily: '',
    salaryHourly: '',
    workHoursPerWeek: '',
    startDate: '',
    endDate: '',
    durationText: '',
    workLocation: '',
    guaranteeType: '',
    guaranteeNumber: '',
    guaranteeAmount: '',
    guaranteeBank: '',
    supervisorName: '',
    companySignerName: '',
    workerSignerName: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      contractsApi.listParties(),
      projectsApi.list().catch(() => []),
    ]).then(([p, pr]) => {
      setParties(p);
      setProjects(pr as any[]);
    });
    if (editing) {
      setForm({
        kind: editing.kind,
        title: editing.title,
        partyId: editing.partyId,
        projectId: editing.projectId || '',
        registrationNumber: editing.registrationNumber || '',
        registrationDate: editing.registrationDate?.slice(0, 10) || '',
        subject: editing.subject || '',
        bodyHtml: editing.bodyHtml || '',
        totalAmount: editing.totalAmount ? String(editing.totalAmount) : '',
        salaryMonthly: editing.salaryMonthly ? String(editing.salaryMonthly) : '',
        salaryDaily: editing.salaryDaily ? String(editing.salaryDaily) : '',
        salaryHourly: editing.salaryHourly ? String(editing.salaryHourly) : '',
        workHoursPerWeek: editing.workHoursPerWeek || '',
        startDate: editing.startDate?.slice(0, 10) || '',
        endDate: editing.endDate?.slice(0, 10) || '',
        durationText: editing.durationText || '',
        workLocation: editing.workLocation || '',
        guaranteeType: editing.guaranteeType || '',
        guaranteeNumber: editing.guaranteeNumber || '',
        guaranteeAmount: editing.guaranteeAmount ? String(editing.guaranteeAmount) : '',
        guaranteeBank: editing.guaranteeBank || '',
        supervisorName: editing.supervisorName || '',
        companySignerName: editing.companySignerName || '',
        workerSignerName: editing.workerSignerName || '',
        notes: editing.notes || '',
      });
    } else {
      setForm({
        kind: 'WORKER_EMPLOYMENT', title: '', partyId: '', projectId: '',
        registrationNumber: '', registrationDate: '', subject: '', bodyHtml: '',
        totalAmount: '', salaryMonthly: '', salaryDaily: '', salaryHourly: '',
        workHoursPerWeek: '', startDate: '', endDate: '', durationText: '',
        workLocation: '', guaranteeType: '', guaranteeNumber: '', guaranteeAmount: '',
        guaranteeBank: '', supervisorName: '', companySignerName: '',
        workerSignerName: '', notes: '',
      });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('عنوان الزامی است'); return; }
    if (!form.partyId) { toast.error('طرف قرارداد را انتخاب کنید'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      // تبدیل اعداد
      ['totalAmount', 'salaryMonthly', 'salaryDaily', 'salaryHourly', 'guaranteeAmount', 'workHoursPerWeek'].forEach((k) => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
        else if (k === 'workHoursPerWeek') payload[k] = Number(payload[k]);
        else payload[k] = Number(payload[k]);
      });
      // حذف empty strings
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (editing) await contractsApi.update(editing.id, payload);
      else await contractsApi.create(payload);
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  const reloadParties = async () => {
    const p = await contractsApi.listParties();
    setParties(p);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-8">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="text-lg font-bold text-slate-800">
              {editing ? 'ویرایش قرارداد' : 'قرارداد جدید'}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع قرارداد *</label>
                <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className="input w-full">
                  {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان قرارداد *</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input w-full" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">طرف قرارداد *</label>
                <div className="flex gap-2">
                  <select value={form.partyId} onChange={(e) => set('partyId', e.target.value)} className="input flex-1">
                    <option value="">انتخاب کنید...</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} {p.nationalId ? '(' + p.nationalId + ')' : ''}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowPartyModal(true)} className="btn-secondary">
                    <Plus className="w-4 h-4" /> طرف جدید
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">پروژه (اختیاری)</label>
                <select value={form.projectId} onChange={(e) => set('projectId', e.target.value)} className="input w-full">
                  <option value="">— بدون پروژه —</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">شماره ثبت</label>
                <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ ثبت</label>
                <PersianDatePicker value={form.registrationDate} onChange={(v) => set('registrationDate', v || '')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ شروع</label>
                <PersianDatePicker value={form.startDate} onChange={(v) => set('startDate', v || '')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پایان</label>
                <PersianDatePicker value={form.endDate} onChange={(v) => set('endDate', v || '')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ کل (ریال)</label>
                <input type="number" value={form.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق ماهانه (ریال)</label>
                <input type="number" value={form.salaryMonthly} onChange={(e) => set('salaryMonthly', e.target.value)} className="input w-full num" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق روزانه</label>
                <input type="number" value={form.salaryDaily} onChange={(e) => set('salaryDaily', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق ساعتی</label>
                <input type="number" value={form.salaryHourly} onChange={(e) => set('salaryHourly', e.target.value)} className="input w-full num" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ساعت کار در هفته</label>
                <input type="number" value={form.workHoursPerWeek} onChange={(e) => set('workHoursPerWeek', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مدت قرارداد</label>
                <input value={form.durationText} onChange={(e) => set('durationText', e.target.value)} className="input w-full" placeholder="مثال: ۳ ماه" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">محل انجام کار</label>
                <input value={form.workLocation} onChange={(e) => set('workLocation', e.target.value)} className="input w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع تضمین</label>
                <input value={form.guaranteeType} onChange={(e) => set('guaranteeType', e.target.value)} className="input w-full" placeholder="چک / سفته / ضمانت‌نامه" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">شماره تضمین</label>
                <input value={form.guaranteeNumber} onChange={(e) => set('guaranteeNumber', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ تضمین</label>
                <input type="number" value={form.guaranteeAmount} onChange={(e) => set('guaranteeAmount', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">بانک تضمین</label>
                <input value={form.guaranteeBank} onChange={(e) => set('guaranteeBank', e.target.value)} className="input w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ناظر قرارداد</label>
                <input value={form.supervisorName} onChange={(e) => set('supervisorName', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">امضاکننده شرکت</label>
                <input value={form.companySignerName} onChange={(e) => set('companySignerName', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">امضاکننده طرف</label>
                <input value={form.workerSignerName} onChange={(e) => set('workerSignerName', e.target.value)} className="input w-full" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">موضوع قرارداد</label>
                <textarea value={form.subject} onChange={(e) => set('subject', e.target.value)} rows={3} className="input w-full resize-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">متن کامل قرارداد (HTML)</label>
                <textarea value={form.bodyHtml} onChange={(e) => set('bodyHtml', e.target.value)} rows={8} className="input w-full resize-none font-mono text-xs" dir="rtl" />
                <p className="text-xs text-slate-500 mt-1">می‌توانید متن قرارداد را اینجا Paste کنید (HTML یا متن ساده)</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
            <button onClick={onClose} className="btn-secondary">انصراف</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editing ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </div>
      </div>

      <PartyFormModal
        isOpen={showPartyModal}
        editing={null}
        onClose={() => setShowPartyModal(false)}
        onSaved={reloadParties}
      />
    </>
  );
}
`);

console.log('\n=== 5. Party Form Modal ===\n');

w('src/modules/contracts/components/PartyFormModal.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { contractsApi, LegalContractParty, LegalContractPartyKind } from '../services/contracts.api';
import PersianDatePicker from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  editing: LegalContractParty | null;
  onClose: () => void;
  onSaved: () => void;
}

const KIND_LABELS: Record<LegalContractPartyKind, string> = {
  INDIVIDUAL: 'شخص حقیقی',
  COMPANY: 'شخص حقوقی',
};

export default function PartyFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    kind: 'INDIVIDUAL', fullName: '', fatherName: '', nationalId: '',
    economicCode: '', registrationNumber: '', birthDate: '',
    mobilePhone: '', landlinePhone: '', email: '',
    maritalStatus: '', childrenCount: '', education: '', job: '',
    insuranceNumber: '', address: '', postalCode: '',
    bankName: '', bankAccount: '', bankSheba: '', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        kind: editing.kind, fullName: editing.fullName,
        fatherName: editing.fatherName || '',
        nationalId: editing.nationalId || '',
        economicCode: editing.economicCode || '',
        registrationNumber: editing.registrationNumber || '',
        birthDate: editing.birthDate?.slice(0, 10) || '',
        mobilePhone: editing.mobilePhone || '',
        landlinePhone: editing.landlinePhone || '',
        email: editing.email || '',
        maritalStatus: editing.maritalStatus || '',
        childrenCount: editing.childrenCount || '',
        education: editing.education || '',
        job: editing.job || '',
        insuranceNumber: editing.insuranceNumber || '',
        address: editing.address || '',
        postalCode: editing.postalCode || '',
        bankName: editing.bankName || '',
        bankAccount: editing.bankAccount || '',
        bankSheba: editing.bankSheba || '',
        notes: editing.notes || '',
      });
    } else {
      setForm({
        kind: 'INDIVIDUAL', fullName: '', fatherName: '', nationalId: '',
        economicCode: '', registrationNumber: '', birthDate: '',
        mobilePhone: '', landlinePhone: '', email: '',
        maritalStatus: '', childrenCount: '', education: '', job: '',
        insuranceNumber: '', address: '', postalCode: '',
        bankName: '', bankAccount: '', bankSheba: '', notes: '',
      });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { toast.error('نام الزامی است'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.childrenCount === '') delete payload.childrenCount;
      else payload.childrenCount = Number(payload.childrenCount);
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (editing) await contractsApi.updateParty(editing.id, payload);
      else await contractsApi.createParty(payload);
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش طرف قرارداد' : 'طرف قرارداد جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع *</label>
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className="input w-full">
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام پدر</label>
              <input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد ملی</label>
              <input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد اقتصادی</label>
              <input value={form.economicCode} onChange={(e) => set('economicCode', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره ثبت شرکت</label>
              <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ تولد</label>
              <PersianDatePicker value={form.birthDate} onChange={(v) => set('birthDate', v || '')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">همراه</label>
              <input value={form.mobilePhone} onChange={(e) => set('mobilePhone', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تلفن ثابت</label>
              <input value={form.landlinePhone} onChange={(e) => set('landlinePhone', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ایمیل</label>
              <input value={form.email} onChange={(e) => set('email', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تعداد فرزند</label>
              <input type="number" value={form.childrenCount} onChange={(e) => set('childrenCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تحصیلات</label>
              <input value={form.education} onChange={(e) => set('education', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شغل</label>
              <input value={form.job} onChange={(e) => set('job', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره بیمه</label>
              <input value={form.insuranceNumber} onChange={(e) => set('insuranceNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد پستی</label>
              <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بانک</label>
              <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره حساب</label>
              <input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">شبا</label>
              <input value={form.bankSheba} onChange={(e) => set('bankSheba', e.target.value)} className="input w-full num" dir="ltr" maxLength={26} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\n=== 6. Contract View Page (with print) ===\n');

w('src/modules/contracts/pages/ContractViewPage.tsx', `import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, Play, CheckCircle2, Ban } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractStatus } from '../services/contracts.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';
import CancelDialog from '../components/CancelDialog';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const STATUS_LABELS: Record<LegalContractStatus, string> = {
  DRAFT: 'پیش‌نویس', ACTIVE: 'فعال', SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته', CANCELLED: 'ابطال‌شده', TERMINATED: 'فسخ‌شده',
};

export default function ContractViewPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<LegalContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await contractsApi.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleActivate = async () => {
    if (!id) return;
    try { await contractsApi.activate(id); toast.success('فعال شد'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleComplete = async () => {
    if (!id) return;
    try { await contractsApi.complete(id); toast.success('خاتمه یافت'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await contractsApi.cancel(id, reason);
      toast.success('ابطال شد'); setCancelling(false); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
  if (!data) return <div className="p-8 text-center text-slate-500">قرارداد پیدا نشد</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {data.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1 num" dir="ltr">{data.code} — {KIND_LABELS[data.kind]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton contentRef={printRef} documentTitle={data.title} />
          {data.status === 'DRAFT' && (
            <button onClick={handleActivate} className="btn-primary">
              <Play className="w-4 h-4" /> فعال‌سازی
            </button>
          )}
          {data.status === 'ACTIVE' && (
            <button onClick={handleComplete} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" /> خاتمه
            </button>
          )}
          {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
            <button onClick={() => setCancelling(true)} className="btn-danger">
              <Ban className="w-4 h-4" /> ابطال
            </button>
          )}
        </div>
      </div>

      <div ref={printRef} className="card p-8 bg-white print-area">
        <PrintHeader title={data.title} subtitle={KIND_LABELS[data.kind]} code={data.code} />

        <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
          <div>
            <div className="text-slate-500 mb-1">طرف قرارداد:</div>
            <div className="font-bold">{data.party?.fullName}</div>
            {data.party?.nationalId && <div className="text-xs num" dir="ltr">کد ملی: {data.party.nationalId}</div>}
            {data.party?.fatherName && <div className="text-xs">فرزند: {data.party.fatherName}</div>}
          </div>
          <div>
            <div className="text-slate-500 mb-1">وضعیت:</div>
            <div className="font-bold">{STATUS_LABELS[data.status]}</div>
          </div>
          {data.project && (
            <div>
              <div className="text-slate-500 mb-1">پروژه:</div>
              <div className="font-bold">{data.project.name}</div>
            </div>
          )}
          {data.registrationNumber && (
            <div>
              <div className="text-slate-500 mb-1">شماره ثبت:</div>
              <div className="num" dir="ltr">{data.registrationNumber}</div>
            </div>
          )}
          {data.registrationDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ ثبت:</div>
              <div className="num">{formatJalaliDate(data.registrationDate)}</div>
            </div>
          )}
          {data.startDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ شروع:</div>
              <div className="num">{formatJalaliDate(data.startDate)}</div>
            </div>
          )}
          {data.endDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ پایان:</div>
              <div className="num">{formatJalaliDate(data.endDate)}</div>
            </div>
          )}
          {data.durationText && (
            <div>
              <div className="text-slate-500 mb-1">مدت:</div>
              <div>{data.durationText}</div>
            </div>
          )}
          {data.workLocation && (
            <div className="col-span-2">
              <div className="text-slate-500 mb-1">محل انجام کار:</div>
              <div>{data.workLocation}</div>
            </div>
          )}
        </div>

        {(data.totalAmount || data.salaryMonthly || data.salaryDaily || data.salaryHourly) && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="font-bold mb-3">مبالغ و حقوق</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {data.totalAmount && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">مبلغ کل</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.totalAmount))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryMonthly && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق ماهانه</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryMonthly))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryDaily && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق روزانه</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryDaily))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryHourly && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق ساعتی</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryHourly))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
            </div>
          </div>
        )}

        {(data.guaranteeType || data.guaranteeNumber || data.guaranteeAmount) && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <div className="font-bold mb-3">تضامین قراردادی</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {data.guaranteeType && <div><div className="text-slate-500 text-xs">نوع</div><div>{data.guaranteeType}</div></div>}
              {data.guaranteeNumber && <div><div className="text-slate-500 text-xs">شماره</div><div className="num" dir="ltr">{data.guaranteeNumber}</div></div>}
              {data.guaranteeAmount && <div><div className="text-slate-500 text-xs">مبلغ</div><div className="num" dir="ltr">{formatNumber(Number(data.guaranteeAmount))}</div></div>}
              {data.guaranteeBank && <div><div className="text-slate-500 text-xs">بانک</div><div>{data.guaranteeBank}</div></div>}
            </div>
          </div>
        )}

        {data.subject && (
          <div className="mt-6">
            <div className="font-bold mb-2">موضوع قرارداد</div>
            <p className="text-sm leading-7 whitespace-pre-wrap">{data.subject}</p>
          </div>
        )}

        {data.bodyHtml && (
          <div className="mt-6">
            <div className="font-bold mb-3 pb-2 border-b">متن کامل قرارداد</div>
            <div className="contract-body text-sm leading-8" dangerouslySetInnerHTML={{ __html: data.bodyHtml }} />
          </div>
        )}

        {data.notes && (
          <div className="mt-6 p-3 bg-slate-50 rounded">
            <div className="text-xs text-slate-500 mb-1">یادداشت</div>
            <div className="text-sm">{data.notes}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای شرکت</div>
            <div className="border-t border-slate-400 pt-2">{data.companySignerName || ''}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای طرف قرارداد</div>
            <div className="border-t border-slate-400 pt-2">{data.workerSignerName || data.party?.fullName || ''}</div>
          </div>
        </div>

        {data.status === 'CANCELLED' && data.cancellationReason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-bold text-red-700 mb-1">این قرارداد ابطال شده است</div>
            <div className="text-sm text-red-600">{data.cancellationReason}</div>
            {data.cancelledAt && (
              <div className="text-xs text-red-500 mt-2 num">
                تاریخ ابطال: {formatJalaliDate(data.cancelledAt)}
              </div>
            )}
          </div>
        )}
      </div>

      <CancelDialog
        isOpen={cancelling}
        title="ابطال قرارداد"
        message="دلیل ابطال را وارد کنید. این عمل برگشت‌پذیر نیست."
        loading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelling(false)}
      />
    </div>
  );
}
`);

console.log('\n=== 7. Cancel Dialog ===\n');

w('src/modules/contracts/components/CancelDialog.tsx', `import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function CancelDialog({ isOpen, title, message, loading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleClose = () => { setReason(''); onCancel(); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">{message}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input w-full resize-none"
            placeholder="دلیل ابطال..."
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
          <button onClick={handleClose} className="btn-secondary">انصراف</button>
          <button
            onClick={() => { onConfirm(reason); setReason(''); }}
            disabled={loading || !reason.trim()}
            className="btn-danger"
          >
            {loading ? 'در حال ابطال...' : 'ابطال'}
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\n=== 8. Sales Pages (units, customers, contracts) ===\n');

w('src/modules/sales/pages/SalesUnitsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Building2, Edit, Ban, RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesUnit, SalesUnitStatus } from '../services/sales.api';
import { projectsApi } from '@/modules/projects/services/projects.api';
import { formatNumber } from '@/utils/format';

const STATUS_LABELS: Record<SalesUnitStatus, string> = {
  AVAILABLE: 'قابل فروش', RESERVED: 'رزرو', SOLD: 'فروخته‌شده',
  DELIVERED: 'تحویل‌شده', CANCELLED: 'ابطال‌شده',
};

const STATUS_COLORS: Record<SalesUnitStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  RESERVED: 'bg-amber-50 text-amber-700',
  SOLD: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function SalesUnitsPage() {
  const [items, setItems] = useState<SalesUnit[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesUnit | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.units.list({
        projectId: projectFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    projectsApi.list().then(setProjects as any).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [projectFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-600" />
            واحدهای قابل فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت واحدهای مسکونی/تجاری هر پروژه</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> واحد جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو بر اساس شماره واحد یا بلوک..."
              className="input ps-10 pe-4 w-full" />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">واحدی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین واحد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">بلوک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">شماره واحد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">طبقه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">متراژ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">خواب</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">قیمت لیست</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs">{u.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{u.block || '—'}</td>
                    <td className="px-4 py-3 font-medium num">{u.unitNumber}</td>
                    <td className="px-4 py-3 text-center num">{u.floor ?? '—'}</td>
                    <td className="px-4 py-3 text-center num">{u.area ? Number(u.area).toLocaleString('fa-IR') : '—'}</td>
                    <td className="px-4 py-3 text-center num">{u.bedrooms ?? '—'}</td>
                    <td className="px-4 py-3 text-left num" dir="ltr">{u.listPrice ? formatNumber(Number(u.listPrice)) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[u.status])}>
                        {STATUS_LABELS[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(u); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UnitFormModal isOpen={showModal} editing={editing} projects={projects}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />
    </div>
  );
}

function UnitFormModal({ isOpen, editing, projects, onClose, onSaved }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    projectId: '', unitNumber: '', block: '', floor: '', area: '',
    bedrooms: '', parkingCount: '', storageCount: '', listPrice: '',
    status: 'AVAILABLE', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        projectId: editing.projectId, unitNumber: editing.unitNumber,
        block: editing.block || '', floor: editing.floor ?? '',
        area: editing.area ?? '', bedrooms: editing.bedrooms ?? '',
        parkingCount: editing.parkingCount ?? '', storageCount: editing.storageCount ?? '',
        listPrice: editing.listPrice ?? '', status: editing.status, notes: editing.notes || '',
      });
    } else {
      setForm({
        projectId: projects[0]?.id || '', unitNumber: '', block: '',
        floor: '', area: '', bedrooms: '', parkingCount: '', storageCount: '',
        listPrice: '', status: 'AVAILABLE', notes: '',
      });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.projectId) { toast.error('پروژه الزامی است'); return; }
    if (!form.unitNumber.trim()) { toast.error('شماره واحد الزامی است'); return; }
    setSaving(true);
    try {
      const p: any = { ...form };
      ['floor', 'area', 'bedrooms', 'parkingCount', 'storageCount', 'listPrice'].forEach((k) => {
        if (p[k] === '' || p[k] === null) delete p[k];
        else p[k] = Number(p[k]);
      });
      Object.keys(p).forEach((k) => { if (p[k] === '') delete p[k]; });
      if (editing) await salesApi.units.update(editing.id, p);
      else await salesApi.units.create(p);
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved(); onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">{editing ? 'ویرایش واحد' : 'واحد جدید'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">پروژه *</label>
              <select value={form.projectId} onChange={(e) => set('projectId', e.target.value)} className="input w-full">
                <option value="">انتخاب کنید...</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بلوک</label>
              <input value={form.block} onChange={(e) => set('block', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره واحد *</label>
              <input value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} className="input w-full num" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">طبقه</label>
              <input type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">متراژ (متر مربع)</label>
              <input type="number" value={form.area} onChange={(e) => set('area', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تعداد خواب</label>
              <input type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">پارکینگ</label>
              <input type="number" value={form.parkingCount} onChange={(e) => set('parkingCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">انبار</label>
              <input type="number" value={form.storageCount} onChange={(e) => set('storageCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت لیست (ریال)</label>
              <input type="number" value={form.listPrice} onChange={(e) => set('listPrice', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">وضعیت</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\n=== 9. Sales Contracts List ===\n');

w('src/modules/sales/pages/SalesContractsListPage.tsx', `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, ShoppingBag, Edit, Ban, RefreshCw, Eye, Play } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesContract } from '../services/sales.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس', ACTIVE: 'فعال', COMPLETED: 'خاتمه',
  CANCELLED: 'ابطال', SUSPENDED: 'معلق', TERMINATED: 'فسخ',
};

export default function SalesContractsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<SalesContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.contracts.list({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            قراردادهای فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت قرارداد فروش واحدها با تقسیط و پرداخت</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => nav('/sales/contracts/new')}>
            <Plus className="w-4 h-4" /> قرارداد جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">قرارداد فروشی ثبت نشده</p>
            <button className="btn-primary" onClick={() => nav('/sales/contracts/new')}>
              <Plus className="w-4 h-4" /> اولین قرارداد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">مشتری</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">واحد / پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ نهایی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.customer?.fullName}</div>
                      {c.customer?.nationalId && <div className="text-xs num text-slate-500" dir="ltr">{c.customer.nationalId}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>واحد {c.unit?.unitNumber}{c.unit?.block ? ' - بلوک ' + c.unit.block : ''}</div>
                      <div className="text-slate-500">{c.unit?.project?.name}</div>
                    </td>
                    <td className="px-4 py-3 num text-xs">{formatJalaliDate(c.contractDate)}</td>
                    <td className="px-4 py-3 text-left num font-bold text-emerald-700" dir="ltr">
                      {formatNumber(Number(c.finalPrice))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-md',
                        c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                        c.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                        c.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => nav('/sales/contracts/' + c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`);

console.log('\n=== 10. Sales Contract Form Page ===\n');

w('src/modules/sales/pages/SalesContractFormPage.tsx', `import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { salesApi, SalesUnit, SalesCustomer } from '../services/sales.api';
import { formatNumber } from '@/utils/format';
import PersianDatePicker from '@/components/PersianDatePicker';

export default function SalesContractFormPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<SalesUnit[]>([]);
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);

  const [form, setForm] = useState<any>({
    unitId: '', customerId: '',
    totalPrice: '', discountAmount: '', finalPrice: '', downPayment: '',
    contractDate: new Date().toISOString().slice(0, 10),
    deliveryDate: '', bodyHtml: '', notes: '',
    installments: [] as any[],
  });

  useEffect(() => {
    Promise.all([
      salesApi.units.list({ status: 'AVAILABLE' }),
      salesApi.customers.list(),
    ]).then(([u, c]) => { setUnits(u); setCustomers(c); });

    if (isEdit && id) {
      setLoading(true);
      salesApi.contracts.get(id).then((c) => {
        setForm({
          unitId: c.unitId, customerId: c.customerId,
          totalPrice: c.totalPrice, discountAmount: c.discountAmount || '',
          finalPrice: c.finalPrice, downPayment: c.downPayment || '',
          contractDate: c.contractDate.slice(0, 10),
          deliveryDate: c.deliveryDate?.slice(0, 10) || '',
          bodyHtml: c.bodyHtml || '', notes: c.notes || '',
          installments: [],
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // auto compute final price
  useEffect(() => {
    const t = Number(form.totalPrice) || 0;
    const d = Number(form.discountAmount) || 0;
    if (t > 0 && (!form.finalPrice || Number(form.finalPrice) === 0)) {
      set('finalPrice', String(t - d));
    }
  }, [form.totalPrice, form.discountAmount]);

  const addInstallment = () => {
    setForm((f: any) => ({
      ...f,
      installments: [
        ...f.installments,
        { sequence: f.installments.length + 1, dueDate: '', amount: '', notes: '' },
      ],
    }));
  };

  const removeInstallment = (i: number) => {
    setForm((f: any) => ({
      ...f,
      installments: f.installments.filter((_: any, idx: number) => idx !== i),
    }));
  };

  const updateInstallment = (i: number, k: string, v: any) => {
    setForm((f: any) => ({
      ...f,
      installments: f.installments.map((it: any, idx: number) => idx === i ? { ...it, [k]: v } : it),
    }));
  };

  const submit = async () => {
    if (!form.unitId) { toast.error('واحد را انتخاب کنید'); return; }
    if (!form.customerId) { toast.error('مشتری را انتخاب کنید'); return; }
    if (!form.totalPrice || !form.finalPrice) { toast.error('مبالغ الزامی است'); return; }
    setSaving(true);
    try {
      const payload: any = {
        unitId: form.unitId,
        customerId: form.customerId,
        totalPrice: Number(form.totalPrice),
        discountAmount: form.discountAmount ? Number(form.discountAmount) : undefined,
        finalPrice: Number(form.finalPrice),
        downPayment: form.downPayment ? Number(form.downPayment) : undefined,
        contractDate: form.contractDate,
        deliveryDate: form.deliveryDate || undefined,
        bodyHtml: form.bodyHtml || undefined,
        notes: form.notes || undefined,
        installments: form.installments
          .filter((i: any) => i.dueDate && i.amount)
          .map((i: any) => ({
            sequence: Number(i.sequence),
            dueDate: i.dueDate,
            amount: Number(i.amount),
            notes: i.notes || undefined,
          })),
      };

      if (isEdit && id) await salesApi.contracts.update(id, payload);
      else await salesApi.contracts.create(payload);
      toast.success('ذخیره شد');
      nav('/sales/contracts');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/sales/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'ویرایش قرارداد فروش' : 'قرارداد فروش جدید'}
        </h1>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">واحد *</label>
            <select value={form.unitId} onChange={(e) => {
              const u = units.find(x => x.id === e.target.value);
              setForm((f: any) => ({
                ...f,
                unitId: e.target.value,
                totalPrice: u?.listPrice ? String(u.listPrice) : f.totalPrice,
              }));
            }} className="input w-full">
              <option value="">انتخاب کنید...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.project?.name} - واحد {u.unitNumber}{u.block ? ' (بلوک ' + u.block + ')' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مشتری *</label>
            <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} className="input w-full">
              <option value="">انتخاب کنید...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} {c.nationalId ? '(' + c.nationalId + ')' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ قرارداد *</label>
            <PersianDatePicker value={form.contractDate} onChange={(v) => set('contractDate', v || '')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ تحویل</label>
            <PersianDatePicker value={form.deliveryDate} onChange={(v) => set('deliveryDate', v || '')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ کل (ریال) *</label>
            <input type="number" value={form.totalPrice} onChange={(e) => set('totalPrice', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تخفیف</label>
            <input type="number" value={form.discountAmount} onChange={(e) => set('discountAmount', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ نهایی *</label>
            <input type="number" value={form.finalPrice} onChange={(e) => set('finalPrice', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">پیش‌پرداخت</label>
            <input type="number" value={form.downPayment} onChange={(e) => set('downPayment', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">اقساط</label>
            <button onClick={addInstallment} className="btn-secondary text-xs">
              <Plus className="w-3 h-3" /> افزودن قسط
            </button>
          </div>
          {form.installments.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4 border border-dashed rounded-lg">
              قسطی تعریف نشده
            </div>
          ) : (
            <div className="space-y-2">
              {form.installments.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 w-8 num text-center">{it.sequence}</span>
                  <PersianDatePicker value={it.dueDate} onChange={(v) => updateInstallment(i, 'dueDate', v || '')} />
                  <input type="number" value={it.amount}
                    onChange={(e) => updateInstallment(i, 'amount', e.target.value)}
                    placeholder="مبلغ" className="input num flex-1" dir="ltr" />
                  <button onClick={() => removeInstallment(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="text-xs text-slate-500 text-left num pt-2">
                جمع اقساط: {formatNumber(form.installments.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} ریال
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">متن قرارداد (HTML)</label>
          <textarea value={form.bodyHtml} onChange={(e) => set('bodyHtml', e.target.value)}
            rows={6} className="input w-full resize-none font-mono text-xs" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            rows={2} className="input w-full resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={() => nav('/sales/contracts')} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\n=== 11. Sales Contract Detail ===\n');

w('src/modules/sales/pages/SalesContractDetailPage.tsx', `import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, Plus, Play, Ban, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesContract } from '../services/sales.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';
import PaymentFormModal from '../components/PaymentFormModal';
import CancelDialog from '@/modules/contracts/components/CancelDialog';

export default function SalesContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await salesApi.contracts.get(id)); }
    catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleActivate = async () => {
    if (!id) return;
    try { await salesApi.contracts.activate(id); toast.success('فعال شد'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await salesApi.contracts.cancel(id, reason);
      toast.success('ابطال شد'); setCancelling(false); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">قرارداد پیدا نشد</div>;

  const totalPaid = (data.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(data.finalPrice) - totalPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/sales/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{data.customer?.fullName}</h1>
            <p className="text-sm text-slate-500 num" dir="ltr">{data.code} — واحد {data.unit?.unitNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton contentRef={printRef} documentTitle={'قرارداد فروش ' + data.code} />
          {data.status === 'DRAFT' && (
            <button onClick={handleActivate} className="btn-primary"><Play className="w-4 h-4" /> فعال</button>
          )}
          {data.status === 'ACTIVE' && (
            <button onClick={() => setShowPay(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> پرداخت
            </button>
          )}
          {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
            <button onClick={() => setCancelling(true)} className="btn-danger"><Ban className="w-4 h-4" /> ابطال</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">مبلغ نهایی</div>
          <div className="text-xl font-bold num" dir="ltr">{formatNumber(Number(data.finalPrice))}</div>
          <div className="text-xs text-slate-500">ریال</div>
        </div>
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-emerald-700 mb-1">پرداخت‌شده</div>
          <div className="text-xl font-bold num text-emerald-700" dir="ltr">{formatNumber(totalPaid)}</div>
        </div>
        <div className={clsx('card p-4', remaining > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200')}>
          <div className={clsx('text-xs mb-1', remaining > 0 ? 'text-amber-700' : 'text-emerald-700')}>باقیمانده</div>
          <div className={clsx('text-xl font-bold num', remaining > 0 ? 'text-amber-700' : 'text-emerald-700')} dir="ltr">
            {formatNumber(remaining)}
          </div>
        </div>
      </div>

      <div ref={printRef} className="card p-8 bg-white">
        <PrintHeader title={'قرارداد فروش واحد ' + data.unit?.unitNumber}
          subtitle={data.unit?.project?.name || ''} code={data.code} />

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <div className="text-slate-500">مشتری:</div>
            <div className="font-bold">{data.customer?.fullName}</div>
            {data.customer?.nationalId && <div className="text-xs num" dir="ltr">کد ملی: {data.customer.nationalId}</div>}
          </div>
          <div>
            <div className="text-slate-500">واحد:</div>
            <div className="font-bold">واحد {data.unit?.unitNumber}{data.unit?.block ? ' / بلوک ' + data.unit.block : ''}</div>
          </div>
          <div>
            <div className="text-slate-500">تاریخ قرارداد:</div>
            <div className="num">{formatJalaliDate(data.contractDate)}</div>
          </div>
          {data.deliveryDate && (
            <div>
              <div className="text-slate-500">تاریخ تحویل:</div>
              <div className="num">{formatJalaliDate(data.deliveryDate)}</div>
            </div>
          )}
        </div>

        {(data.installments || []).length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-3">اقساط</div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2 w-12">#</th>
                  <th className="border p-2 w-32">سررسید</th>
                  <th className="border p-2 text-left">مبلغ</th>
                  <th className="border p-2 text-left">پرداخت‌شده</th>
                  <th className="border p-2 w-24">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {(data.installments || []).map((it) => (
                  <tr key={it.id} className={it.status === 'PAID' ? 'bg-emerald-50/40' : ''}>
                    <td className="border p-2 text-center num">{it.sequence}</td>
                    <td className="border p-2 text-center num">{formatJalaliDate(it.dueDate)}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.amount))}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.paidAmount))}</td>
                    <td className="border p-2 text-center text-xs">
                      {it.status === 'PAID' ? 'پرداخت‌شده' : it.status === 'PENDING' ? 'در انتظار' : it.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data.payments || []).length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-3">پرداخت‌های انجام‌شده</div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2 w-32">تاریخ</th>
                  <th className="border p-2 text-left">مبلغ</th>
                  <th className="border p-2">روش</th>
                  <th className="border p-2">مرجع</th>
                </tr>
              </thead>
              <tbody>
                {(data.payments || []).map((p) => (
                  <tr key={p.id}>
                    <td className="border p-2 text-center num">{formatJalaliDate(p.paidAt)}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(p.amount))}</td>
                    <td className="border p-2 text-center">{p.paymentMethod || '—'}</td>
                    <td className="border p-2 text-center num" dir="ltr">{p.referenceNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای شرکت</div>
            <div className="border-t border-slate-400 pt-2"></div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای مشتری</div>
            <div className="border-t border-slate-400 pt-2">{data.customer?.fullName}</div>
          </div>
        </div>

        {data.status === 'CANCELLED' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-bold text-red-700 mb-1">این قرارداد ابطال شده است</div>
            <div className="text-sm text-red-600">{data.cancellationReason}</div>
          </div>
        )}
      </div>

      <PaymentFormModal isOpen={showPay} contractId={data.id}
        remaining={remaining} onClose={() => setShowPay(false)} onSaved={load} />

      <CancelDialog isOpen={cancelling} title="ابطال قرارداد فروش"
        message="دلیل ابطال را وارد کنید. واحد آزاد خواهد شد." loading={actionLoading}
        onConfirm={handleCancel} onCancel={() => setCancelling(false)} />
    </div>
  );
}
`);

console.log('\n=== 12. Payment Form Modal ===\n');

w('src/modules/sales/components/PaymentFormModal.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { salesApi } from '../services/sales.api';
import PersianDatePicker from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  contractId: string;
  remaining: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentFormModal({ isOpen, contractId, remaining, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    amount: '', paidAt: new Date().toISOString().slice(0, 10),
    paymentMethod: '', referenceNumber: '', bankName: '', notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        amount: String(remaining),
        paidAt: new Date().toISOString().slice(0, 10),
        paymentMethod: '', referenceNumber: '', bankName: '', notes: '',
      });
    }
  }, [isOpen, remaining]);

  if (!isOpen) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('مبلغ الزامی است'); return; }
    setSaving(true);
    try {
      await salesApi.payments.create({
        contractId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        paymentMethod: form.paymentMethod || undefined,
        referenceNumber: form.referenceNumber || undefined,
        bankName: form.bankName || undefined,
        notes: form.notes || undefined,
      });
      toast.success('پرداخت ثبت شد');
      onSaved(); onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">ثبت پرداخت</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg text-sm">
            <span className="text-amber-700">باقیمانده: </span>
            <span className="num font-bold text-amber-700" dir="ltr">{remaining.toLocaleString('en-US')}</span>
            <span className="text-amber-700"> ریال</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ پرداخت *</label>
            <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پرداخت *</label>
            <PersianDatePicker value={form.paidAt} onChange={(v) => set('paidAt', v || '')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">روش پرداخت</label>
              <input value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}
                placeholder="نقد / چک / کارت به کارت" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره پیگیری</label>
              <input value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">بانک</label>
            <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\n════════════════════════════════════════════════');
console.log('  ✅ Frontend Contracts + Sales Complete!');
console.log('════════════════════════════════════════════════');
console.log('');
console.log('Created:');
console.log('  • modules/contracts/services/contracts.api.ts');
console.log('  • modules/contracts/pages/ContractsListPage.tsx');
console.log('  • modules/contracts/pages/ContractViewPage.tsx');
console.log('  • modules/contracts/components/ContractFormModal.tsx');
console.log('  • modules/contracts/components/PartyFormModal.tsx');
console.log('  • modules/contracts/components/CancelDialog.tsx');
console.log('  • modules/sales/services/sales.api.ts');
console.log('  • modules/sales/pages/SalesUnitsPage.tsx');
console.log('  • modules/sales/pages/SalesContractsListPage.tsx');
console.log('  • modules/sales/pages/SalesContractFormPage.tsx');
console.log('  • modules/sales/pages/SalesContractDetailPage.tsx');
console.log('  • modules/sales/components/PaymentFormModal.tsx');
console.log('');
console.log('Next: Step 4 — Patch router + sidebar + help');
console.log('');