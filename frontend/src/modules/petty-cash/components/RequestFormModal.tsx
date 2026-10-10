import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Wallet, AlertCircle } from 'lucide-react';
import { pettyCashApi } from '../services/petty-cash.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { PettyCashAccount } from '@/types/petty-cash';
import { formatNumber } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

interface Props {
  isOpen: boolean;
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  requestDate?: string;
  amount: number;
  reason: string;
  iban?: string;
}

export default function RequestFormModal({
  isOpen, accountId, onClose, onSaved,
}: Props) {
  const [account, setAccount] = useState<PettyCashAccount | null>(null);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      requestDate: todayLocalISO(),
      amount: 0,
      reason: '',
    },
  });

  const amount = watch('amount') || 0;

  useEffect(() => {
    if (!isOpen) return;
    pettyCashApi.accounts.get(accountId).then(setAccount);
    reset({
      requestDate: todayLocalISO(),
      amount: 0,
      reason: '',
      iban: '',
    });
  }, [isOpen, accountId, reset]);

  if (!isOpen || !account) return null;

  const currentBalance = Number(account.balance);
  const newBalance = currentBalance + Number(amount);

  const onSubmit = async (data: FormData) => {
    try {
      await pettyCashApi.requests.create({
        accountId,
        requestDate: data.requestDate,
        amount: Number(data.amount),
        currentBalance,
        reason: data.reason,
        iban: data.iban || undefined,
      });
      toast.success('درخواست شارژ ثبت شد و به کارتابل مدیر ارسال گردید');
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ثبت درخواست');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">درخواست شارژ تنخواه</h2>
              <p className="text-xs text-slate-500 mt-0.5">ارسال به کارتابل مدیر مالی</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* خلاصه مانده */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500">موجودی فعلی</div>
              <div className="text-lg font-bold text-slate-800 num">
                {formatNumber(currentBalance)}
              </div>
              <div className="text-xs text-slate-500">ریال</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-700">موجودی پس از شارژ</div>
              <div className="text-lg font-bold text-emerald-700 num">
                {formatNumber(newBalance)}
              </div>
              <div className="text-xs text-emerald-600">ریال</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ درخواست *</label>
              <Controller
                name="requestDate"
                control={control}
                rules={{ required: 'تاریخ الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    hasError={!!errors.requestDate}
                  />
                )}
              />
            </div>
            <div>
              <label className="label">مبلغ درخواستی (ریال) *</label>
              <input
                type="number"
                step="1000000"
                {...register('amount', {
                  required: 'مبلغ الزامی است',
                  valueAsNumber: true,
                  min: { value: 1, message: 'مبلغ باید بزرگ‌تر از صفر باشد' },
                })}
                className="input num"
                dir="ltr"
                placeholder="0"
              />
              {amount > 0 && (
                <p className="text-xs text-slate-500 mt-1 num">{formatNumber(amount)} ریال</p>
              )}
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">دلیل درخواست *</label>
            <textarea
              rows={3}
              {...register('reason', { required: 'دلیل الزامی است' })}
              className="input resize-none"
              placeholder="مثال: ترمیم تنخواه جهت تامین هزینه‌های کارگاه"
            />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
          </div>

          <div>
            <label className="label">شماره شبا (اختیاری)</label>
            <input
              type="text"
              {...register('iban')}
              className="input num"
              dir="ltr"
              placeholder="IR..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              ثبت درخواست
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
