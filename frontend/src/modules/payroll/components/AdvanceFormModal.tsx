import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Wallet } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Employee } from '@/types/payroll';
import { formatNumber } from '@/utils/format';

interface Props {
  isOpen: boolean;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AdvanceFormModal({ isOpen, employees, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset, control, watch } = useForm<any>({
    defaultValues: { requestDate: new Date().toISOString().slice(0, 10), amount: 0 },
  });

  const amount = watch('amount') || 0;

  useEffect(() => {
    if (!isOpen) return;
    reset({
      employeeId: '',
      requestDate: new Date().toISOString().slice(0, 10),
      amount: 0, reason: '',
    });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    if (!data.requestDate) { toast.error('تاریخ الزامی'); return; }
    if (!data.amount || Number(data.amount) <= 0) { toast.error('مبلغ الزامی'); return; }
    try {
      await payrollApi.advanceRequests.create({
        employeeId: data.employeeId,
        requestDate: data.requestDate,
        amount: Number(data.amount),
        reason: data.reason || undefined,
      });
      toast.success('ثبت شد');
      onSaved(); onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">درخواست مساعده جدید</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">پرسنل *</label>
            <select {...register('employeeId', { required: true })} className="input">
              <option value="">— انتخاب کنید —</option>
              {employees.map((e) => <option key={e.id} value={e.partnerId}>{e.partner?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">تاریخ درخواست *</label>
            <Controller name="requestDate" control={control}
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
          </div>
          <div>
            <label className="label">مبلغ (ریال) *</label>
            <input type="number" step="1000000" {...register('amount')} className="input num" dir="ltr" placeholder="0" />
            {amount > 0 && (
              <p className="text-xs text-slate-500 mt-1 num">{formatNumber(amount)} ریال</p>
            )}
          </div>
          <div>
            <label className="label">دلیل</label>
            <textarea rows={2} {...register('reason')} className="input resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" /> ثبت
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
