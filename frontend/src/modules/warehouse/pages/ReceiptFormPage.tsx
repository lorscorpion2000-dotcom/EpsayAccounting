import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, PackagePlus, Calculator } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Warehouse, Item } from '@/types/warehouse';
import { ITEM_UNIT_LABELS } from '@/types/warehouse';
import type { Project, Partner } from '@/types/project';
import { formatNumber } from '@/utils/format';

interface ItemForm { itemId: string; quantity: number; unitCost: number; notes?: string; }

interface FormData {
  warehouseId: string;
  projectId?: string;
  supplierId?: string;
  receiptDate?: string;
  reference?: string;
  driverName?: string;
  vehiclePlate?: string;
  notes?: string;
  items: ItemForm[];
}

export default function ReceiptFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      receiptDate: new Date().toISOString().slice(0, 10),
      items: [{ itemId: '', quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const lines = watch('items') || [];

  const totals = useMemo(() => {
    let total = 0;
    lines.forEach((l) => { total += (Number(l.quantity) || 0) * (Number(l.unitCost) || 0); });
    return { total };
  }, [lines]);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      warehouseApi.warehouses.list({ active: true }),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners', { params: { type: 'SUPPLIER' } }).then((r) => r.data).catch(() => []),
      warehouseApi.items.list(),
    ]).then(async ([wh, pr, sup, it]) => {
      setWarehouses(wh);
      setProjects(pr);
      setSuppliers(sup);
      setItems(it);

      if (isEdit && id) {
        const r = await warehouseApi.receipts.get(id);
        reset({
          warehouseId: r.warehouseId,
          projectId: r.projectId || undefined,
          supplierId: r.supplierId || undefined,
          receiptDate: r.receiptDate?.slice(0, 10),
          reference: r.reference || undefined,
          driverName: r.driverName || undefined,
          vehiclePlate: r.vehiclePlate || undefined,
          notes: r.notes || undefined,
          items: (r.items || []).map((it) => ({
            itemId: it.itemId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            notes: it.notes || undefined,
          })),
        });
      }
    }).catch(() => toast.error('خطا در بارگذاری'))
      .finally(() => setLoadingData(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        projectId: data.projectId || undefined,
        supplierId: data.supplierId || undefined,
        items: data.items.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          notes: it.notes,
        })),
      };
      if (isEdit && id) {
        await warehouseApi.receipts.update(id, payload);
        toast.success('رسید ویرایش شد');
      } else {
        await warehouseApi.receipts.create(payload);
        toast.success('رسید ایجاد شد');
      }
      navigate('/warehouse/receipts');
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
          <PackagePlus className="w-6 h-6 text-emerald-600" />
          {isEdit ? 'ویرایش رسید انبار' : 'رسید انبار جدید'}
        </h1>
        <button onClick={() => navigate('/warehouse/receipts')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">انبار مقصد *</label>
              <select {...register('warehouseId', { required: true })} className="input">
                <option value="">— انتخاب کنید —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تأمین‌کننده</label>
              <select {...register('supplierId')} className="input">
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <label className="label">تاریخ رسید *</label>
              <Controller
                name="receiptDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">شماره فاکتور / بارنامه</label>
              <input type="text" {...register('reference')} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">نام راننده</label>
              <input type="text" {...register('driverName')} className="input" />
            </div>
            <div>
              <label className="label">شماره ماشین</label>
              <input type="text" {...register('vehiclePlate')} className="input num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={2} {...register('notes')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">اقلام ورودی</h2>
            <button type="button" onClick={() => append({ itemId: '', quantity: 1, unitCost: 0 })} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> افزودن قلم
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">کالا *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">مقدار</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-32">بهای واحد</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-32">مبلغ کل</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => {
                  const q = Number(lines[idx]?.quantity) || 0;
                  const c = Number(lines[idx]?.unitCost) || 0;
                  return (
                    <tr key={f.id}>
                      <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <select {...register(`items.${idx}.itemId`, { required: true })} className="input text-xs py-1.5">
                          <option value="">— انتخاب کالا —</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} — {it.name} ({ITEM_UNIT_LABELS[it.unit]})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.unitCost`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2 text-left">
                        <span className="num text-sm font-medium text-slate-800" dir="ltr">{formatNumber(q * c)}</span>
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

        <div className="card p-6 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">ارزش کل رسید</h2>
          </div>
          <div className="text-3xl font-bold text-emerald-700 num" dir="ltr">
            {formatNumber(totals.total)} <span className="text-sm font-normal text-slate-500">ریال</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border">
            <button type="button" onClick={() => navigate('/warehouse/receipts')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ثبت رسید'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
