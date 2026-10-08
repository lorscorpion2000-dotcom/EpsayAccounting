import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, BookOpen } from 'lucide-react';
import { priceListApi } from '../services/price-list.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { CreatePriceListPayload } from '@/types/price-list';
import { PRICE_LIST_STATUS_LABELS } from '@/types/price-list';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PriceListFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const currentYear = new Date().getFullYear();
  const persianYear = currentYear - 621 + (new Date().getMonth() >= 2 ? 1 : 0);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreatePriceListPayload>({
    defaultValues: {
      title: '',
      year: persianYear,
      effectiveFrom: todayISO(),
      status: 'DRAFT',
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      priceListApi.lists.get(id).then((pl) => {
        reset({
          title: pl.title,
          year: pl.year,
          effectiveFrom: pl.effectiveFrom?.slice(0, 10) || todayISO(),
          effectiveTo: pl.effectiveTo?.slice(0, 10) || undefined,
          status: pl.status,
          description: pl.description || undefined,
        });
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    } else {
      setLoadingData(false);
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: CreatePriceListPayload) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      if (payload.year === null || payload.year === undefined || Number.isNaN(payload.year)) {
        delete payload.year;
      }
      if (!payload.effectiveTo) delete payload.effectiveTo;

      if (isEdit && id) {
        await priceListApi.lists.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        await priceListApi.lists.create(payload);
        toast.success('ایجاد شد');
      }
      navigate('/price-lists');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setLoading(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش فهرست بها' : 'فهرست بهای جدید'}
        </h1>
        <button onClick={() => navigate('/price-lists')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">عنوان *</label>
              <input type="text" {...register('title', { required: 'عنوان الزامی است' })}
                className="input" placeholder="فهرست بهای ابنیه ۱۴۰۴..." />
              {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
            </div>
            <div>
              <label className="label">سال *</label>
              <input type="number" {...register('year', { valueAsNumber: true, required: 'سال الزامی است' })}
                className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(PRICE_LIST_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ شروع اعتبار *</label>
              <Controller name="effectiveFrom" control={control} rules={{ required: true }}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div>
              <label className="label">تاریخ پایان اعتبار</label>
              <Controller name="effectiveTo" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={3} {...register('description')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/price-lists')} className="btn-secondary">انصراف</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره تغییرات' : 'ایجاد فهرست'}
          </button>
        </div>
      </form>
    </div>
  );
}