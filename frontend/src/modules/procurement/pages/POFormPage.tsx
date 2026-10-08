import { useEffect, useState, useMemo } from 'react';
import UnitSelect from '@/components/UnitSelect';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, ShoppingBag, Calculator } from 'lucide-react';
import { procurementApi } from '../services/procurement.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project, Partner } from '@/types/project';
import { PR_UNIT_LABELS, PRItemUnit } from '@/types/procurement';
import { formatNumber } from '@/utils/format';
import clsx from 'clsx';

interface ItemForm {
  description: string;
  quantity: number;
  unit: PRItemUnit;
  unitPrice: number;
  notes?: string;
}

interface FormData {
  prId?: string;
  projectId: string;
  supplierId: string;
  poDate?: string;
  deliveryDate?: string;
  taxPercent: number;
  notes?: string;
  items: ItemForm[];
}

export default function POFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prIdQuery = searchParams.get('prId') || '';
  const isEdit = !!id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      prId: prIdQuery || undefined,
      poDate: new Date().toISOString().slice(0, 10),
      taxPercent: 10,
      items: [{ description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items') || [];
  const taxPercent = watch('taxPercent') || 10;

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
    const taxAmount = (subtotal * Number(taxPercent)) / 100;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [items, taxPercent]);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners', { params: { type: 'SUPPLIER' } }).then((r) => r.data).catch(() => []),
    ]).then(async ([p, s]) => {
      setProjects(p);
      setSuppliers(s);

      // اگر از PR آمده‌ایم، اطلاعات PR را بارگذاری کنیم
      if (prIdQuery && !isEdit) {
        try {
          const pr = await procurementApi.pr.get(prIdQuery);
          if (pr && pr.items?.length) {
            reset({
              prId: prIdQuery,
              projectId: pr.projectId,
              supplierId: '',
              poDate: new Date().toISOString().slice(0, 10),
              taxPercent: 10,
              notes: undefined,
              items: pr.items.map((it) => ({
                description: it.description,
                quantity: Number(it.quantity),
                unit: it.unit as any,
                unitPrice: 0,
                notes: it.notes || undefined,
              })),
            });
          }
        } catch {
          // اگر PR پیدا نشد، فرم خالی باز می‌شود
        }
      }

      if (isEdit && id) {
        const po = await procurementApi.po.get(id);
        reset({
          prId: po.prId || undefined,
          projectId: po.projectId,
          supplierId: po.supplierId,
          poDate: po.poDate?.slice(0, 10),
          deliveryDate: po.deliveryDate?.slice(0, 10),
          taxPercent: Number(po.taxPercent),
          notes: po.notes || undefined,
          items: (po.items || []).map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unit: it.unit,
            unitPrice: Number(it.unitPrice),
            notes: it.notes || undefined,
          })),
        });
      }
    }).finally(() => setLoadingData(false));
  }, [id, isEdit, prIdQuery, reset, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        prId: data.prId || undefined,
        projectId: data.projectId,
        supplierId: data.supplierId,
        poDate: data.poDate,
        deliveryDate: data.deliveryDate || undefined,
        taxPercent: Number(data.taxPercent),
        notes: data.notes,
        items: data.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitPrice: Number(it.unitPrice),
          notes: it.notes,
        })),
      };
      if (isEdit && id) {
        await procurementApi.po.update(id, payload);
        toast.success('دستور خرید ویرایش شد');
        navigate('/procurement/orders/' + id);
      } else {
        const created = await procurementApi.po.create(payload);
        toast.success('دستور خرید ایجاد شد و به کارتابل مدیر ارسال گردید');
        setTimeout(() => navigate('/approvals'), 600);
      }
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
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            {isEdit ? 'ویرایش دستور خرید' : 'دستور خرید جدید'}
          </h1>
        </div>
        <button onClick={() => navigate('/procurement/orders')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: true })} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تأمین‌کننده *</label>
              <select {...register('supplierId', { required: true })} className="input">
                <option value="">— انتخاب کنید —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاریخ دستور *</label>
              <Controller
                name="poDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">تاریخ تحویل</label>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />}
              />
            </div>
            <div>
              <label className="label">درصد مالیات</label>
              <input type="number" step="0.01" {...register('taxPercent', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={2} {...register('notes')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">اقلام</h2>
            <button type="button" onClick={() => append({ description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0 })} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> افزودن قلم
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">شرح *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">مقدار</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">واحد</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-32">قیمت واحد</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-32">مبلغ</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => {
                  const q = Number(items[idx]?.quantity) || 0;
                  const p = Number(items[idx]?.unitPrice) || 0;
                  return (
                    <tr key={f.id}>
                      <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <input type="text" {...register(`items.${idx}.description`, { required: true })} className="input text-xs py-1.5" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <UnitSelect registerProps={register(`items.${idx}.unit`)} className="input text-xs py-1.5" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2 text-left">
                        <span className="num text-sm font-medium text-slate-800" dir="ltr">
                          {formatNumber(q * p)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="card p-6 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-800">خلاصه مالی</h2>
          </div>
          <div className="space-y-3">
            <TotalRow label="جمع اقلام" value={totals.subtotal} />
            <TotalRow label={`مالیات (${taxPercent}٪)`} value={totals.taxAmount} />
            <div className="pt-3 border-t-2 border-brand-300">
              <TotalRow label="مبلغ نهایی" value={totals.total} highlight />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border border-slate-200">
            <button type="button" onClick={() => navigate('/procurement/orders')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ثبت دستور خرید'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TotalRow({ label, value, highlight }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx('text-sm', highlight ? 'font-bold text-brand-700' : 'text-slate-600')}>{label}</span>
      <span className={clsx(
        'num',
        highlight ? 'text-xl font-bold text-brand-700' : 'text-sm font-medium text-slate-800',
      )} dir="ltr">
        {formatNumber(value)} <span className="text-xs font-normal text-slate-500">ریال</span>
      </span>
    </div>
  );
}
