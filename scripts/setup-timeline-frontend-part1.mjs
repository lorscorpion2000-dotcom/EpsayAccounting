// E:\EpsayAccounting\scripts\setup-timeline-frontend-part1.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

function w(rel, content) {
  const full = path.join(FRONTEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Timeline API Service ===\n');

w('src/modules/timeline/services/timeline.api.ts', `import { api } from '@/services/api';

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
`);

console.log('\n=== 2. Permit Form Modal ===\n');

w('src/modules/timeline/components/PermitFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, FileCheck2 } from 'lucide-react';
import { timelineApi, Permit, PermitType, PermitStatus } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: Permit | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<PermitType, string> = {
  DEMOLITION: 'پروانه تخریب',
  CONSTRUCTION: 'پروانه ساخت',
  NO_VIOLATION: 'گواهی عدم خلاف',
  COMPLETION: 'پایان کار',
  OTHER: 'سایر',
};

const STATUS_LABELS: Record<PermitStatus, string> = {
  PENDING: 'در انتظار صدور',
  ISSUED: 'صادرشده',
  EXPIRED: 'منقضی',
  CANCELLED: 'لغو‌شده',
};

interface FormData {
  projectId: string;
  type: PermitType;
  title: string;
  number?: string;
  authority?: string;
  status?: PermitStatus;
  issueDate?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function PermitFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'CONSTRUCTION', status: 'PENDING' },
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        type: editing.type,
        title: editing.title,
        number: editing.number || undefined,
        authority: editing.authority || undefined,
        status: editing.status,
        issueDate: editing.issueDate?.slice(0, 10),
        expiryDate: editing.expiryDate?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '', type: 'CONSTRUCTION', title: '',
        status: 'PENDING', number: '', authority: '',
        issueDate: undefined, expiryDate: undefined,
        attachmentUrl: '', notes: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        number: data.number || undefined,
        authority: data.authority || undefined,
        issueDate: data.issueDate || undefined,
        expiryDate: data.expiryDate || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.permits.update(editing.id, payload);
        toast.success('مجوز ویرایش شد');
      } else {
        await timelineApi.permits.create(payload);
        toast.success('مجوز ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش مجوز' : 'مجوز جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">نوع مجوز *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان *</label>
            <input type="text" {...register('title', { required: 'عنوان الزامی است' })} className="input" placeholder="مثال: پروانه ساخت طبقه سوم" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">شماره مجوز</label>
              <input type="text" {...register('number')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">مرجع صادرکننده</label>
              <input type="text" {...register('authority')} className="input" placeholder="شهرداری، نظام مهندسی..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاریخ صدور</label>
              <Controller name="issueDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
            <div>
              <label className="label">تاریخ انقضا</label>
              <Controller name="expiryDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <div>
            <label className="label">لینک فایل پیوست</label>
            <input type="text" {...register('attachmentUrl')} className="input num" dir="ltr" placeholder="https://..." />
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 3. Insurance Form Modal ===\n');

w('src/modules/timeline/components/InsuranceFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, ShieldCheck } from 'lucide-react';
import { timelineApi, Insurance, InsuranceType } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: Insurance | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<InsuranceType, string> = {
  THIRD_PARTY: 'بیمه مسئولیت مدنی',
  ACCIDENT: 'بیمه حوادث',
  FIRE: 'بیمه آتش‌سوزی',
  EQUIPMENT: 'بیمه ماشین‌آلات',
  OTHER: 'سایر',
};

interface FormData {
  projectId?: string;
  type: InsuranceType;
  title: string;
  insurer?: string;
  policyNumber?: string;
  coverageAmount?: number;
  premiumAmount?: number;
  startDate?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function InsuranceFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'THIRD_PARTY' },
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId || undefined,
        type: editing.type,
        title: editing.title,
        insurer: editing.insurer || undefined,
        policyNumber: editing.policyNumber || undefined,
        coverageAmount: editing.coverageAmount ? Number(editing.coverageAmount) : undefined,
        premiumAmount: editing.premiumAmount ? Number(editing.premiumAmount) : undefined,
        startDate: editing.startDate?.slice(0, 10),
        expiryDate: editing.expiryDate?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ type: 'THIRD_PARTY', title: '', projectId: undefined });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        projectId: data.projectId || undefined,
        insurer: data.insurer || undefined,
        policyNumber: data.policyNumber || undefined,
        coverageAmount: data.coverageAmount ? Number(data.coverageAmount) : undefined,
        premiumAmount: data.premiumAmount ? Number(data.premiumAmount) : undefined,
        startDate: data.startDate || undefined,
        expiryDate: data.expiryDate || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.insurances.update(editing.id, payload);
        toast.success('بیمه‌نامه ویرایش شد');
      } else {
        await timelineApi.insurances.create(payload);
        toast.success('بیمه‌نامه ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش بیمه‌نامه' : 'بیمه‌نامه جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع بیمه *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">پروژه (اختیاری)</label>
              <select {...register('projectId')} className="input">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان *</label>
            <input type="text" {...register('title', { required: 'عنوان الزامی است' })} className="input" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">شرکت بیمه</label>
              <input type="text" {...register('insurer')} className="input" placeholder="ایران، آسیا، ..." />
            </div>
            <div>
              <label className="label">شماره بیمه‌نامه</label>
              <input type="text" {...register('policyNumber')} className="input num" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">مبلغ پوشش (ریال)</label>
              <input type="number" step="1000" {...register('coverageAmount', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">مبلغ حق بیمه (ریال)</label>
              <input type="number" step="1000" {...register('premiumAmount', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ شروع</label>
              <Controller name="startDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
            <div>
              <label className="label">تاریخ انقضا</label>
              <Controller name="expiryDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <div>
            <label className="label">لینک فایل پیوست</label>
            <input type="text" {...register('attachmentUrl')} className="input num" dir="ltr" placeholder="https://..." />
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 4. Guarantee Form Modal ===\n');

w('src/modules/timeline/components/GuaranteeFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Lock } from 'lucide-react';
import { timelineApi, Guarantee, GuaranteeType } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: Guarantee | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<GuaranteeType, string> = {
  BANK_GUARANTEE: 'ضمانت‌نامه بانکی',
  CHECK: 'چک تضمین',
  DEPOSIT: 'وجه الضمان نقدی',
  OTHER: 'سایر',
};

interface FormData {
  projectId?: string;
  type: GuaranteeType;
  title: string;
  issuer?: string;
  beneficiary?: string;
  amount: number;
  issueDate?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function GuaranteeFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'BANK_GUARANTEE', amount: 0 },
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId || undefined,
        type: editing.type,
        title: editing.title,
        issuer: editing.issuer || undefined,
        beneficiary: editing.beneficiary || undefined,
        amount: Number(editing.amount),
        issueDate: editing.issueDate?.slice(0, 10),
        expiryDate: editing.expiryDate?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ type: 'BANK_GUARANTEE', title: '', amount: 0, projectId: undefined });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        projectId: data.projectId || undefined,
        issuer: data.issuer || undefined,
        beneficiary: data.beneficiary || undefined,
        issueDate: data.issueDate || undefined,
        expiryDate: data.expiryDate || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.guarantees.update(editing.id, payload);
        toast.success('تضمین ویرایش شد');
      } else {
        await timelineApi.guarantees.create(payload);
        toast.success('تضمین ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش تضمین' : 'تضمین جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع تضمین *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">پروژه (اختیاری)</label>
              <select {...register('projectId')} className="input">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان *</label>
            <input type="text" {...register('title', { required: 'عنوان الزامی است' })} className="input" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">صادرکننده</label>
              <input type="text" {...register('issuer')} className="input" placeholder="بانک ملت، ..." />
            </div>
            <div>
              <label className="label">ذی‌نفع</label>
              <input type="text" {...register('beneficiary')} className="input" placeholder="شهرداری، کارفرما، ..." />
            </div>
          </div>

          <div>
            <label className="label">مبلغ (ریال) *</label>
            <input type="number" step="1000" {...register('amount', { valueAsNumber: true, required: true })} className="input num text-lg" dir="ltr" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ صدور</label>
              <Controller name="issueDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
            <div>
              <label className="label">تاریخ انقضا</label>
              <Controller name="expiryDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <div>
            <label className="label">لینک فایل پیوست</label>
            <input type="text" {...register('attachmentUrl')} className="input num" dir="ltr" placeholder="https://..." />
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 5. Document Form Modal ===\n');

w('src/modules/timeline/components/DocumentFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, FileImage } from 'lucide-react';
import { timelineApi, TechnicalDocument, DocumentType, DocumentPhase } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: TechnicalDocument | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  ARCHITECTURE: 'معماری',
  STRUCTURE: 'سازه',
  MEP: 'تاسیسات مکانیکی و برقی',
  SITE_PLAN: 'پلان سایت',
  OTHER: 'سایر',
};

const PHASE_LABELS: Record<DocumentPhase, string> = {
  PHASE_1: 'فاز ۱ - نقشه‌های اولیه',
  PHASE_2: 'فاز ۲ - نقشه‌های اجرایی',
  OTHER: 'سایر',
};

interface FormData {
  projectId: string;
  type: DocumentType;
  phase: DocumentPhase;
  title: string;
  version: string;
  isApproved?: boolean;
  approvedAt?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function DocumentFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control } = useForm<FormData>({
    defaultValues: { type: 'ARCHITECTURE', phase: 'PHASE_1', version: '1.0', isApproved: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        type: editing.type,
        phase: editing.phase,
        title: editing.title,
        version: editing.version,
        isApproved: editing.isApproved,
        approvedAt: editing.approvedAt?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ projectId: '', type: 'ARCHITECTURE', phase: 'PHASE_1', title: '', version: '1.0', isApproved: false });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        approvedAt: data.approvedAt || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.documents.update(editing.id, payload);
        toast.success('سند ویرایش شد');
      } else {
        await timelineApi.documents.create(payload);
        toast.success('سند ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-md">
              <FileImage className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش سند فنی' : 'سند فنی جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">پروژه *</label>
            <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع سند *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">فاز *</label>
              <select {...register('phase')} className="input">
                {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان سند *</label>
            <input type="text" {...register('title', { required: true })} className="input" placeholder="مثال: پلان طبقه همکف" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نسخه *</label>
              <input type="text" {...register('version', { required: true })} className="input num" dir="ltr" placeholder="1.0، 2.1، ..." />
            </div>
            <div>
              <label className="label">تاریخ تایید</label>
              <Controller name="approvedAt" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isApproved')} className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm">سند تاییدشده است</span>
          </label>

          <div>
            <label className="label">لینک فایل پیوست</label>
            <input type="text" {...register('attachmentUrl')} className="input num" dir="ltr" placeholder="https://..." />
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 6. Checklist Form Modal ===\n');

w('src/modules/timeline/components/ChecklistFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { timelineApi, PhaseChecklist, ChecklistType, ChecklistItem } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: PhaseChecklist | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<ChecklistType, string> = {
  REBAR_BEFORE_CONCRETE: 'آرماتوربندی قبل از بتن‌ریزی',
  FORMWORK: 'قالب‌بندی',
  ELECTRICAL: 'تاسیسات برقی',
  PLUMBING: 'لوله‌کشی آب و فاضلاب',
  WATERPROOFING: 'ایزولاسیون و عایق‌کاری',
  OTHER: 'سایر',
};

interface FormData {
  projectId: string;
  wbsItemId?: string;
  type: ChecklistType;
  title: string;
  checklistDate?: string;
  items: ChecklistItem[];
  inspectorName?: string;
  supervisorName?: string;
  notes?: string;
}

export default function ChecklistFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);

  const { register, handleSubmit, reset, control, watch } = useForm<FormData>({
    defaultValues: {
      type: 'REBAR_BEFORE_CONCRETE',
      checklistDate: new Date().toISOString().slice(0, 10),
      items: [{ title: '', isChecked: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const projectId = watch('projectId');

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        wbsItemId: editing.wbsItemId || undefined,
        type: editing.type,
        title: editing.title,
        checklistDate: editing.checklistDate?.slice(0, 10),
        items: editing.items.length > 0 ? editing.items : [{ title: '', isChecked: false }],
        inspectorName: editing.inspectorName || undefined,
        supervisorName: editing.supervisorName || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '',
        type: 'REBAR_BEFORE_CONCRETE',
        title: '',
        checklistDate: new Date().toISOString().slice(0, 10),
        items: [{ title: '', isChecked: false }],
      });
    }
  }, [isOpen, editing, reset]);

  useEffect(() => {
    if (!projectId) { setWbsItems([]); return; }
    api.get('/wbs', { params: { projectId } }).then((r) => {
      const flat: any[] = [];
      const walk = (arr: any[], d = 0) => {
        arr.forEach((x) => {
          flat.push({ ...x, indent: '— '.repeat(d) });
          if (x.children?.length) walk(x.children, d + 1);
        });
      };
      walk(r.data || []);
      setWbsItems(flat);
    }).catch(() => setWbsItems([]));
  }, [projectId]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    if (!data.items || data.items.length === 0) {
      toast.error('حداقل یک آیتم اضافه کنید');
      return;
    }
    try {
      const payload = {
        ...data,
        wbsItemId: data.wbsItemId || undefined,
        checklistDate: data.checklistDate || new Date().toISOString().slice(0, 10),
        inspectorName: data.inspectorName || undefined,
        supervisorName: data.supervisorName || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.checklists.update(editing.id, payload);
        toast.success('چک‌لیست ویرایش شد');
      } else {
        await timelineApi.checklists.create(payload);
        toast.success('چک‌لیست ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش چک‌لیست' : 'چک‌لیست جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.indent}{it.code} — {it.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع چک‌لیست *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاریخ بازدید *</label>
              <Controller name="checklistDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
          </div>

          <div>
            <label className="label">عنوان چک‌لیست *</label>
            <input type="text" {...register('title', { required: true })} className="input" placeholder="مثال: تاییدیه آرماتوربندی ستون‌های طبقه ۳" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نام بازرس</label>
              <input type="text" {...register('inspectorName')} className="input" />
            </div>
            <div>
              <label className="label">نام ناظر</label>
              <input type="text" {...register('supervisorName')} className="input" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">آیتم‌های چک‌لیست *</label>
              <button type="button" onClick={() => append({ title: '', isChecked: false })}
                className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن آیتم
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" {...register(\`items.\${idx}.isChecked\`)} className="w-5 h-5 mt-0.5 rounded text-emerald-600" />
                  <input type="text" {...register(\`items.\${idx}.title\`, { required: true })}
                    className="input flex-1 text-sm" placeholder="شرح آیتم..." />
                  <input type="text" {...register(\`items.\${idx}.notes\`)}
                    className="input w-40 text-sm" placeholder="یادداشت" />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)}
                      className="p-2 rounded hover:bg-red-50 text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('');
console.log('=============================================');
console.log('  ✅ Timeline Frontend Part 1 ready');
console.log('=============================================');
console.log('');
console.log('Files created:');
console.log('  • services/timeline.api.ts');
console.log('  • components/PermitFormModal.tsx');
console.log('  • components/InsuranceFormModal.tsx');
console.log('  • components/GuaranteeFormModal.tsx');
console.log('  • components/DocumentFormModal.tsx');
console.log('  • components/ChecklistFormModal.tsx');
console.log('');
console.log('Next: اسکریپت ۳ (۵ صفحه + Sidebar + Router + Help)');
console.log('');