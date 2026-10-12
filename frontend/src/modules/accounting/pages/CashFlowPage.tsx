import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronLeft, Building2, Coins, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import {
  cashFlowApi,
  type CashFlowReport,
  type CashFlowRow,
  type CashFlowSection,
} from '../services/cash-flow.api';

const fmt = (n: number | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

const SECTION_META: Record<CashFlowSection, {
  label: string;
  icon: any;
  bg: string;
  bgSoft: string;
  text: string;
  border: string;
}> = {
  OPERATING: {
    label: 'فعالیت‌های عملیاتی',
    icon: Coins,
    bg: 'bg-emerald-600',
    bgSoft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  INVESTING: {
    label: 'فعالیت‌های سرمایه‌گذاری',
    icon: Building2,
    bg: 'bg-sky-600',
    bgSoft: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-100',
  },
  FINANCING: {
    label: 'فعالیت‌های تأمین مالی',
    icon: PiggyBank,
    bg: 'bg-violet-600',
    bgSoft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-100',
  },
};

export default function CashFlowPage() {
  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1);

  const [from, setFrom] = useState(fromISO(firstOfYear.toISOString()));
  const [to, setTo]     = useState(fromISO(today.toISOString()));
  const [data, setData] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await cashFlowApi.get(toISO(from), toISO(to));
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, []);

  const isBalanced = useMemo(() => {
    if (!data) return true;
    const sum = data.sectionTotals.OPERATING.net +
                data.sectionTotals.INVESTING.net +
                data.sectionTotals.FINANCING.net;
    return Math.abs(sum - data.netChange) < 1;
  }, [data]);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">صورت جریان‌های نقدی</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              روش مستقیم — از روی گردش حساب‌های نقدی و بانکی
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
            <button
              onClick={load}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'در حال محاسبه...' : 'محاسبه‌ی گزارش'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPI label="موجودی ابتدای دوره"  value={fmt(data.openingBalance)} tone="slate" icon={<Wallet size={14} />} />
            <KPI label="خالص تغییر"            value={fmt(data.netChange)}     tone={data.netChange >= 0 ? 'emerald' : 'rose'}
                 icon={data.netChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} />
            <KPI label="موجودی پایان دوره"   value={fmt(data.closingBalance)} tone="teal" icon={<Wallet size={14} />} />
            <KPI label="حساب‌های نقدی"         value={String(data.cashAccountCodes.length)} tone="sky" sub={`کد: ${data.cashAccountCodes.slice(0, 4).join(', ')}${data.cashAccountCodes.length > 4 ? '…' : ''}`} />
          </div>

          <div className="space-y-4">
            {(['OPERATING', 'INVESTING', 'FINANCING'] as CashFlowSection[]).map((sec) => (
              <SectionCard
                key={sec}
                section={sec}
                rows={data.sections[sec]}
                totals={data.sectionTotals[sec]}
              />
            ))}
          </div>

          <div className="mt-6 bg-slate-900 text-white rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryRow label="خالص عملیاتی"     value={data.sectionTotals.OPERATING.net} />
              <SummaryRow label="خالص سرمایه‌گذاری" value={data.sectionTotals.INVESTING.net} />
              <SummaryRow label="خالص تأمین مالی"   value={data.sectionTotals.FINANCING.net} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <div className="text-sm">خالص تغییر در موجودی نقدی</div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold font-mono ${data.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.netChange >= 0 ? '+' : ''}{fmt(data.netChange)}
                </span>
                <span className="text-xs opacity-70">ریال</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-sm">
              <div>موجودی پایان دوره</div>
              <div className="font-mono font-bold">{fmt(data.closingBalance)}</div>
            </div>
            {!isBalanced && (
              <div className="mt-3 text-xs bg-rose-900/40 border border-rose-700 text-rose-200 rounded-lg p-2">
                ⚠ توجه: جمع بخش‌ها با خالص تغییر نمی‌خواند — این معمولاً به معنی تراز نبودن اسناد است.
              </div>
            )}
          </div>
        </>
      )}

      {loading && !data && (
        <div className="text-center py-16 text-slate-400">در حال محاسبه...</div>
      )}
    </div>
  );
}

function SectionCard({
  section, rows, totals,
}: {
  section: CashFlowSection;
  rows: CashFlowRow[];
  totals: { inflow: number; outflow: number; net: number };
}) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;
  const [open, setOpen] = useState(true);

  return (
    <div className={`bg-white border ${meta.border} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 ${meta.bgSoft}`}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className={meta.text} /> : <ChevronLeft size={16} className={meta.text} />}
          <div className={`w-8 h-8 rounded-lg ${meta.bg} text-white flex items-center justify-center`}>
            <Icon size={16} />
          </div>
          <div className="text-right">
            <div className={`font-bold text-sm ${meta.text}`}>{meta.label}</div>
            <div className="text-xs text-slate-500">{rows.length} حساب مقابل</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500">خالص</div>
            <div className={`text-base font-bold font-mono ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totals.net >= 0 ? '+' : ''}{fmt(totals.net)}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-2 font-medium w-28">کد</th>
              <th className="text-right px-4 py-2 font-medium">حساب مقابل</th>
              <th className="text-center px-4 py-2 font-medium w-16">تعداد</th>
              <th className="text-left px-4 py-2 font-medium w-32">ورودی</th>
              <th className="text-left px-4 py-2 font-medium w-32">خروجی</th>
              <th className="text-left px-4 py-2 font-medium w-32">خالص</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-xs">گردشی در این بخش نیست</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.counterpartId} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{r.counterpartCode}</td>
                <td className="px-4 py-2 text-slate-800">{r.counterpartName}</td>
                <td className="px-4 py-2 text-center text-xs text-slate-500">{r.count}</td>
                <td className="px-4 py-2 text-left font-mono text-xs text-emerald-700">
                  {r.inflow > 0 ? fmt(r.inflow) : '—'}
                </td>
                <td className="px-4 py-2 text-left font-mono text-xs text-rose-700">
                  {r.outflow > 0 ? fmt(r.outflow) : '—'}
                </td>
                <td className={`px-4 py-2 text-left font-mono text-xs font-bold ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {r.net >= 0 ? '+' : ''}{fmt(r.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-medium text-slate-700">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-xs">جمع {meta.label}</td>
              <td className="px-4 py-2 text-left font-mono text-xs">{fmt(totals.inflow)}</td>
              <td className="px-4 py-2 text-left font-mono text-xs">{fmt(totals.outflow)}</td>
              <td className={`px-4 py-2 text-left font-mono text-xs font-bold ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {totals.net >= 0 ? '+' : ''}{fmt(totals.net)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function KPI({
  label, value, sub, tone, icon,
}: {
  label: string; value: string; sub?: string;
  tone: 'slate'|'emerald'|'rose'|'sky'|'teal';
  icon?: React.ReactNode;
}) {
  const c = {
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
    sky:     'bg-sky-50 text-sky-700 border-sky-100',
    teal:    'bg-teal-50 text-teal-700 border-teal-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${c}`}>
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold font-mono">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm opacity-90">{label}</div>
      <div className={`font-mono font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {value >= 0 ? '+' : ''}{fmt(value)}
      </div>
    </div>
  );
}