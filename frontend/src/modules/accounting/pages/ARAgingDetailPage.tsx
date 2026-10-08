import { useEffect, useMemo, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ChevronDown, ChevronLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { arAgingDetailApi, type ARAgingDetailReport } from '../services/ar-aging-detail.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

const fmt = (n: number | undefined) => new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

export default function ARAgingDetailPage() {
  const [asOf, setAsOf] = useState(fromISO(new Date().toISOString()));
  const [data, setData] = useState<ARAgingDetailReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try { setData(await arAgingDetailApi.get(toISO(asOf))); setExpanded(new Set()); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'خطا'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = (id: string) => {
    setExpanded((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const overdueTotal = useMemo(() => {
    if (!data) return 0;
    return data.totals.d1_30 + data.totals.d31_60 + data.totals.d61_90 + data.totals.over90;
  }, [data]);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">سنی بدهکاران — تفصیلی</h1>
            <p className="text-xs text-slate-500 mt-0.5">مانده هر فاکتور فروش به تفکیک مشتری و بازه سررسید</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">تا تاریخ</label>
            <PersianDatePicker value={asOf} onChange={setAsOf} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button onClick={load} disabled={loading}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'در حال محاسبه...' : 'محاسبه'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <KPI label="جاری" value={data.totals.current} tone="emerald" />
            <KPI label="۱–۳۰ روز" value={data.totals.d1_30} tone="amber" />
            <KPI label="۳۱–۶۰ روز" value={data.totals.d31_60} tone="orange" />
            <KPI label="۶۱–۹۰ روز" value={data.totals.d61_90} tone="rose" />
            <KPI label="+۹۰ روز" value={data.totals.over90} tone="rose" />
            <KPI label="جمع کل" value={data.totals.total} tone="slate" bold />
          </div>

          {overdueTotal > 0 && (
            <div className="mb-4 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <div><span className="font-bold">{fmt(overdueTotal)}</span> ریال از مطالبات مشتریان سررسید گذشته است.</div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-3 py-3 font-medium w-10"></th>
                  <th className="text-right px-3 py-3 font-medium">مشتری</th>
                  <th className="text-left px-3 py-3 font-medium w-32">جاری</th>
                  <th className="text-left px-3 py-3 font-medium w-28">۱–۳۰</th>
                  <th className="text-left px-3 py-3 font-medium w-28">۳۱–۶۰</th>
                  <th className="text-left px-3 py-3 font-medium w-28">۶۱–۹۰</th>
                  <th className="text-left px-3 py-3 font-medium w-28">+۹۰</th>
                  <th className="text-left px-3 py-3 font-medium w-36">جمع</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">هیچ فاکتور دریافت‌نشده‌ای وجود ندارد</td></tr>
                )}
                {data.customers.map((c) => {
                  const isOpen = expanded.has(c.customerId);
                  return (
                    <Fragment key={c.customerId}>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                        onClick={() => toggle(c.customerId)}>
                        <td className="px-3 py-2 text-slate-500">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                        </td>
                        <td className="px-3 py-2 text-slate-800">{c.customerName}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs">{fmt(c.bucket.CURRENT)}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs">{fmt(c.bucket.D1_30)}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs">{fmt(c.bucket.D31_60)}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs">{fmt(c.bucket.D61_90)}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs text-rose-700">{fmt(c.bucket.OVER_90)}</td>
                        <td className="px-3 py-2 text-left font-mono text-xs font-bold">{fmt(c.totalRemaining)}</td>
                      </tr>
                      {isOpen && c.invoices.map((inv) => (
                        <tr key={inv.id} className="bg-slate-50/40 border-t border-slate-100 text-xs">
                          <td></td>
                          <td className="px-3 py-1.5">
                            <Link to={`/sales/invoices/${inv.id}`} className="text-indigo-700 hover:underline font-mono">
                              {inv.code}
                            </Link>
                            <span className="text-slate-400 mx-1">• شماره {inv.invoiceNumber}</span>
                            {inv.projectCode && <span className="text-slate-400 mx-1">• پروژه {inv.projectCode}</span>}
                          </td>
                          <td colSpan={4} className="px-3 py-1.5 text-slate-600">
                            <span className="mx-1">تاریخ: {fromISO(inv.invoiceDate)}</span>
                            {inv.dueDate && <span className="mx-1">سررسید: {fromISO(inv.dueDate)}</span>}
                            <span className={`mx-1 inline-block px-2 py-0.5 rounded-full ${inv.daysOverdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {inv.daysOverdue > 0 ? `${inv.daysOverdue} روز تأخیر` : 'سررسید نشده'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-left font-mono text-xs font-bold text-slate-800">{fmt(inv.remaining)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-medium">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-xs text-slate-700">جمع کل</td>
                  <td className="px-3 py-3 text-left font-mono text-xs">{fmt(data.totals.current)}</td>
                  <td className="px-3 py-3 text-left font-mono text-xs">{fmt(data.totals.d1_30)}</td>
                  <td className="px-3 py-3 text-left font-mono text-xs">{fmt(data.totals.d31_60)}</td>
                  <td className="px-3 py-3 text-left font-mono text-xs">{fmt(data.totals.d61_90)}</td>
                  <td className="px-3 py-3 text-left font-mono text-xs text-rose-700">{fmt(data.totals.over90)}</td>
                  <td className="px-3 py-3 text-left font-mono text-xs font-bold">{fmt(data.totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, tone, bold }: { label: string; value: number; tone: 'slate'|'emerald'|'amber'|'orange'|'rose'; bold?: boolean }) {
  const c = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c} ${bold ? 'ring-2 ring-slate-300' : ''}`}>
      <div className="text-xs opacity-80 mb-1">{label}</div>
      <div className="text-sm font-bold font-mono">{fmt(value)}</div>
    </div>
  );
}