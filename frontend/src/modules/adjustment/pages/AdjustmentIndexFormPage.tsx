import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, TrendingUp } from 'lucide-react';
import { adjustmentApi } from '../services/adjustment.api';
import { PERSIAN_MONTHS_ADJ } from '@/types/adjustment';

export default function AdjustmentIndexFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const currentYear = new Date().getFullYear();
  const persianYear = currentYear - 621 + (new Date().getMonth() >= 2 ? 1 : 0);

  const [year, setYear] = useState(persianYear);
  const [month, setMonth] = useState(1);
  const [category, setCategory] = useState('');
  const [indexValue, setIndexValue] = useState<number>(0);
  const [baseYear, setBaseYear] = useState(1396);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEdit && id) {
      adjustmentApi.indices.get(id).then((it) => {
        setYear(it.year);
        setMonth(it.month);
        setCategory(it.category);
        setIndexValue(Number(it.indexValue));
        setBaseYear(it.baseYear);
        setDescription(it.description || '');
        setIsActive(it.isActive);
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    }
  }, [id, isEdit]);

  const onSubmit = async () => {
    if (!category.trim()) { toast.error('گروه الزامی است'); return; }
    if (indexValue <= 0) { toast.error('مقدار شاخص باید بزرگتر از صفر باشد'); return; }

    setLoading(true);
    try {
      const payload = { year, month, category: category.trim(), indexValue, baseYear, description: description || undefined, isActive };
      if (isEdit && id) {
        await adjustmentApi.indices.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        await adjustmentApi.indices.create(payload);
        toast.success('ایجاد شد');
      }
      navigate('/adjustment-indices');
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
          <TrendingUp className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش شاخص' : 'شاخص جدید'}
        </h1>
        <button onClick={() => navigate('/adjustment-indices')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">سال *</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">ماه *</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input">
              {PERSIAN_MONTHS_ADJ.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">گروه *</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              className="input" placeholder="ابنیه، راه، تأسیسات مکانیکی، برق و ..." />
          </div>
          <div>
            <label className="label">مقدار شاخص *</label>
            <input type="number" step="0.0001" value={indexValue || ''} onChange={(e) => setIndexValue(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">سال پایه *</label>
            <input type="number" value={baseYear} onChange={(e) => setBaseYear(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="label">توضیحات</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-slate-700">فعال</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/adjustment-indices')} className="btn-secondary">انصراف</button>
        <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'ذخیره' : 'ایجاد'}
        </button>
      </div>
    </div>
  );
}
