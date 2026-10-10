import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, TrendingDown, AlertCircle } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { CapitalAccount, Withdrawal } from '../services/partner-capital.api';
import type { Project } from '@/types/project';
import { formatNumber } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

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
      withdrawalDate: todayLocalISO(),
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
        withdrawalDate: todayLocalISO(),
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
