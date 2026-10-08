import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, ArrowRightLeft, Plus, Trash2, Package,
} from 'lucide-react';
import { warehouseTransferApi } from '../services/inventory-count.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { toPersianDigits } from '@/utils/format';

interface LocalItem {
  _key: string;
  itemId: string;
  quantity: number;
  notes: string;
  available?: number;
  itemName?: string;
  itemUnit?: string;
}

let keyCounter = 0;
function newItem(): LocalItem {
  return {
    _key: 'k' + (++keyCounter),
    itemId: '',
    quantity: 1,
    notes: '',
  };
}

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function TransferFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [fromStock, setFromStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [transferDate, setTransferDate] = useState(todayISO());
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LocalItem[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/warehouses').then((r) => r.data).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([whs, prj]) => {
      setWarehouses(whs);
      setProjects(prj);
    });

    if (isEdit && id) {
      warehouseTransferApi.get(id).then((t: any) => {
        setFromWarehouseId(t.fromWarehouseId);
        setToWarehouseId(t.toWarehouseId);
        setProjectId(t.projectId || '');
        setTransferDate(t.transferDate?.slice(0, 10) || todayISO());
        setDriverName(t.driverName || '');
        setVehiclePlate(t.vehiclePlate || '');
        setNotes(t.notes || '');
        setItems((t.items || []).map((it: any) => ({
          _key: 'k' + (++keyCounter),
          itemId: it.itemId,
          quantity: Number(it.quantity),
          notes: it.notes || '',
          itemName: it.item?.name,
          itemUnit: it.item?.unit,
        })));
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    } else {
      setLoadingData(false);
    }
  }, [id, isEdit]);

  // Load stock when source warehouse changes
  useEffect(() => {
    if (!fromWarehouseId) { setFromStock([]); return; }
    api.get('/stock', { params: { warehouseId: fromWarehouseId } })
      .then((r) => setFromStock(r.data || []))
      .catch(() => setFromStock([]));
  }, [fromWarehouseId]);

  const addItem = () => setItems([...items, newItem()]);

  const removeItem = (_key: string) => setItems(items.filter((i) => i._key !== _key));

  const updateItem = (_key: string, patch: Partial<LocalItem>) => {
    setItems(items.map((i) => (i._key === _key ? { ...i, ...patch } : i)));
  };

  const availableFor = (itemId: string): number => {
    const stock = fromStock.find((s) => s.itemId === itemId);
    return Number(stock?.quantity || 0);
  };

  const onSubmit = async () => {
    if (!fromWarehouseId || !toWarehouseId) { toast.error('مبدأ و مقصد الزامی است'); return; }
    if (fromWarehouseId === toWarehouseId) { toast.error('مبدأ و مقصد نباید یکی باشند'); return; }
    if (items.length === 0) { toast.error('حداقل یک ردیف اضافه کنید'); return; }
    if (items.some((i) => !i.itemId)) { toast.error('همه ردیف‌ها باید کالا داشته باشند'); return; }

    setLoading(true);
    try {
      const payload: any = {
        fromWarehouseId,
        toWarehouseId,
        projectId: projectId || undefined,
        transferDate,
        driverName: driverName || undefined,
        vehiclePlate: vehiclePlate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      };

      if (isEdit && id) {
        await warehouseTransferApi.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        const created = await warehouseTransferApi.create(payload);
        toast.success('انتقال ایجاد شد');
        navigate('/warehouse-transfers/' + created.id);
        return;
      }
      navigate('/warehouse-transfers');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setLoading(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش انتقال' : 'انتقال جدید'}
        </h1>
        <button onClick={() => navigate('/warehouse-transfers')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">انبار مبدأ *</label>
            <select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">انبار مقصد *</label>
            <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {warehouses.filter((w) => w.id !== fromWarehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">پروژه (اختیاری)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">تاریخ انتقال *</label>
            <PersianDatePicker value={transferDate} onChange={setTransferDate} />
          </div>
          <div>
            <label className="label">راننده</label>
            <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">پلاک خودرو</label>
            <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} className="input num" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="label">توضیحات</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" /> ردیف‌های انتقال
          </h2>
          <button type="button" onClick={addItem} className="btn-secondary text-sm" disabled={!fromWarehouseId}>
            <Plus className="w-4 h-4" /> افزودن کالا
          </button>
        </div>

        {!fromWarehouseId ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            ابتدا انبار مبدأ را انتخاب کنید
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            هیچ کالایی اضافه نشده است
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 w-10">#</th>
                  <th className="text-right px-2 py-2">کالا *</th>
                  <th className="text-center px-2 py-2 w-28">موجودی مبدأ</th>
                  <th className="text-center px-2 py-2 w-28">مقدار *</th>
                  <th className="text-right px-2 py-2 w-40">یادداشت</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const available = it.itemId ? availableFor(it.itemId) : 0;
                  const insufficient = it.itemId && it.quantity > available;
                  return (
                    <tr key={it._key}>
                      <td className="px-2 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(idx + 1)}</td>
                      <td className="px-2 py-2">
                        <select value={it.itemId} onChange={(e) => updateItem(it._key, { itemId: e.target.value })} className="input text-xs py-1.5">
                          <option value="">— انتخاب کنید —</option>
                          {fromStock.map((s) => (
                            <option key={s.itemId} value={s.itemId}>
                              {s.item?.name} ({Number(s.quantity).toFixed(2)} {s.item?.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center num text-xs">
                        {it.itemId ? toPersianDigits(available.toFixed(2)) : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(it._key, { quantity: Number(e.target.value) })}
                          className={'input num text-xs py-1.5 text-center w-24 mx-auto' + (insufficient ? ' border-red-400 bg-red-50' : '')}
                          dir="ltr" />
                        {insufficient && (
                          <div className="text-[10px] text-red-600 mt-0.5">بیشتر از موجودی</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={it.notes} onChange={(e) => updateItem(it._key, { notes: e.target.value })} className="input text-xs py-1.5" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => removeItem(it._key)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/warehouse-transfers')} className="btn-secondary">انصراف</button>
        <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'ذخیره' : 'ایجاد انتقال'}
        </button>
      </div>
    </div>
  );
}
