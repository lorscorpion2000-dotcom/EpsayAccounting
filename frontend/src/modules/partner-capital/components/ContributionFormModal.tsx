import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, TrendingUp } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { CapitalAccount, Contribution } from '../services/partner-capital.api';
import { formatNumber } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

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
      contributionDate: todayLocalISO(),
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
        contributionDate: todayLocalISO(),
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
