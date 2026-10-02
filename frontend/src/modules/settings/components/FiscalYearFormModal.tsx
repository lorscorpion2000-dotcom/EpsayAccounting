import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { accountingApi } from '@/modules/accounting/services/accounting.api';
import type { FiscalYear } from '@/types/accounting';
import { PersianDatePicker } from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  editing?: FiscalYear | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function FiscalYearFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { isCurrent: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        code: editing.code,
        name: editing.name,
        startDate: editing.startDate.slice(0, 10),
        endDate: editing.endDate.slice(0, 10),
        isCurrent: editing.isCurrent,
      });
    } else {
      reset({ code: '', name: '', startDate: '', endDate: '', isCurrent: false });
    }
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editing) {
        await accountingApi.fiscalYears.update(editing.id, data);
        toast.success('ویرایش شد');
      } else {
        await accountingApi.fiscalYears.create(data);
        toast.success('ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش سال مالی' : 'سال مالی جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد *</label>
              <input
                {...register('code', { required: 'کد الزامی است' })}
                className="input w-full num"
                dir="ltr"
                placeholder="1405"
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام *</label>
              <input
                {...register('name', { required: 'نام الزامی است' })}
                className="input w-full"
                placeholder="سال مالی ۱۴۰۵"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ شروع *</label>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'تاریخ شروع الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پایان *</label>
              <Controller
                name="endDate"
                control={control}
                rules={{ required: 'تاریخ پایان الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('isCurrent')} id="isCurrent" className="w-4 h-4" />
              <label htmlFor="isCurrent" className="text-sm text-slate-700 cursor-pointer">
                این سال به‌عنوان سال مالی جاری انتخاب شود
              </label>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
