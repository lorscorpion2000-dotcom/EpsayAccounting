// E:\EpsayAccounting\scripts\setup-partner-capital-frontend.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

function w(rel, content) {
  const full = path.join(FRONTEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. API Service ===\n');

w('src/modules/partner-capital/services/partner-capital.api.ts', `import { api } from '@/services/api';

export interface CapitalAccount {
  id: string;
  code: string;
  partnerId: string;
  partner: { id: string; code: string; name: string; type: string };
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  balance: string;
  isActive: boolean;
  notes?: string | null;
  _count?: { contributions: number; withdrawals: number };
  createdAt: string;
}

export interface Contribution {
  id: string;
  code: string;
  accountId: string;
  account: { id: string; code: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  projectId?: string | null;
  type: 'CASH' | 'NON_CASH';
  category: string;
  amount: string;
  currency: string;
  contributionDate: string;
  description?: string | null;
  valuationNotes?: string | null;
  referenceCode?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  code: string;
  accountId: string;
  account: { id: string; code: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  projectId?: string | null;
  amount: string;
  withdrawalDate: string;
  reason?: string | null;
  targetProjectId?: string | null;
  transferToContribution: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface PartnerShare {
  id: string;
  projectId: string;
  project: { id: string; code: string; name: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  sharePercent: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface BalanceSheet {
  accounts: {
    id: string; code: string;
    partnerName: string; partnerCode: string;
    projectName: string; projectCode: string;
    balance: number;
  }[];
  totals: { contributions: number; withdrawals: number; net: number };
}

export interface PartnerStatement {
  partner: any;
  summary: { totalContributions: number; totalWithdrawals: number; netBalance: number };
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  accounts: { id: string; code: string; projectName: string; balance: number }[];
  shares: { projectName: string; sharePercent: number; effectiveFrom: string; effectiveTo?: string | null }[];
}

export const partnerCapitalApi = {
  accounts: {
    list: async (params?: { partnerId?: string; projectId?: string }) => {
      const { data } = await api.get<CapitalAccount[]>('/partner-capital/accounts', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<CapitalAccount>('/partner-capital/accounts/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<CapitalAccount>('/partner-capital/accounts', payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/accounts/' + id);
      return data;
    },
  },

  contributions: {
    list: async (params?: { partnerId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<Contribution[]>('/partner-capital/contributions', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Contribution>('/partner-capital/contributions/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Contribution>('/partner-capital/contributions', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Contribution>('/partner-capital/contributions/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/contributions/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/reject', { reason });
      return data;
    },
  },

  withdrawals: {
    list: async (params?: { partnerId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<Withdrawal[]>('/partner-capital/withdrawals', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Withdrawal>('/partner-capital/withdrawals/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Withdrawal>('/partner-capital/withdrawals', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Withdrawal>('/partner-capital/withdrawals/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/withdrawals/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/reject', { reason });
      return data;
    },
  },

  shares: {
    list: async (params?: { projectId?: string; partnerId?: string }) => {
      const { data } = await api.get<PartnerShare[]>('/partner-capital/shares', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PartnerShare>('/partner-capital/shares/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PartnerShare>('/partner-capital/shares', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PartnerShare>('/partner-capital/shares/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/shares/' + id);
      return data;
    },
  },

  reports: {
    balanceSheet: async () => {
      const { data } = await api.get<BalanceSheet>('/partner-capital/reports/balance-sheet');
      return data;
    },
    partnerStatement: async (partnerId: string) => {
      const { data } = await api.get<PartnerStatement>(
        '/partner-capital/reports/partner-statement/' + partnerId,
      );
      return data;
    },
  },
};
`);

console.log('\n=== 2. Capital Account Form Modal ===\n');

w('src/modules/partner-capital/components/CapitalAccountFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Wallet } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { api } from '@/services/api';
import type { Partner, Project } from '@/types/project';
import type { CapitalAccount } from '../services/partner-capital.api';

interface Props {
  isOpen: boolean;
  editing?: CapitalAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  partnerId: string;
  projectId?: string;
  notes?: string;
}

export default function CapitalAccountFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      partnersApi.list({ type: 'PARTNER' }).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([p, pr]) => { setPartners(p); setProjects(pr); });

    if (editing) {
      reset({
        partnerId: editing.partnerId,
        projectId: editing.projectId || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ partnerId: '', projectId: undefined, notes: undefined });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, projectId: data.projectId || undefined };
      if (isEdit) {
        toast.error('حساب سرمایه قابل ویرایش نیست');
        return;
      }
      await partnerCapitalApi.accounts.create(payload);
      toast.success('حساب سرمایه ایجاد شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'حساب سرمایه' : 'حساب سرمایه جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">شریک *</label>
            <select
              {...register('partnerId', { required: 'انتخاب شریک الزامی است' })}
              className="input"
              disabled={isEdit}
            >
              <option value="">— انتخاب کنید —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.partnerId && <p className="text-xs text-red-500 mt-1">{errors.partnerId.message}</p>}
          </div>

          <div>
            <label className="label">پروژه (اختیاری)</label>
            <select {...register('projectId')} className="input" disabled={isEdit}>
              <option value="">— شرکت (عمومی) —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              خالی بگذارید تا حساب به‌عنوان حساب عمومی شرکت ایجاد شود
            </p>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              ایجاد حساب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 3. Contribution Form Modal ===\n');

w('src/modules/partner-capital/components/ContributionFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, TrendingUp } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { CapitalAccount, Contribution } from '../services/partner-capital.api';
import { formatNumber } from '@/utils/format';

interface Props {
  isOpen: boolean;
  editing?: Contribution | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { value: 'CASH_DEPOSIT', label: 'واریز نقدی' },
  { value: 'BANK_TRANSFER', label: 'حواله بانکی' },
  { value: 'PETTY_CASH', label: 'تنخواه' },
  { value: 'LAND', label: 'زمین' },
  { value: 'MATERIALS', label: 'مصالح' },
  { value: 'SERVICES', label: 'خدمات' },
  { value: 'EQUIPMENT', label: 'تجهیزات' },
  { value: 'VEHICLE', label: 'خودرو' },
  { value: 'OTHER', label: 'سایر' },
];

interface FormData {
  accountId: string;
  partnerId: string;
  projectId?: string;
  type: 'CASH' | 'NON_CASH';
  category: string;
  amount: number;
  contributionDate?: string;
  description?: string;
  valuationNotes?: string;
  referenceCode?: string;
}

export default function ContributionFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: 'CASH',
      category: 'CASH_DEPOSIT',
      contributionDate: new Date().toISOString().slice(0, 10),
    },
  });

  const amount = watch('amount') || 0;
  const accountId = watch('accountId');
  const selectedAccount = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (!isOpen) return;
    partnerCapitalApi.accounts.list().then(setAccounts).catch(() => []);

    if (editing) {
      reset({
        accountId: editing.accountId,
        partnerId: editing.partnerId,
        projectId: editing.projectId || undefined,
        type: editing.type,
        category: editing.category,
        amount: Number(editing.amount),
        contributionDate: editing.contributionDate?.slice(0, 10),
        description: editing.description || undefined,
        valuationNotes: editing.valuationNotes || undefined,
        referenceCode: editing.referenceCode || undefined,
      });
    } else {
      reset({
        accountId: '',
        partnerId: '',
        projectId: undefined,
        type: 'CASH',
        category: 'CASH_DEPOSIT',
        amount: 0,
        contributionDate: new Date().toISOString().slice(0, 10),
        description: '',
        valuationNotes: '',
        referenceCode: '',
      });
    }
  }, [isOpen, editing, reset]);

  // وقتی حساب انتخاب شد، partnerId و projectId ست می‌شوند
  useEffect(() => {
    if (selectedAccount) {
      const form = document.querySelector('form');
      // استفاده از setValue از طریق یک trick ساده
    }
  }, [selectedAccount]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    const acc = accounts.find((a) => a.id === data.accountId);
    if (!acc) { toast.error('ابتدا حساب را انتخاب کنید'); return; }

    try {
      const payload = {
        ...data,
        partnerId: acc.partnerId,
        projectId: acc.projectId || undefined,
        amount: Number(data.amount),
      };
      if (isEdit && editing) {
        await partnerCapitalApi.contributions.update(editing.id, payload);
        toast.success('آورده ویرایش شد');
      } else {
        await partnerCapitalApi.contributions.create(payload);
        toast.success('آورده ثبت شد');
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش آورده' : 'ثبت آورده جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">حساب سرمایه *</label>
            <select {...register('accountId', { required: 'حساب الزامی است' })} className="input">
              <option value="">— انتخاب کنید —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.partner.name} — {a.project?.name || 'شرکت (عمومی)'} ({a.code})
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-xs text-red-500 mt-1">{errors.accountId.message}</p>}
            {selectedAccount && (
              <p className="text-xs text-slate-500 mt-1">
                موجودی فعلی حساب: <span className="num font-bold text-emerald-600">{formatNumber(Number(selectedAccount.balance))}</span> ریال
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع آورده *</label>
              <select {...register('type')} className="input">
                <option value="CASH">نقدی</option>
                <option value="NON_CASH">غیرنقدی (زمین، مصالح، خدمات)</option>
              </select>
            </div>
            <div>
              <label className="label">دسته *</label>
              <select {...register('category')} className="input">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">مبلغ (ریال) *</label>
              <input
                type="number"
                step="1"
                {...register('amount', {
                  required: 'مبلغ الزامی است',
                  valueAsNumber: true,
                  min: { value: 1, message: 'مبلغ باید بزرگ‌تر از صفر باشد' },
                })}
                className="input num text-lg"
                dir="ltr"
                placeholder="0"
              />
              {amount > 0 && (
                <p className="text-xs text-slate-500 mt-1 num">{formatNumber(amount)} ریال</p>
              )}
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">تاریخ آورده *</label>
              <Controller
                name="contributionDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div>
            <label className="label">شرح</label>
            <input type="text" {...register('description')} className="input" placeholder="مثال: واریز به حساب بانک ملت" />
          </div>

          {watch('type') === 'NON_CASH' && (
            <div>
              <label className="label">یادداشت ارزیابی</label>
              <textarea rows={2} {...register('valuationNotes')} className="input resize-none" placeholder="روش ارزش‌گذاری دارایی غیرنقدی..." />
            </div>
          )}

          <div>
            <label className="label">کد مرجع (اختیاری)</label>
            <input type="text" {...register('referenceCode')} className="input num" dir="ltr" placeholder="مثال: شماره فیش بانکی" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت آورده'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 4. Withdrawal Form Modal ===\n');

w('src/modules/partner-capital/components/WithdrawalFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, TrendingDown, AlertCircle } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { CapitalAccount, Withdrawal } from '../services/partner-capital.api';
import type { Project } from '@/types/project';
import { formatNumber } from '@/utils/format';

interface Props {
  isOpen: boolean;
  editing?: Withdrawal | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  accountId: string;
  amount: number;
  withdrawalDate?: string;
  reason?: string;
  targetProjectId?: string;
  transferToContribution?: boolean;
}

export default function WithdrawalFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, watch } = useForm<FormData>({
    defaultValues: {
      withdrawalDate: new Date().toISOString().slice(0, 10),
      transferToContribution: false,
    },
  });

  const amount = watch('amount') || 0;
  const accountId = watch('accountId');
  const transferToContribution = watch('transferToContribution');
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const balance = Number(selectedAccount?.balance || 0);
  const exceedsBalance = amount > balance;

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      partnerCapitalApi.accounts.list(),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([a, p]) => { setAccounts(a); setProjects(p); });

    if (editing) {
      reset({
        accountId: editing.accountId,
        amount: Number(editing.amount),
        withdrawalDate: editing.withdrawalDate?.slice(0, 10),
        reason: editing.reason || undefined,
        targetProjectId: editing.targetProjectId || undefined,
        transferToContribution: editing.transferToContribution,
      });
    } else {
      reset({
        accountId: '',
        amount: 0,
        withdrawalDate: new Date().toISOString().slice(0, 10),
        reason: '',
        targetProjectId: undefined,
        transferToContribution: false,
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    const acc = accounts.find((a) => a.id === data.accountId);
    if (!acc) { toast.error('ابتدا حساب را انتخاب کنید'); return; }
    if (exceedsBalance) { toast.error('مبلغ از موجودی حساب بیشتر است'); return; }

    try {
      const payload = {
        accountId: data.accountId,
        partnerId: acc.partnerId,
        projectId: acc.projectId || undefined,
        amount: Number(data.amount),
        withdrawalDate: data.withdrawalDate,
        reason: data.reason || undefined,
        targetProjectId: data.transferToContribution ? data.targetProjectId : undefined,
        transferToContribution: data.transferToContribution ?? false,
      };
      if (isEdit && editing) {
        await partnerCapitalApi.withdrawals.update(editing.id, payload);
        toast.success('برداشت ویرایش شد');
      } else {
        await partnerCapitalApi.withdrawals.create(payload);
        toast.success('برداشت ثبت شد');
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش برداشت' : 'ثبت برداشت جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">حساب سرمایه *</label>
            <select {...register('accountId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.partner.name} — {a.project?.name || 'شرکت (عمومی)'} ({a.code})
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-slate-500 mt-1">
                موجودی فعلی: <span className="num font-bold text-emerald-600">{formatNumber(balance)}</span> ریال
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">مبلغ (ریال) *</label>
              <input
                type="number"
                step="1"
                {...register('amount', { valueAsNumber: true, required: true, min: 1 })}
                className="input num text-lg"
                dir="ltr"
                placeholder="0"
              />
              {amount > 0 && (
                <p className="text-xs text-slate-500 mt-1 num">{formatNumber(amount)} ریال</p>
              )}
            </div>
            <div>
              <label className="label">تاریخ *</label>
              <Controller
                name="withdrawalDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {exceedsBalance && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                مبلغ از موجودی حساب ({formatNumber(balance)} ریال) بیشتر است
              </div>
            </div>
          )}

          <div>
            <label className="label">دلیل برداشت</label>
            <textarea rows={2} {...register('reason')} className="input resize-none" placeholder="مثال: برداشت شخصی، انتقال به پروژه دیگر" />
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('transferToContribution')}
                className="w-5 h-5 mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-800">انتقال به عنوان آورده به پروژه دیگر</div>
                <p className="text-xs text-slate-500 mt-1">
                  مبلغ برداشت‌شده از این حساب، به‌عنوان آورده در حساب شریک در پروژه مقصد ثبت می‌شود
                </p>
              </div>
            </label>
          </div>

          {transferToContribution && (
            <div>
              <label className="label">پروژه مقصد *</label>
              <select {...register('targetProjectId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary" disabled={exceedsBalance}>
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت برداشت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 5. Share Form Modal ===\n');

w('src/modules/partner-capital/components/ShareFormModal.tsx', `import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, PieChart } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { PartnerShare } from '../services/partner-capital.api';
import type { Partner, Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: PartnerShare | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  projectId: string;
  partnerId: string;
  sharePercent: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

export default function ShareFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { effectiveFrom: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      partnersApi.list({ type: 'PARTNER' }).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([p, pr]) => { setPartners(p); setProjects(pr); });

    if (editing) {
      reset({
        projectId: editing.projectId,
        partnerId: editing.partnerId,
        sharePercent: Number(editing.sharePercent),
        effectiveFrom: editing.effectiveFrom?.slice(0, 10),
        effectiveTo: editing.effectiveTo?.slice(0, 10),
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '',
        partnerId: '',
        sharePercent: 0,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: undefined,
        notes: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        sharePercent: Number(data.sharePercent),
        effectiveTo: data.effectiveTo || undefined,
      };
      if (isEdit && editing) {
        await partnerCapitalApi.shares.update(editing.id, payload);
        toast.success('سهم ویرایش شد');
      } else {
        await partnerCapitalApi.shares.create(payload);
        toast.success('سهم ثبت شد');
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-md">
              <PieChart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش سهم' : 'ثبت سهم جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">پروژه *</label>
            <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">شریک *</label>
            <select {...register('partnerId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">درصد سهم (٪) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('sharePercent', { valueAsNumber: true, required: true, min: 0, max: 100 })}
              className="input num text-lg"
              dir="ltr"
              placeholder="0"
            />
            <p className="text-xs text-slate-500 mt-1">
              مجموع سهم‌ها در هر تاریخ نباید از ۱۰۰٪ بیشتر شود
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اعتبار از تاریخ *</label>
              <Controller
                name="effectiveFrom"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div>
              <label className="label">اعتبار تا تاریخ</label>
              <Controller
                name="effectiveTo"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />
                )}
              />
            </div>
          </div>

          <div>
            <label className="label">یادداشت</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت سهم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`);

console.log('\n=== 6. Routes Export ===\n');

w('src/modules/partner-capital/partner-capital.routes.tsx', `// این فایل برای اطلاع شما ساخته می‌شود
// راهنمای استفاده در فایل router اصلی در پیام توضیح داده شده است
import CapitalAccountsPage from './pages/CapitalAccountsPage';
import ContributionsPage from './pages/ContributionsPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import SharesPage from './pages/SharesPage';
import BalanceSheetPage from './pages/BalanceSheetPage';

export const partnerCapitalRoutes = [
  { path: 'partner-capital/accounts', Component: CapitalAccountsPage },
  { path: 'partner-capital/contributions', Component: ContributionsPage },
  { path: 'partner-capital/withdrawals', Component: WithdrawalsPage },
  { path: 'partner-capital/shares', Component: SharesPage },
  { path: 'partner-capital/balance-sheet', Component: BalanceSheetPage },
];
`);

console.log('');
console.log('=============================================');
console.log('  ✅ Partner Capital - Part 1 ready');
console.log('=============================================');
console.log('');
console.log('Files created:');
console.log('  • services/partner-capital.api.ts');
console.log('  • components/CapitalAccountFormModal.tsx');
console.log('  • components/ContributionFormModal.tsx');
console.log('  • components/WithdrawalFormModal.tsx');
console.log('  • components/ShareFormModal.tsx');
console.log('  • partner-capital.routes.tsx');
console.log('');
console.log('Next: اجرای اسکریپت دوم برای ساخت صفحات (pages)');
console.log('');