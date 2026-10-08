import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Package, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { adjustmentApi } from '../services/adjustment.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { toPersianDigits } from '@/utils/format';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function MaterialPriceDiffFormPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [projectId, setProjectId] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [actualPrice, setActualPrice] = useState<number>(0);
  const [periodFrom, setPeriodFrom] = useState(todayISO());
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => [])
      .finally(() => setLoadingData(false));
  }, []);

  const diffPerUnit = actualPrice - basePrice;
  const diffTotal = diffPerUnit * quantity;

  const onSubmit = async () => {
    if (!projectId) { toast.error('پروژه الزامی است'); return; }
    if (!materialType.trim()) { toast.error('نوع مصالح الزامی است'); return; }
    if (quantity <= 0) { toast.error('مقدار باید بزرگتر از صفر باشد'); return; }

    setLoading(true);
    try {
      const created = await adjustmentApi.priceDiffs.create({
        projectId,
        materialType: materialType.trim(),
        unit: unit || undefined,
        quantity,
        basePrice,
        actualPrice,
        periodFrom,
        periodTo,
        notes: notes || undefined,
      });
      toast.success('ثبت شد');
      navigate('/material-price-diffs/' + created.id);
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
          <Package className="w-6 h-6 text-brand-600" />
          مابه‌التفاوت مصالح — مورد جدید
        </h1>
        <button onClick={() => navigate('/material-price-diffs')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">پروژه *</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">نوع مصالح *</label>
            <input type="text" value={materialType} onChange={(e) => setMaterialType(e.target.value)}
              className="input" placeholder="میلگرد، سیمان، بتن، آجر و ..." />
          </div>
          <div>
            <label className="label">واحد</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="input" placeholder="کیلوگرم، تن، مترمکعب" />
          </div>
          <div>
            <label className="label">مقدار *</label>
            <input type="number" step="0.01" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">قیمت پایه (ریال)</label>
            <input type="number" value={basePrice || ''} onChange={(e) => setBasePrice(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">قیمت واقعی (ریال)</label>
            <input type="number" value={actualPrice || ''} onChange={(e) => setActualPrice(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">از تاریخ *</label>
            <PersianDatePicker value={periodFrom} onChange={setPeriodFrom} />
          </div>
          <div>
            <label className="label">تا تاریخ *</label>
            <PersianDatePicker value={periodTo} onChange={setPeriodTo} />
          </div>
          <div className="md:col-span-2">
            <label className="label">توضیحات</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" />
          </div>
        </div>

        {/* Preview */}
        <div className={clsx('p-4 rounded-lg border',
          diffTotal > 0 ? 'bg-red-50 border-red-200' :
          diffTotal < 0 ? 'bg-emerald-50 border-emerald-200' :
          'bg-slate-50 border-slate-200')}>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">مابه‌التفاوت هر واحد</div>
              <div className={clsx('font-bold num',
                diffPerUnit > 0 ? 'text-red-700' : diffPerUnit < 0 ? 'text-emerald-700' : 'text-slate-600')}>
                {diffPerUnit > 0 ? '+' : ''}{toPersianDigits(Math.round(diffPerUnit).toLocaleString())}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">مابه‌التفاوت کل</div>
              <div className={clsx('font-bold num text-lg flex items-center gap-1',
                diffTotal > 0 ? 'text-red-700' : diffTotal < 0 ? 'text-emerald-700' : 'text-slate-600')}>
                {diffTotal > 0 ? <TrendingUp className="w-4 h-4" /> : diffTotal < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                {toPersianDigits(Math.round(diffTotal).toLocaleString())}
              </div>
            </div>
            <div className="text-xs text-slate-600 self-end">
              {diffTotal > 0 && 'دریافتنی از کارفرما'}
              {diffTotal < 0 && 'کاهشی (برگشت به کارفرما)'}
              {diffTotal === 0 && 'بدون مابه‌التفاوت'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/material-price-diffs')} className="btn-secondary">انصراف</button>
        <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره
        </button>
      </div>
    </div>
  );
}
