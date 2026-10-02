import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { salesApi, SalesCustomer } from '../services/sales.api';

interface Props {
  isOpen: boolean;
  editing?: SalesCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        fullName: editing.fullName,
        nationalId: editing.nationalId || '',
        mobilePhone: editing.mobilePhone || '',
        landlinePhone: editing.landlinePhone || '',
        email: editing.email || '',
        address: editing.address || '',
        postalCode: editing.postalCode || '',
        bankSheba: editing.bankSheba || '',
        notes: editing.notes || '',
      });
    } else {
      reset({ fullName: '', nationalId: '', mobilePhone: '', landlinePhone: '', email: '', address: '', postalCode: '', bankSheba: '', notes: '' });
    }
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const payload: any = { ...data };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      if (editing) await salesApi.customers.update(editing.id, payload);
      else await salesApi.customers.create(payload);
      toast.success(editing ? 'ویرایش شد' : 'مشتری جدید ساخته شد');
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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش مشتری' : 'مشتری جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input {...register('fullName', { required: 'نام الزامی است' })} className="input w-full" />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{(errors.fullName as any).message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد ملی</label>
              <input {...register('nationalId')} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">موبایل</label>
              <input {...register('mobilePhone')} className="input w-full num" dir="ltr" placeholder="09..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تلفن ثابت</label>
              <input {...register('landlinePhone')} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ایمیل</label>
              <input {...register('email')} className="input w-full num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
              <textarea {...register('address')} rows={2} className="input w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد پستی</label>
              <input {...register('postalCode')} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شبا</label>
              <input {...register('bankSheba')} className="input w-full num" dir="ltr" placeholder="IR..." maxLength={26} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea {...register('notes')} rows={2} className="input w-full resize-none" />
            </div>
          </div>
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
