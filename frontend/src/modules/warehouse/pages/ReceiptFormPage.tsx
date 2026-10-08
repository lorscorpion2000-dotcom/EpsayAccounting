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

interface ItemForm {
  itemId: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number;
  discountAmount?: number;
  additionAmount?: number;
  deductionAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  shippingCost?: number;
  loadingCost?: number;
  notes?: string;
}

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

const emptyItem = (): ItemForm => ({
  itemId: '',
  quantity: 1,
  unitCost: 0,
  discountPercent: 0,
  discountAmount: 0,
  additionAmount: 0,
  deductionAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  shippingCost: 0,
  loadingCost: 0,
});

function computeLine(it: ItemForm) {
  const qty = Number(it.quantity) || 0;
  const unitCost = Number(it.unitCost) || 0;
  const base = qty * unitCost;

  const discountPercent = Number(it.discountPercent) || 0;
  const discountAmount =
    Number(it.discountAmount) || (discountPercent > 0 ? (base * discountPercent) / 100 : 0);

  const additionAmount = Number(it.additionAmount) || 0;
  const deductionAmount = Number(it.deductionAmount) || 0;

  const afterDiscount = base - discountAmount;
  const taxPercent = Number(it.taxPercent) || 0;
  const taxAmount =
    Number(it.taxAmount) || (taxPercent > 0 ? (afterDiscount * taxPercent) / 100 : 0);

  const shippingCost = Number(it.shippingCost) || 0;
  const loadingCost = Number(it.loadingCost) || 0;

  const lineTotal =
    afterDiscount + additionAmount - deductionAmount + taxAmount + shippingCost + loadingCost;

  return { base, discountAmount, taxAmount, lineTotal };
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
      items: [emptyItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const lines = watch('items') || [];

  const totals = useMemo(() => {
    let subtotal = 0, totalDiscount = 0, totalAddition = 0, totalDeduction = 0;
    let totalTax = 0, totalShipping = 0, totalLoading = 0, grandTotal = 0;
    lines.forEach((l) => {
      const c = computeLine(l);
      subtotal       += c.base;
      totalDiscount  += Number(l.discountAmount) || (Number(l.discountPercent) > 0 ? (c.base * Number(l.discountPercent)) / 100 : 0);
      totalAddition  += Number(l.additionAmount) || 0;
      totalDeduction += Number(l.deductionAmount) || 0;
      totalTax       += c.taxAmount;
      totalShipping  += Number(l.shippingCost) || 0;
      totalLoading   = 0;
      grandTotal     += c.lineTotal;
    });
    return { subtotal, totalDiscount, totalAddition, totalDeduction, totalTax, totalShipping, totalLoading, grandTotal };
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
          items: (r.items || []).map((it: any) => ({
            itemId: it.itemId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
            discountPercent: Number(it.discountPercent) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            additionAmount: Number(it.additionAmount) || 0,
            deductionAmount: Number(it.deductionAmount) || 0,
            taxPercent: Number(it.taxPercent) || 0,
            taxAmount: 0,
            shippingCost: Number(it.shippingCost) || 0,
            loadingCost: 0,
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
          discountPercent: Number(it.discountPercent) || 0,
          discountAmount: Number(it.discountAmount) || 0,
          additionAmount: Number(it.additionAmount) || 0,
          deductionAmount: Number(it.deductionAmount) || 0,
          taxPercent: Number(it.taxPercent) || 0,
          taxAmount: 0,
          shippingCost: Number(it.shippingCost) || 0,
          loadingCost: 0,
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
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
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
            <button type="button" onClick={() => append(emptyItem())} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> افزودن قلم
            </button>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[1400px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 min-w-[180px]">کالا *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-20">مقدار</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">بهای واحد</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-28">مبلغ پایه</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-20">تخفیف %</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">تخفیف</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">اضافات</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">کسورات</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-20">مالیات %</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-24">حمل و بارگیری</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-600 w-28 bg-emerald-50">جمع ردیف</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => {
                  const line = lines[idx] || emptyItem();
                  const c = computeLine(line);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/50">
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
                        <span className="num text-xs text-slate-700" dir="ltr">{formatNumber(c.base)}</span>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.discountPercent`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.discountAmount`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.additionAmount`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.deductionAmount`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.taxPercent`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1" {...register(`items.${idx}.shippingCost`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2 text-left bg-emerald-50/50">
                        <span className="num text-sm font-bold text-emerald-700" dir="ltr">{formatNumber(c.lineTotal)}</span>
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
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">خلاصه مالی رسید</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">جمع پایه</div>
              <div className="num font-bold text-slate-800" dir="ltr">{formatNumber(totals.subtotal)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">تخفیف</div>
              <div className="num font-bold text-rose-600" dir="ltr">{formatNumber(totals.totalDiscount)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">اضافات</div>
              <div className="num font-bold text-blue-600" dir="ltr">{formatNumber(totals.totalAddition)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">کسورات</div>
              <div className="num font-bold text-rose-600" dir="ltr">{formatNumber(totals.totalDeduction)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">مالیات</div>
              <div className="num font-bold text-amber-600" dir="ltr">{formatNumber(totals.totalTax)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">حمل</div>
              <div className="num font-bold text-slate-800" dir="ltr">{formatNumber(totals.totalShipping)}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-slate-200">
              <div className="text-slate-500 text-xs">بارگیری</div>
              <div className="num font-bold text-slate-800" dir="ltr">{formatNumber(totals.totalLoading)}</div>
            </div>
            <div className="bg-emerald-600 text-white rounded-lg p-3">
              <div className="text-emerald-100 text-xs">جمع کل فاکتور</div>
              <div className="num font-bold text-xl" dir="ltr">{formatNumber(totals.grandTotal)}</div>
            </div>
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
