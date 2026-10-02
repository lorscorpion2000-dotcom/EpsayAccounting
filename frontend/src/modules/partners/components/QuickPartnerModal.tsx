import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save } from 'lucide-react';
import { partnersApi, CreatePartnerPayload } from '../services/partners.api';
import type { Partner } from '@/types/project';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (partner: Partner) => void;
  defaultType?: string;
}

const TYPE_OPTIONS = [
  { value: 'CLIENT', label: 'کارفرما' },
  { value: 'CONSULTANT', label: 'مشاور / ناظر' },
  { value: 'CONTRACTOR', label: 'پیمانکار' },
  { value: 'SUPPLIER', label: 'تأمین‌کننده' },
  { value: 'EMPLOYEE', label: 'پرسنل' },
  { value: 'PARTNER', label: 'شریک' },
  { value: 'OTHER', label: 'سایر' },
];

export default function QuickPartnerModal({ isOpen, onClose, onCreated, defaultType }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePartnerPayload>({
    defaultValues: { type: defaultType || 'CLIENT' },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: CreatePartnerPayload) => {
    setLoading(true);
    try {
      const created = await partnersApi.create(data);
      toast.success('شخص جدید ثبت شد');
      onCreated(created);
      reset();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ثبت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">افزودن شخص جدید</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">نام کامل / نام شرکت *</label>
            <input
              type="text"
              {...register('name', { required: 'نام الزامی است' })}
              className="input"
              placeholder="مثال: شرکت ساختمانی آفتاب"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">نوع شخص</label>
            <select {...register('type')} className="input">
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">کد ملی / شناسه ملی</label>
              <input type="text" {...register('nationalId')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">تلفن</label>
              <input type="text" {...register('phone')} className="input num" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="label">ایمیل</label>
            <input type="email" {...register('email')} className="input" dir="ltr" />
          </div>

          <div>
            <label className="label">آدرس</label>
            <textarea rows={2} {...register('address')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
