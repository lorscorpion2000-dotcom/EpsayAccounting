import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Clock } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { AttendanceRecord, Employee } from '@/types/payroll';
import { ATTENDANCE_LABELS } from '@/types/payroll';
import { todayLocalISO } from '@/utils/local-date';

interface Props {
  isOpen: boolean;
  editing?: AttendanceRecord | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AttendanceFormModal({ isOpen, editing, employees, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset, control, watch } = useForm<any>({
    defaultValues: {
      attendanceDate: todayLocalISO(),
      workHours: 8,
      overtimeHours: 0,
      status: 'PRESENT',
    },
  });

  const status = watch('status');

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        employeeId: editing.employeeId,
        attendanceDate: editing.attendanceDate?.slice(0, 10),
        checkIn: editing.checkIn || '',
        checkOut: editing.checkOut || '',
        workHours: Number(editing.workHours),
        overtimeHours: Number(editing.overtimeHours),
        status: editing.status,
        notes: editing.notes || '',
      });
    } else {
      reset({
        employeeId: '',
        attendanceDate: todayLocalISO(),
        checkIn: '', checkOut: '',
        workHours: 8, overtimeHours: 0,
        status: 'PRESENT', notes: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    if (!data.attendanceDate) { toast.error('تاریخ الزامی است'); return; }
    try {
      await payrollApi.attendance.upsert({
        employeeId: data.employeeId,
        attendanceDate: data.attendanceDate,
        checkIn: data.checkIn || undefined,
        checkOut: data.checkOut || undefined,
        workHours: Number(data.workHours) || 0,
        overtimeHours: Number(data.overtimeHours) || 0,
        status: data.status,
        notes: data.notes || undefined,
      });
      toast.success('ثبت شد');
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
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {editing ? 'ویرایش حضور' : 'ثبت حضور جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">پرسنل *</label>
            <select {...register('employeeId', { required: true })} className="input" disabled={!!editing}>
              <option value="">— انتخاب کنید —</option>
              {employees.map((e) => <option key={e.id} value={e.partnerId}>{e.partner?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">تاریخ *</label>
            <Controller name="attendanceDate" control={control}
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
          </div>
          <div>
            <label className="label">وضعیت *</label>
            <select {...register('status')} className="input">
              {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {status === 'PRESENT' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ساعت ورود</label>
                  <input type="text" {...register('checkIn')} className="input num" dir="ltr" placeholder="08:00" />
                </div>
                <div>
                  <label className="label">ساعت خروج</label>
                  <input type="text" {...register('checkOut')} className="input num" dir="ltr" placeholder="17:00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ساعت کار عادی</label>
                  <input type="number" step="0.5" {...register('workHours')} className="input num" dir="ltr" />
                </div>
                <div>
                  <label className="label">ساعت اضافه‌کار</label>
                  <input type="number" step="0.5" {...register('overtimeHours')} className="input num" dir="ltr" />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {editing ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
