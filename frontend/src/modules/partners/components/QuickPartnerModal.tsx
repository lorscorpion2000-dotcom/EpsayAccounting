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

const cleanShaba = (v: string) => v.toUpperCase().replace(/[^IR0-9]/g, '').slice(0, 26);
const formatCard = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};

export default function QuickPartnerModal({ isOpen, onClose, onCreated, defaultType }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreatePartnerPayload>({
    defaultValues: { type: defaultType || 'CLIENT' },
  });

  const cardValue = watch('bankCardNumber') || '';
  const shabaValue = watch('shabaNumber') || '';

  if (!isOpen) return null;

  const onSubmit = async (data: CreatePartnerPayload) => {
    setLoading(true);
    try {
      const payload: CreatePartnerPayload = {
        ...data,
        shabaNumber: data.shabaNumber ? cleanShaba(data.shabaNumber) : undefined,
        bankCardNumber: data.bankCardNumber ? data.bankCardNumber.replace(/\D/g, '') : undefined,
      };
      const created = await partnersApi.create(payload);
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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">افزودن شخص جدید</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <label className="label">نام مستعار</label>
              <input type="text" {...register('aliasName')} className="input" placeholder="نام کوتاه برای جستجوی سریع" />
            </div>

            <div>
              <label className="label">نوع شخص</label>
              <select {...register('type')} className="input">
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">نام پدر</label>
              <input type="text" {...register('fatherName')} className="input" />
            </div>

            <div>
              <label className="label">کد ملی / شناسه ملی</label>
              <input type="text" {...register('nationalId')} className="input num" dir="ltr" />
            </div>

            <div>
              <label className="label">تلفن</label>
              <input type="text" {...register('phone')} className="input num" dir="ltr" />
            </div>

            <div>
              <label className="label">ایمیل</label>
              <input type="email" {...register('email')} className="input" dir="ltr" />
            </div>

            <div>
              <label className="label">کد پستی</label>
              <input type="text" {...register('postalCode')} className="input num" dir="ltr" />
            </div>

            <div className="md:col-span-2">
              <label className="label">آدرس</label>
              <textarea rows={2} {...register('address')} className="input resize-none" />
            </div>

            <div className="md:col-span-2 pt-3 mt-1 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500">اطلاعات بانکی</div>
            </div>

            <div>
              <label className="label">شماره شبا</label>
              <input
                type="text"
                value={shabaValue}
                onChange={(e) => setValue('shabaNumber', cleanShaba(e.target.value))}
                className="input num"
                dir="ltr"
                placeholder="IR000000000000000000000000"
                maxLength={26}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                IR + ۲۴ رقم ({shabaValue.length}/26)
              </p>
            </div>

            <div>
              <label className="label">شماره حساب</label>
              <input type="text" {...register('bankAccountNumber')} className="input num" dir="ltr" />
            </div>

            <div className="md:col-span-2">
              <label className="label">شماره کارت</label>
              <input
                type="text"
                value={cardValue}
                onChange={(e) => setValue('bankCardNumber', formatCard(e.target.value))}
                className="input num"
                dir="ltr"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">توضیحات شغل</label>
              <textarea rows={2} {...register('jobDescription')} className="input resize-none" placeholder="مثال: پیمانکار تأسیسات برقی" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
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
