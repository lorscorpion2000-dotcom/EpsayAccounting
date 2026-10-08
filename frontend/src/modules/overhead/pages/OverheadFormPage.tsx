import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Calculator, RefreshCw, AlertCircle,
} from 'lucide-react';
import { overheadApi } from '../services/overhead.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { OverheadMethod, PreviewResult } from '@/types/overhead';
import { OVERHEAD_METHOD_LABELS } from '@/types/overhead';
import { toPersianDigits } from '@/utils/format';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export default function OverheadFormPage() {
  const navigate = useNavigate();
  const [years, setYears] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [fiscalYearId, setFiscalYearId] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [method, setMethod] = useState<OverheadMethod>('PERCENT_CONTRACT');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [description, setDescription] = useState('');

  // Compute month options from selected fiscal year
  const monthSlots = useMemo(() => {
    const fy = years.find((y) => y.id === fiscalYearId);
    if (!fy) return [];
    const start = new Date(fy.startDate);
    const slots: { name: string; key: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      slots.push({ name: PERSIAN_MONTHS[i], key });
    }
    return slots;
  }, [years, fiscalYearId]);

  useEffect(() => {
    Promise.all([
      api.get('/fiscal-years').then((r) => r.data).catch(() => []),
      api.get('/accounting/accounts/postable').then((r) => r.data).catch(() => []),
    ]).then(([fy, acc]) => {
      setYears(fy);
      setAccounts(acc);
      const current = fy.find((y: any) => y.isCurrent) || fy[0];
      if (current) setFiscalYearId(current.id);
    }).finally(() => setLoadingData(false));
  }, []);

  const handlePreview = async () => {
    if (!fiscalYearId || !periodMonth || totalAmount <= 0) {
      toast.error('ابتدا سال، دوره و مبلغ کل را وارد کنید');
      return;
    }
    setPreviewing(true);
    try {
      const result = await overheadApi.preview({
        fiscalYearId, periodMonth, method, totalAmount,
      });
      setPreview(result);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در پیش‌نمایش');
    } finally { setPreviewing(false); }
  };

  const onSubmit = async () => {
    if (!fiscalYearId || !periodMonth || totalAmount <= 0) {
      toast.error('اطلاعات ناقص است');
      return;
    }
    if (!preview || preview.items.length === 0) {
      toast.error('ابتدا پیش‌نمایش را اجرا کنید');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        fiscalYearId,
        periodMonth,
        method,
        totalAmount,
        sourceAccountId: sourceAccountId || undefined,
        destAccountId: destAccountId || undefined,
        description: description || undefined,
        items: preview.items.map((it) => ({
          projectId: it.projectId,
          percent: Number(it.percent),
        })),
      };
      await overheadApi.create(payload);
      toast.success('تسهیم ثبت شد');
      navigate('/overhead-allocations');
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
          <Calculator className="w-6 h-6 text-brand-600" />
          تسهیم سربار جدید
        </h1>
        <button onClick={() => navigate('/overhead-allocations')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">سال مالی *</label>
            <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">دوره (ماه) *</label>
            <select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {monthSlots.map((s) => (
                <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">روش تسهیم *</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as OverheadMethod)} className="input">
              {Object.entries(OVERHEAD_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">مبلغ کل سربار (ریال) *</label>
            <input type="number" value={totalAmount || ''} onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="input num" dir="ltr" />
          </div>
          <div>
            <label className="label">حساب سربار (مبدأ - بستانکار)</label>
            <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {accounts.filter((a: any) => a.code?.startsWith('5.2')).map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">حساب بهای تمام‌شده (مقصد - بدهکار)</label>
            <select value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)} className="input">
              <option value="">— انتخاب کنید —</option>
              {accounts.filter((a: any) => a.code?.startsWith('5.1')).map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">توضیحات</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
          </div>
        </div>

        <div className="pt-2">
          <button type="button" onClick={handlePreview} disabled={previewing} className="btn-secondary">
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            محاسبه پیش‌نمایش
          </button>
        </div>
      </div>

      {preview && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              پیش‌نمایش تسهیم
            </h2>
            <div className="text-sm text-slate-500">
              جمع: <span className="num font-bold">{toPersianDigits(preview.items.length)}</span> پروژه
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-2 w-32 font-medium text-slate-600">کد پروژه</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">نام پروژه</th>
                  <th className="text-center px-4 py-2 w-28 font-medium text-slate-600">درصد</th>
                  <th className="text-left px-4 py-2 w-40 font-medium text-slate-600">مبلغ (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.items.map((it) => (
                  <tr key={it.projectId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{it.projectCode}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-800 text-xs">{it.projectName}</td>
                    <td className="px-4 py-2 text-center num text-xs">{toPersianDigits(Number(it.percent).toFixed(2))}٪</td>
                    <td className="px-4 py-2 text-left num text-xs font-bold">
                      {toPersianDigits(Number(it.amount).toLocaleString())}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-slate-700">جمع کل</td>
                  <td className="px-4 py-2 text-center num text-xs">۱۰۰٪</td>
                  <td className="px-4 py-2 text-left num text-xs">{toPersianDigits(totalAmount.toLocaleString())}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => navigate('/overhead-allocations')} className="btn-secondary">
          انصراف
        </button>
        <button type="button" onClick={onSubmit} disabled={loading || !preview} className="btn-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره تسهیم
        </button>
      </div>
    </div>
  );
}
