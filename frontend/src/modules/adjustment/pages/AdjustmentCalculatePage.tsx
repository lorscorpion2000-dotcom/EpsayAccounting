import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Calculator, TrendingUp, Info } from 'lucide-react';
import { adjustmentApi } from '../services/adjustment.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { PERSIAN_MONTHS_ADJ } from '@/types/adjustment';
import { toPersianDigits } from '@/utils/format';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function AdjustmentCalculatePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [preview, setPreview] = useState<any>(null);

  const [projectId, setProjectId] = useState('');
  const [periodFrom, setPeriodFrom] = useState(todayISO());
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear() - 621 + (new Date().getMonth() >= 2 ? 1 : 0));
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1 > 6 ? new Date().getMonth() - 5 : new Date().getMonth() + 7);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
      adjustmentApi.indices.list({ isActive: true }).catch(() => []),
    ]).then(([prj, idx]) => {
      setProjects(prj);
      setIndices(idx);
    }).finally(() => setLoadingData(false));
  }, []);

  const categories = Array.from(new Set(indices.map((i: any) => i.category))).filter(Boolean) as string[];

  const onSubmit = async () => {
    if (!projectId) { toast.error('پروژه الزامی است'); return; }
    if (!category) { toast.error('گروه الزامی است'); return; }
    if (baseAmount <= 0) { toast.error('مبلغ پایه باید بزرگتر از صفر باشد'); return; }

    setLoading(true);
    try {
      const result = await adjustmentApi.calculations.calculate({
        projectId,
        periodFrom,
        periodTo,
        category,
        baseAmount,
        currentYear,
        currentMonth,
        notes: notes || undefined,
      });
      setPreview(result);
      toast.success('محاسبه انجام شد — ذخیره کنید');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setLoading(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-brand-600" />
          محاسبه تعدیل
        </h1>
        <button onClick={() => navigate('/adjustments')} className="btn-ghost">
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
          <div>
            <label className="label">از تاریخ *</label>
            <PersianDatePicker value={periodFrom} onChange={setPeriodFrom} />
          </div>
          <div>
            <label className="label">تا تاریخ *</label>
            <PersianDatePicker value={periodTo} onChange={setPeriodTo} />
          </div>
          <div>
            <label className="label">گروه کاری *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">مبلغ کارکرد پایه (ریال) *</label>
            <input type="number" value={baseAmount || ''} onChange={(e) => setBaseAmount(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">سال شاخص جاری *</label>
            <input type="number" value={currentYear} onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">ماه شاخص جاری *</label>
            <select value={currentMonth} onChange={(e) => setCurrentMonth(Number(e.target.value))} className="input">
              {PERSIAN_MONTHS_ADJ.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">توضیحات</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" />
          </div>
        </div>

        <div className="pt-2 border-t">
          <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            محاسبه و ذخیره
          </button>
        </div>
      </div>

      {preview && (
        <div className="card p-6 space-y-3">
          <h2 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-600" />
            نتیجه محاسبه
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500">شاخص پایه</div>
              <div className="text-lg font-bold num">{toPersianDigits(Number(preview.baseIndex).toLocaleString())}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">شاخص جاری</div>
              <div className="text-lg font-bold num">{toPersianDigits(Number(preview.currentIndex).toLocaleString())}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">ضریب تعدیل</div>
              <div className="text-lg font-bold num text-brand-700">{Number(preview.coefficient).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">مبلغ تعدیل (ریال)</div>
              <div className="text-lg font-bold num text-emerald-700">
                {toPersianDigits(Math.round(Number(preview.adjustedAmount)).toLocaleString())}
              </div>
            </div>
          </div>
          <div className="pt-3 border-t flex justify-end gap-2">
            <button onClick={() => navigate('/adjustments')} className="btn-secondary">بستن</button>
            <button onClick={() => navigate('/adjustments/' + preview.id)} className="btn-primary">
              مشاهده سند
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
