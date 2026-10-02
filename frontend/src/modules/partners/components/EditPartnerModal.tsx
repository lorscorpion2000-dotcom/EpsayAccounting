import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save } from 'lucide-react';
import { partnersApi, CreatePartnerPayload } from '../services/partners.api';
import type { Partner } from '@/types/project';

interface Props {
  isOpen: boolean;
  partner: Partner | null;
  onClose: () => void;
  onUpdated: (partner: Partner) => void;
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

export default function EditPartnerModal({ isOpen, partner, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePartnerPayload>();

  useEffect(() => {
    if (partner && isOpen) {
      reset({
        name: partner.name,
        type: partner.type,
        nationalId: (partner as any).nationalId || '',
        phone: (partner as any).phone || '',
        email: (partner as any).email || '',
        address: (partner as any).address || '',
      });
    }
  }, [partner, isOpen, reset]);

  if (!isOpen || !partner) return null;

  const onSubmit = async (data: CreatePartnerPayload) => {
    setLoading(true);
    try {
      const updated = await partnersApi.update(partner.id, data);
      toast.success('اطلاعات شخص به‌روزرسانی شد');
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در به‌روزرسانی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">ویرایش شخص</h2>
            <p className="text-xs text-slate-500 mt-0.5 num" dir="ltr">{partner.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">نام کامل / نام شرکت *</label>
            <input
              type="text"
              {...register('name', { required: 'نام الزامی است' })}
              className="input"
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
              ذخیره تغییرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
