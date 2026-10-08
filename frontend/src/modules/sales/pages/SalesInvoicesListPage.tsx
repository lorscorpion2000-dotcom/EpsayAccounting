import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, FileText, Search, Eye, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  salesInvoicesApi, type SalesInvoice, type SIStatus,
  type SalesCustomerRef, type ProjectRef,
} from '../services/sales-invoices.api';
import { api } from '@/services/api';

const fmt = (n: number | string | undefined) => new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const STATUS_LABEL: Record<SIStatus, string> = {
  DRAFT: 'پیش‌نویس', APPROVED: 'تأییدشده',
  PARTIALLY_RECEIVED: 'دریافت جزئی', PAID: 'دریافت‌شده', CANCELLED: 'لغو شده',
};
const STATUS_CLASS: Record<SIStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600', APPROVED: 'bg-sky-50 text-sky-700',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700', PAID: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

export default function SalesInvoicesListPage() {
  const [items, setItems] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<SalesCustomerRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ customerId?: string; projectId?: string; status?: string }>({});
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [list, custs, prjs] = await Promise.all([
        salesInvoicesApi.list(filters),
        salesInvoicesApi.customers().catch(() => []),
        api.get<ProjectRef[]>('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(list);
      setCustomers(custs);
      setProjects(prjs);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter((x) =>
      [x.code, x.invoiceNumber, x.customer?.fullName, x.project?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(s));
  }, [items, search]);

  const stats = useMemo(() => {
    const unpaid = items.filter((x) => x.status === 'APPROVED' || x.status === 'PARTIALLY_RECEIVED');
    const totalUnpaid = unpaid.reduce((s, x) => s + (Number(x.totalAmount) - Number(x.receivedAmount)), 0);
    const overdue = items.filter((x) => {
      if (x.status !== 'APPROVED' && x.status !== 'PARTIALLY_RECEIVED') return false;
      return x.dueDate && new Date(x.dueDate) < new Date();
    });
    return { count: items.length, unpaidCount: unpaid.length, unpaidSum: totalUnpaid, overdueCount: overdue.length };
  }, [items]);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">فاکتورهای فروش</h1>
            <p className="text-xs text-slate-500 mt-0.5">فاکتور مشتریان، تأیید و دریافت</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/sales/invoices/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
            <Plus size={16} /> فاکتور جدید
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="کل فاکتورها" value={String(stats.count)} tone="slate" />
        <KPI label="دریافت‌نشده" value={String(stats.unpaidCount)} tone="amber" icon={<Clock size={14} />} />
        <KPI label="مانده دریافت" value={fmt(stats.unpaidSum)} tone="rose" icon={<TrendingUp size={14} />} />
        <KPI label="سررسید گذشته" value={String(stats.overdueCount)} tone={stats.overdueCount ? 'rose' : 'emerald'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative md:col-span-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg" />
        </div>
        <select value={filters.customerId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="">همه مشتریان</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </select>
        <select value={filters.projectId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="">همه پروژه‌ها</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <select value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="">همه وضعیت‌ها</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="APPROVED">تأییدشده</option>
          <option value="PARTIALLY_RECEIVED">دریافت جزئی</option>
          <option value="PAID">دریافت‌شده</option>
          <option value="CANCELLED">لغو شده</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-3 py-3 font-medium w-28">کد</th>
              <th className="text-right px-3 py-3 font-medium w-32">شماره</th>
              <th className="text-right px-3 py-3 font-medium">مشتری</th>
              <th className="text-right px-3 py-3 font-medium w-40">پروژه</th>
              <th className="text-center px-3 py-3 font-medium w-24">تاریخ</th>
              <th className="text-left px-3 py-3 font-medium w-28">مبلغ کل</th>
              <th className="text-left px-3 py-3 font-medium w-28">دریافت‌شده</th>
              <th className="text-center px-3 py-3 font-medium w-24">وضعیت</th>
              <th className="text-center px-3 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>}
            {!loading && filtered.map((x) => (
              <tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{x.code}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{x.invoiceNumber}</td>
                <td className="px-3 py-2 text-slate-800 text-xs">{x.customer?.fullName ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{x.project ? `${x.project.code} — ${x.project.name}` : '—'}</td>
                <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(x.invoiceDate)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs font-bold text-slate-800">{fmt(x.totalAmount)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs text-emerald-700">{fmt(x.receivedAmount)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[x.status]}`}>
                    {STATUS_LABEL[x.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <Link to={`/sales/invoices/${x.id}`}
                    className="inline-flex p-1.5 rounded hover:bg-slate-100 text-slate-600">
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, tone, icon }: { label: string; value: string; tone: 'slate'|'amber'|'rose'|'emerald'; icon?: React.ReactNode }) {
  const c = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${c}`}>
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">{icon}{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}