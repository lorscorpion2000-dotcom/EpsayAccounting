import { useState } from 'react';
import { PlayCircle, CheckCircle2, XCircle, AlertCircle, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi, type DepreciationRunResult } from '../services/fixed-assets.api';

const PERSIAN_MONTHS = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
  'مهر','آبان','آذر','دی','بهمن','اسفند',
];

const fmt = (n: number | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

export default function DepreciationRunPage() {

  const [year, setYear] = useState<number>(1404);
  const [month, setMonth] = useState<number>(7);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<DepreciationRunResult[] | null>(null);

  const years = [];
  for (let y = 1398; y <= 1410; y++) years.push(y);

  const run = async () => {
    setBusy(true);
    setResults(null);
    try {
      const res = await fixedAssetsApi.runDepreciation(year, month);
      setResults(res);
      const applied = res.filter((r) => !r.skipped && !r.error).length;
      const skipped = res.filter((r) => r.skipped).length;
      const errored = res.filter((r) => r.error).length;
      if (errored) toast.warning(`${applied} اعمال، ${skipped} رد، ${errored} خطا`);
      else if (applied) toast.success(`${applied} دارایی مستهلک شد`);
      else toast.info('هیچ دارایی‌ای برای استهلاک نبود');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در اجرای استهلاک');
    } finally {
      setBusy(false);
    }
  };

  const stats = results ? {
    total: results.length,
    applied: results.filter((r) => !r.skipped && !r.error).length,
    skipped: results.filter((r) => r.skipped).length,
    errored: results.filter((r) => r.error).length,
    sumAmount: results.reduce((s, r) => s + (r.amount ?? 0), 0),
  } : null;

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">اجرای استهلاک ماهانه</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              استهلاک همه‌ی دارایی‌های فعال برای دوره‌ی انتخابی محاسبه و سند ثبت می‌شود
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">سال (شمسی)</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ماه</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              {PERSIAN_MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')} — {m}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={run}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium disabled:opacity-50"
            >
              <PlayCircle size={18} />
              {busy ? 'در حال اجرا...' : 'اجرای استهلاک'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            برای هر دارایی در هر دوره فقط یک بار استهلاک ثبت می‌شود (idempotent). اگر برای ماه/سال انتخاب‌شده قبلاً اجرا شده باشد، همان دارایی‌ها رد می‌شوند و سند تکراری ثبت نمی‌گردد.
          </div>
        </div>
      </div>

      {results && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Stat label="کل دارایی‌ها" value={String(stats.total)} tone="slate" />
            <Stat label="اعمال‌شده" value={String(stats.applied)} tone="emerald" />
            <Stat label="رد شده" value={String(stats.skipped)} tone="slate" />
            <Stat label="خطا" value={String(stats.errored)} tone="rose" />
            <Stat label="جمع مبلغ" value={fmt(stats.sumAmount)} sub="ریال" tone="amber" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-3 py-3 font-medium w-32">کد دارایی</th>
                  <th className="text-left px-3 py-3 font-medium w-32">مبلغ</th>
                  <th className="text-left px-3 py-3 font-medium w-32">ارزش دفتری بعد</th>
                  <th className="text-right px-3 py-3 font-medium w-40">کد سند</th>
                  <th className="text-center px-3 py-3 font-medium w-40">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">هیچ دارایی فعالی برای استهلاک نیست</td></tr>
                )}
                {results.map((r) => {
                  const isOk = !r.skipped && !r.error;
                  const isSkip = !!r.skipped;
                  return (
                    <tr key={r.assetId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-left font-mono text-xs">{r.amount != null ? fmt(r.amount) : '—'}</td>
                      <td className="px-3 py-2 text-left font-mono text-xs">{r.bookValueAfter != null ? fmt(r.bookValueAfter) : '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.jeCode ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {isOk && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                            <CheckCircle2 size={12} /> اعمال شد
                          </span>
                        )}
                        {isSkip && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            <AlertCircle size={12} /> رد — {r.skipped === 'already' ? 'قبلاً' : r.skipped === 'fully' ? 'کامل مستهلک' : r.skipped}
                          </span>
                        )}
                        {r.error && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs">
                            <XCircle size={12} /> خطا
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'slate'|'emerald'|'rose'|'amber' }) {
  const c = {
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-base font-bold font-mono mt-0.5">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}