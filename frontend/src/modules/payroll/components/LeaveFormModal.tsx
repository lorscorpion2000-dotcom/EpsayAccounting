import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, CalendarOff } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Employee } from '@/types/payroll';
import { LEAVE_TYPE_LABELS } from '@/types/payroll';
import { todayLocalISO } from '@/utils/local-date';

interface Props {
  isOpen: boolean;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

export default function LeaveFormModal({ isOpen, employees, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset, control } = useForm<any>({
    defaultValues: { leaveType: 'ANNUAL', days: 1 },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      employeeId: '', leaveType: 'ANNUAL',
      startDate: todayLocalISO(),
      endDate: todayLocalISO(),
      days: 1, reason: '',
    });
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    if (!data.startDate || !data.endDate) { toast.error('تاریخ‌ها الزامی'); return; }
    try {
      await payrollApi.leaveRequests.create({
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        days: Number(data.days) || 1,
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-md">
              <CalendarOff className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">درخواست مرخصی جدید</h2>
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
            <label className="label">نوع مرخصی *</label>
            <select {...register('leaveType')} className="input">
              {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">از تاریخ *</label>
              <Controller name="startDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div>
              <label className="label">تا تاریخ *</label>
              <Controller name="endDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
          </div>
          <div>
            <label className="label">تعداد روز *</label>
            <input type="number" step="0.5" {...register('days')} className="input num" dir="ltr" />
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
