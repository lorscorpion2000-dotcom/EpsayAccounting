import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, Calendar } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  year: number;
  month: number;
  title: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export default function PayrollPeriodFormModal({ isOpen, onClose, onSaved }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = 1404;
  const currentMonth = new Date().getMonth() + 1;

  const { register, handleSubmit, reset, control, watch } = useForm<FormData>({
    defaultValues: { year: currentYear, month: currentMonth, title: '' },
  });

  const year = watch('year');
  const month = watch('month');

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);
    reset({
      year: currentYear,
      month: currentMonth,
      title: 'حقوق ' + MONTHS[currentMonth - 1] + ' ' + currentYear,
    });
  }, [isOpen, reset, currentMonth]);

  useEffect(() => {
    if (year && month) {
      const title = 'حقوق ' + MONTHS[month - 1] + ' ' + year;
      reset((prev) => ({ ...prev, title, year, month }));
    }
  }, [year, month, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    if (!data.startDate || !data.endDate) {
      toast.error('تاریخ شروع و پایان الزامی است');
      return;
    }
    setLoading(true);
    try {
      await payrollApi.periods.create({
        year: data.year, month: data.month, title: data.title,
        startDate: data.startDate, endDate: data.endDate,
        projectId: data.projectId || undefined,
      });
      toast.success('دوره حقوق ایجاد شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">دوره حقوق جدید</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">سال *</label>
              <input type="number" {...register('year', { valueAsNumber: true, required: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ماه *</label>
              <select {...register('month', { valueAsNumber: true })} className="input">
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان</label>
            <input type="text" {...register('title')} className="input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ شروع *</label>
              <Controller name="startDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div>
              <label className="label">تاریخ پایان *</label>
              <Controller name="endDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
          </div>

          <div>
            <label className="label">پروژه (اختیاری)</label>
            <select {...register('projectId')} className="input">
              <option value="">— عمومی —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              ایجاد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
