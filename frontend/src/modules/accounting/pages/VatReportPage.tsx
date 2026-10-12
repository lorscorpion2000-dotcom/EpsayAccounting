import { useEffect, useState } from 'react';
import { RefreshCw, Receipt, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { vatApi, type VatReport, type VatLine } from '../services/vat.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

const fmt = (n: number | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

export default function VatReportPage() {
  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1);

  const [from, setFrom] = useState(fromISO(firstOfYear.toISOString()));
  const [to, setTo]     = useState(fromISO(today.toISOString()));
  const [data, setData] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]   = useState<'sales' | 'purchases' | 'monthly'>('sales');

  const load = async () => {
    setLoading(true);
    try {
      const res = await vatApi.get(toISO(from), toISO(to));
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load();   }, []);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">گزارش مالیات بر ارزش افزوده</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              محاسبه‌ی مالیات فروش، مالیات خرید و خالص پرداختنی
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">از تاریخ</label>
            <PersianDatePicker value={from} onChange={setFrom} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">تا تاریخ</label>
            <PersianDatePicker value={to} onChange={setTo} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button onClick={load} disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'در حال محاسبه...' : 'محاسبه‌ی گزارش'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <KPI label="جمع فروش (مبنا)"   value={fmt(data.totals.salesBase)}    tone="emerald" icon={<TrendingUp size={14} />} />
            <KPI label="مالیات فروش"        value={fmt(data.totals.salesVat)}     tone="emerald" />
            <KPI label="جمع خرید (مبنا)"   value={fmt(data.totals.purchaseBase)} tone="sky"     icon={<TrendingDown size={14} />} />
            <KPI label="مالیات خرید"        value={fmt(data.totals.purchaseVat)}  tone="sky" />
            <KPI label="خالص پرداختنی" value={fmt(data.totals.netPayable)} tone={data.totals.netPayable >= 0 ? 'rose' : 'emerald'} icon={<Scale size={14} />} />
          </div>

          <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
            <TabBtn active={tab === 'sales'} onClick={() => setTab('sales')}>
              ریز فروش ({data.sales.length})
            </TabBtn>
            <TabBtn active={tab === 'purchases'} onClick={() => setTab('purchases')}>
              ریز خرید ({data.purchases.length})
            </TabBtn>
            <TabBtn active={tab === 'monthly'} onClick={() => setTab('monthly')}>
              به تفکیک ماه ({data.byMonth.length})
            </TabBtn>
          </div>

          {tab === 'sales' && <LineTable rows={data.sales} emptyText="فروشی با مالیات در این بازه نیست" tone="emerald" />}
          {tab === 'purchases' && <LineTable rows={data.purchases} emptyText="خریدی با مالیات در این بازه نیست" tone="sky" />}
          {tab === 'monthly' && <MonthTable rows={data.byMonth} />}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

function KPI({ label, value, tone, icon }: {
  label: string; value: string; tone: 'emerald'|'sky'|'rose'|'slate'; icon?: React.ReactNode;
}) {
  const c = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sky:     'bg-sky-50 text-sky-700 border-sky-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c}`}>
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">{icon}{label}</div>
      <div className="text-base font-bold font-mono">{value}</div>
    </div>
  );
}

function LineTable({ rows, emptyText, tone }: {
  rows: VatLine[]; emptyText: string; tone: 'emerald' | 'sky';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-center px-3 py-3 font-medium w-24">تاریخ</th>
            <th className="text-right px-3 py-3 font-medium w-28">کد سند</th>
            <th className="text-right px-3 py-3 font-medium">شرح</th>
            <th className="text-right px-3 py-3 font-medium w-40">طرف حساب</th>
            <th className="text-left px-3 py-3 font-medium w-28">مبنا</th>
            <th className="text-left px-3 py-3 font-medium w-28">مالیات</th>
            <th className="text-left px-3 py-3 font-medium w-24">نرخ مؤثر</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="text-center py-10 text-slate-400">{emptyText}</td></tr>
          )}
          {rows.map((r) => {
            const rate = r.baseAmount ? (r.vatAmount / r.baseAmount) * 100 : 0;
            return (
              <tr key={r.entryId + r.taxCode} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(r.entryDate)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.entryCode}</td>
                <td className="px-3 py-2 text-slate-800 text-xs">{r.description}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {r.counterpartCode} — {r.counterpartName}
                </td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(r.baseAmount)}</td>
                <td className={`px-3 py-2 text-left font-mono text-xs font-bold ${tone === 'emerald' ? 'text-emerald-700' : 'text-sky-700'}`}>
                  {fmt(r.vatAmount)}
                </td>
                <td className="px-3 py-2 text-left font-mono text-xs text-slate-500">
                  {rate.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthTable({ rows }: { rows: Array<{ yearMonth: string; salesVat: number; purchaseVat: number; net: number }> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-right px-4 py-3 font-medium">ماه</th>
            <th className="text-left px-4 py-3 font-medium">مالیات فروش</th>
            <th className="text-left px-4 py-3 font-medium">مالیات خرید</th>
            <th className="text-left px-4 py-3 font-medium">خالص</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={4} className="text-center py-10 text-slate-400">داده‌ای نیست</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.yearMonth} className="border-t border-slate-100 hover:bg-slate-50/60">
              <td className="px-4 py-2 font-mono text-xs text-slate-700">{r.yearMonth}</td>
              <td className="px-4 py-2 text-left font-mono text-xs text-emerald-700">{fmt(r.salesVat)}</td>
              <td className="px-4 py-2 text-left font-mono text-xs text-sky-700">{fmt(r.purchaseVat)}</td>
              <td className={`px-4 py-2 text-left font-mono text-xs font-bold ${r.net >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {fmt(r.net)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}