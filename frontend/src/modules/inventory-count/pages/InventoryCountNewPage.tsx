import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, ClipboardCheck } from 'lucide-react';
import { inventoryCountApi } from '../services/inventory-count.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function InventoryCountNewPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [countDate, setCountDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/warehouses').then((r) => setWarehouses(r.data)).catch(() => [])
      .finally(() => setLoadingData(false));
  }, []);

  const onSubmit = async () => {
    if (!warehouseId) { toast.error('انبار الزامی است'); return; }
    setLoading(true);
    try {
      const created = await inventoryCountApi.create({
        warehouseId,
        countDate,
        notes: notes || undefined,
      });
      toast.success('انبارگردانی ایجاد شد. اکنون مقادیر فیزیکی را وارد کنید.');
      navigate('/inventory-counts/' + created.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setLoading(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-brand-600" />
          انبارگردانی جدید
        </h1>
        <button onClick={() => navigate('/inventory-counts')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">انبار *</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input">
            <option value="">— انتخاب کنید —</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            همه کالاهای موجود در این انبار به‌صورت خودکار به لیست اضافه می‌شوند.
          </p>
        </div>
        <div>
          <label className="label">تاریخ شمارش *</label>
          <PersianDatePicker value={countDate} onChange={setCountDate} />
        </div>
        <div>
          <label className="label">توضیحات</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/inventory-counts')} className="btn-secondary">انصراف</button>
        <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ایجاد و ادامه
        </button>
      </div>
    </div>
  );
}
