import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, TrendingDown } from 'lucide-react';
import { procurementApi } from '../services/procurement.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Partner } from '@/types/project';
import { todayLocalISO } from '@/utils/local-date';

interface SupplierRow { supplierId: string; }

interface FormData {
  prId: string;
  rfqDate?: string;
  validUntil?: string;
  minSuppliers: number;
  notes?: string;
  suppliers: SupplierRow[];
}

export default function RFQFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prIdFromQuery = searchParams.get('prId') || '';

  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [pendingPRs, setPendingPRs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      prId: prIdFromQuery,
      rfqDate: todayLocalISO(),
      minSuppliers: 3,
      suppliers: [
        { supplierId: '' },
        { supplierId: '' },
        { supplierId: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'suppliers' });

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      api.get('/partners', { params: { type: 'SUPPLIER' } }).then((r) => r.data).catch(() => []),
      procurementApi.pr.list({ status: 'APPROVED' }).catch(() => []),
    ]).then(([s, prs]) => {
      setSuppliers(s);
      setPendingPRs(prs);
      if (prIdFromQuery) reset((prev) => ({ ...prev, prId: prIdFromQuery }));
    }).finally(() => setLoadingData(false));
  }, [prIdFromQuery, reset]);

  const onSubmit = async (data: FormData) => {
    if (!data.prId) { toast.error('انتخاب درخواست خرید الزامی است'); return; }
    const validSuppliers = data.suppliers.filter((s) => s.supplierId);
    if (validSuppliers.length < 1) { toast.error('حداقل یک تأمین‌کننده اضافه کنید'); return; }

    setLoading(true);
    try {
      const rfq = await procurementApi.rfq.create({
        prId: data.prId,
        rfqDate: data.rfqDate,
        validUntil: data.validUntil || undefined,
        minSuppliers: Number(data.minSuppliers),
        notes: data.notes,
        suppliers: validSuppliers.map((s) => ({ supplierId: s.supplierId })),
      });
      toast.success('استعلام ایجاد شد');
      navigate('/procurement/rfqs/' + rfq.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="card p-12 flex items-center justify-center text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-blue-600" />
            استعلام جدید
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت استعلام از تأمین‌کنندگان</p>
        </div>
        <button onClick={() => navigate('/procurement/requests')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">درخواست خرید *</label>
              <select {...register('prId', { required: true })} className="input">
                <option value="">— انتخاب کنید —</option>
                {pendingPRs.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.code} — {pr.project?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ استعلام *</label>
              <Controller
                name="rfqDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">اعتبار استعلام تا</label>
              <Controller
                name="validUntil"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />}
              />
            </div>
            <div>
              <label className="label">حداقل تعداد استعلام</label>
              <input type="number" {...register('minSuppliers', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={2} {...register('notes')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">تأمین‌کنندگان</h2>
            <button type="button" onClick={() => append({ supplierId: '' })} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> افزودن
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((f, idx) => (
              <div key={f.id} className="flex gap-2 items-center">
                <span className="text-xs text-slate-500 num w-8">{idx + 1}.</span>
                <select {...register(`suppliers.${idx}.supplierId`)} className="input flex-1">
                  <option value="">— انتخاب تأمین‌کننده —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(idx)} className="p-2 rounded hover:bg-red-50 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border border-slate-200">
            <button type="button" onClick={() => navigate('/procurement/requests')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              ایجاد استعلام
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
