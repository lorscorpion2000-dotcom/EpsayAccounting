import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, PackageMinus, AlertCircle } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Warehouse, Item, Stock } from '@/types/warehouse';
import { ITEM_UNIT_LABELS } from '@/types/warehouse';
import type { Project, Partner } from '@/types/project';
import clsx from 'clsx';
import { todayLocalISO } from '@/utils/local-date';

interface ItemForm { itemId: string; quantity: number; notes?: string; }

interface FormData {
  warehouseId: string;
  projectId?: string;
  wbsItemId?: string;
  recipientId?: string;
  issueDate?: string;
  usageLocation?: string;
  notes?: string;
  items: ItemForm[];
}

export default function IssueFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recipients, setRecipients] = useState<Partner[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, formState: { errors: _errors } } = useForm<FormData>({
    defaultValues: {
      issueDate: todayLocalISO(),
      items: [{ itemId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const warehouseId = watch('warehouseId');
  const projectId = watch('projectId');
  const lines = watch('items') || [];

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      warehouseApi.warehouses.list({ active: true }),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
      warehouseApi.items.list(),
    ]).then(async ([wh, pr, rec, it]) => {
      setWarehouses(wh);
      setProjects(pr);
      setRecipients(rec);
      setItems(it);

      if (isEdit && id) {
        const r = await warehouseApi.issues.get(id);
        reset({
          warehouseId: r.warehouseId,
          projectId: r.projectId || undefined,
          wbsItemId: r.wbsItemId || undefined,
          recipientId: r.recipientId || undefined,
          issueDate: r.issueDate?.slice(0, 10),
          usageLocation: r.usageLocation || undefined,
          notes: r.notes || undefined,
          items: (r.items || []).map((it) => ({
            itemId: it.itemId,
            quantity: Number(it.quantity),
            notes: it.notes || undefined,
          })),
        });
      }
    }).catch(() => toast.error('خطا در بارگذاری'))
      .finally(() => setLoadingData(false));
  }, [id, isEdit, reset]);

  // بارگذاری موجودی انبار
  useEffect(() => {
    if (!warehouseId) { setStocks([]); return; }
    warehouseApi.stock.byWarehouse(warehouseId).then(setStocks).catch(() => setStocks([]));
  }, [warehouseId]);

  // بارگذاری WBS پروژه
  useEffect(() => {
    if (!projectId) { setWbsItems([]); return; }
    api.get('/wbs', { params: { projectId } }).then((r) => {
      const flat: any[] = [];
      const walk = (arr: any[], d = 0) => {
        arr.forEach((x) => {
          flat.push({ ...x, indent: '— '.repeat(d) });
          if (x.children?.length) walk(x.children, d + 1);
        });
      };
      walk(r.data || []);
      setWbsItems(flat);
    }).catch(() => setWbsItems([]));
  }, [projectId]);

  const getStock = (itemId: string) => {
    const s = stocks.find((x) => x.itemId === itemId);
    return Number(s?.quantity || 0);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        projectId: data.projectId || undefined,
        wbsItemId: data.wbsItemId || undefined,
        recipientId: data.recipientId || undefined,
        items: data.items.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          notes: it.notes,
        })),
      };
      if (isEdit && id) {
        await warehouseApi.issues.update(id, payload);
        toast.success('حواله ویرایش شد');
      } else {
        await warehouseApi.issues.create(payload);
        toast.success('حواله ایجاد شد');
      }
      navigate('/warehouse/issues');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <PackageMinus className="w-6 h-6 text-rose-600" />
          {isEdit ? 'ویرایش حواله انبار' : 'حواله انبار جدید'}
        </h1>
        <button onClick={() => navigate('/warehouse/issues')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">انبار مبدأ *</label>
              <select {...register('warehouseId', { required: true })} className="input">
                <option value="">— انتخاب کنید —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">گیرنده</label>
              <select {...register('recipientId')} className="input">
                <option value="">—</option>
                {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">پروژه</label>
              <select {...register('projectId')} className="input">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.indent}{it.code} — {it.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ خروج *</label>
              <Controller
                name="issueDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">محل مصرف</label>
              <input type="text" {...register('usageLocation')} className="input" placeholder="مثال: فاز اسکلت - طبقه ۳" />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={2} {...register('notes')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">اقلام خروجی</h2>
            <button type="button" onClick={() => append({ itemId: '', quantity: 1 })} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> افزودن قلم
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">کالا *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">موجودی</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-28">مقدار *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">توضیحات</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => {
                  const stock = getStock(lines[idx]?.itemId || '');
                  const qty = Number(lines[idx]?.quantity) || 0;
                  const exceeds = qty > stock;
                  return (
                    <tr key={f.id} className={exceeds ? 'bg-red-50/50' : ''}>
                      <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <select {...register(`items.${idx}.itemId`, { required: true })} className="input text-xs py-1.5">
                          <option value="">— انتخاب کالا —</option>
                          {items.map((it) => {
                            const s = getStock(it.id);
                            return (
                              <option key={it.id} value={it.id}>
                                {it.code} — {it.name} ({ITEM_UNIT_LABELS[it.unit]}) - موجودی: {s.toFixed(2)}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={clsx('num text-xs', stock > 0 ? 'text-slate-600' : 'text-slate-400')}>
                          {stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" {...register(`items.${idx}.notes`)} className="input text-xs py-1.5" />
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

          {lines.some((l) => Number(l.quantity) > getStock(l.itemId)) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <b>هشدار:</b> مقدار برخی اقلام از موجودی انبار بیشتر است. لطفاً اصلاح کنید.
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border">
            <button type="button" onClick={() => navigate('/warehouse/issues')} className="btn-secondary">انصراف</button>
            <button
              type="submit"
              disabled={loading || lines.some((l) => Number(l.quantity) > getStock(l.itemId))}
              className="btn-primary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ثبت حواله'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
