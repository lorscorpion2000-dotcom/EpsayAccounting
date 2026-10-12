import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, FileText, Calendar, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import {
  fixedAssetsApi,
  type FixedAsset,
  type FixedAssetStatus,
  type ScheduleResponse,
  type DisposalReport,
} from '../services/fixed-assets.api';

const STATUS_LABEL: Record<FixedAssetStatus, string> = {
  ACTIVE: 'فعال',
  FULLY_DEPRECIATED: 'کاملاً مستهلک',
  DISPOSED: 'کنارگذاشته',
};
const STATUS_CLASS: Record<FixedAssetStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  FULLY_DEPRECIATED: 'bg-sky-50 text-sky-700',
  DISPOSED: 'bg-slate-100 text-slate-500',
};
const fmt = (n: number | string | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

type Tab = 'register' | 'schedule' | 'disposals';

export default function FixedAssetsReportsPage() {
  const [tab, setTab] = useState<Tab>('register');
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await fixedAssetsApi.list();
      setItems(list);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">گزارش دارایی‌های ثابت</h1>
            <p className="text-xs text-slate-500 mt-0.5">دفتر دارایی، زمان‌بندی استهلاک و کنارگذاری</p>
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

      <div className="flex items-center gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <TabBtn active={tab === 'register'} onClick={() => setTab('register')} icon={<Building2 size={14} />}>
          دفتر دارایی
        </TabBtn>
        <TabBtn active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={<Calendar size={14} />}>
          زمان‌بندی استهلاک
        </TabBtn>
        <TabBtn active={tab === 'disposals'} onClick={() => setTab('disposals')} icon={<Trash2 size={14} />}>
          کنارگذاری‌ها
        </TabBtn>
      </div>

      {tab === 'register' && (
        <RegisterTab
          items={items}
          loading={loading}
          search={search}
          setSearch={setSearch}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      )}
      {tab === 'schedule' && <ScheduleTab items={items} />}
      {tab === 'disposals' && <DisposalsTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: {
  active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ═══════════════════════ Register ═══════════════════════ */

function RegisterTab({
  items, loading, search, setSearch, filterStatus, setFilterStatus,
}: {
  items: FixedAsset[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
}) {
  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (filterStatus && a.status !== filterStatus) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return [a.code, a.name, a.assetAccount?.name, a.project?.name]
          .filter(Boolean).join(' ').toLowerCase().includes(s);
      }
      return true;
    });
  }, [items, search, filterStatus]);

  const totals = useMemo(() => ({
    cost: filtered.reduce((s, a) => s + Number(a.acquisitionCost), 0),
    acc:  filtered.reduce((s, a) => s + Number(a.accumulatedDepreciation), 0),
    bv:   filtered.reduce((s, a) => s + Number(a.bookValue), 0),
  }), [filtered]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KPI label="جمع بهای تملک" value={fmt(totals.cost)} tone="amber" />
        <KPI label="جمع استهلاک انباشته" value={fmt(totals.acc)} tone="rose" />
        <KPI label="جمع ارزش دفتری" value={fmt(totals.bv)} tone="sky" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کد، نام، حساب..."
          className="md:col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="FULLY_DEPRECIATED">کاملاً مستهلک</option>
          <option value="DISPOSED">کنارگذاشته</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-3 py-3 font-medium w-28">کد</th>
              <th className="text-right px-3 py-3 font-medium">نام</th>
              <th className="text-right px-3 py-3 font-medium w-40">حساب دارایی</th>
              <th className="text-center px-3 py-3 font-medium w-24">تاریخ تملک</th>
              <th className="text-left px-3 py-3 font-medium w-32">بهای تملک</th>
              <th className="text-left px-3 py-3 font-medium w-32">استهلاک انباشته</th>
              <th className="text-left px-3 py-3 font-medium w-32">ارزش دفتری</th>
              <th className="text-center px-3 py-3 font-medium w-28">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>}
            {!loading && filtered.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{a.code}</td>
                <td className="px-3 py-2 text-slate-800">{a.name}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{a.assetAccount ? `${a.assetAccount.code} — ${a.assetAccount.name}` : '—'}</td>
                <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(a.acquisitionDate)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(a.acquisitionCost)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(a.accumulatedDepreciation)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(a.bookValue)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && filtered.length > 0 && (
            <tfoot className="bg-slate-50 text-slate-700 font-medium">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-xs">جمع ({filtered.length} دارایی)</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(totals.cost)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(totals.acc)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs">{fmt(totals.bv)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

/* ═══════════════════════ Schedule ═══════════════════════ */

function ScheduleTab({ items }: { items: FixedAsset[] }) {
  const [assetId, setAssetId] = useState('');
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!assetId) { setData(null); return; }
    setLoading(true);
    try {
      const res = await fixedAssetsApi.schedule(assetId);
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [assetId]);

  return (
    <>
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-1">انتخاب دارایی</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">— انتخاب کنید —</option>
          {items.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center py-10 text-slate-400">در حال بارگذاری...</div>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI label="بهای تملک" value={fmt(data.summary.acquisitionCost)} tone="amber" />
            <KPI label="استهلاک ماهانه" value={fmt(data.summary.monthlyDepreciation)} tone="rose" />
            <KPI label="استهلاک ثبت‌شده" value={fmt(data.summary.accumulatedRecorded)} tone="slate" />
            <KPI label="ارزش دفتری فعلی" value={fmt(data.summary.bookValueNow)} tone="sky" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title={`سابقه ثبت‌شده (${data.recordedCount} دوره)`}>
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right px-3 py-2">کد</th>
                    <th className="text-center px-3 py-2">دوره</th>
                    <th className="text-left px-3 py-2">مبلغ</th>
                    <th className="text-left px-3 py-2">ارزش دفتری</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recorded.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-400">هنوز استهلاکی ثبت نشده</td></tr>
                  )}
                  {data.recorded.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono">{d.code}</td>
                      <td className="px-3 py-1.5 text-center">{d.periodYear}/{String(d.periodMonth).padStart(2, '0')}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(d.amount)}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(d.bookValueAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title={`پیش‌بینی (${data.projected.length} دوره)`}>
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-center px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">مبلغ</th>
                    <th className="text-left px-3 py-2">استهلاک انباشته</th>
                    <th className="text-left px-3 py-2">ارزش دفتری</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projected.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-400">پیش‌بینی خالی</td></tr>
                  )}
                  {data.projected.map((p) => (
                    <tr key={p.index} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-center font-mono">{p.index}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(p.amount)}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(p.accumulated)}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(p.bookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </>
      )}

      {!loading && !data && assetId === '' && (
        <div className="text-center py-16 text-slate-400">برای مشاهده‌ی زمان‌بندی، یک دارایی انتخاب کنید</div>
      )}
    </>
  );
}

/* ═══════════════════════ Disposals ═══════════════════════ */

function DisposalsTab() {
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [data, setData] = useState<DisposalReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fixedAssetsApi.disposals({
        from: from ? new Date(from).toISOString() : undefined,
        to:   to   ? new Date(to).toISOString()   : undefined,
      });
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">از تاریخ</label>
          <PersianDatePicker value={from} onChange={setFrom} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">تا تاریخ</label>
          <PersianDatePicker value={to} onChange={setTo} />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'در حال بارگذاری...' : 'اعمال فیلتر'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI label="تعداد کنارگذاری" value={String(data.count)} tone="slate" />
            <KPI label="جمع وجه دریافتی" value={fmt(data.totalProceeds)} tone="emerald" />
            <KPI label="جمع ارزش دفتری" value={fmt(data.totalBookValue)} tone="rose" />
            <KPI label="سود/زیان (خالص)" value={fmt(data.totalProceeds - data.totalBookValue)} tone="sky" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-3 py-3 font-medium w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium">نام</th>
                  <th className="text-center px-3 py-3 font-medium w-24">تاریخ کنارگذاری</th>
                  <th className="text-left px-3 py-3 font-medium w-32">بهای تملک</th>
                  <th className="text-left px-3 py-3 font-medium w-32">ارزش دفتری</th>
                  <th className="text-left px-3 py-3 font-medium w-32">وجه دریافتی</th>
                  <th className="text-left px-3 py-3 font-medium w-32">سود/زیان</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">کنارگذاری در این بازه ثبت نشده</td></tr>
                )}
                {data.assets.map((a) => {
                  const bv = Number(a.bookValue);
                  const proceeds = Number((a as any).disposalProceeds ?? 0);
                  const gain = proceeds - bv;
                  return (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{a.code}</td>
                      <td className="px-3 py-2 text-slate-800">{a.name}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(a.acquisitionDate)}</td>
                      <td className="px-3 py-2 text-left font-mono text-xs">{fmt(a.acquisitionCost)}</td>
                      <td className="px-3 py-2 text-left font-mono text-xs">{fmt(bv)}</td>
                      <td className="px-3 py-2 text-left font-mono text-xs">{fmt(proceeds)}</td>
                      <td className={`px-3 py-2 text-left font-mono text-xs ${gain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ═══════════════════════ helpers ═══════════════════════ */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
        {title}
      </div>
      <div className="max-h-[420px] overflow-y-auto">{children}</div>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone: 'amber'|'rose'|'sky'|'slate'|'emerald' }) {
  const c = {
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
    sky:     'bg-sky-50 text-sky-700 border-sky-100',
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-base font-bold font-mono mt-0.5">{value}</div>
    </div>
  );
}