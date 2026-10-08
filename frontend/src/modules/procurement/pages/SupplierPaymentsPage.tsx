import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Wallet, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  supplierPaymentsApi, type SupplierPayment, type PayMethod,
} from '../services/purchase-invoices.api';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const fmt = (n: number | string | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const METHOD_LABEL: Record<PayMethod, string> = {
  CASH: 'نقدی',
  BANK_TRANSFER: 'بانکی',
  CHEQUE: 'چک',
  OTHER: 'سایر',
};

export default function SupplierPaymentsPage() {
  const [items, setItems] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SupplierPayment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supplierPaymentsApi.list();
      setItems(list);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter((x) =>
      [x.code, x.supplier?.name, x.invoice?.code, x.reference]
        .filter(Boolean).join(' ').toLowerCase().includes(s)
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const total = items.reduce((s, x) => s + Number(x.amount), 0);
    const now = new Date();
    const thisMonth = items.filter((x) => {
      const d = new Date(x.paymentDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).reduce((s, x) => s + Number(x.amount), 0);
    return { count: items.length, total, thisMonth };
  }, [items]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await supplierPaymentsApi.remove(deleteTarget.id);
      toast.success('پرداخت حذف شد');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">پرداخت به تأمین‌کنندگان</h1>
            <p className="text-xs text-slate-500 mt-0.5">لیست پرداخت‌ها — مرتبط با فاکتورها</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <KPI label="تعداد پرداخت" value={String(stats.count)} tone="slate" />
        <KPI label="جمع کل" value={fmt(stats.total)} tone="emerald" />
        <KPI label="این ماه" value={fmt(stats.thisMonth)} tone="amber" />
      </div>

      <div className="mb-4 relative max-w-md">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کد، تأمین‌کننده، فاکتور..."
          className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-3 py-3 font-medium w-28">کد</th>
              <th className="text-right px-3 py-3 font-medium">تأمین‌کننده</th>
              <th className="text-right px-3 py-3 font-medium w-32">فاکتور</th>
              <th className="text-center px-3 py-3 font-medium w-24">تاریخ</th>
              <th className="text-center px-3 py-3 font-medium w-24">روش</th>
              <th className="text-right px-3 py-3 font-medium">حساب/مرجع</th>
              <th className="text-left px-3 py-3 font-medium w-32">مبلغ</th>
              <th className="text-center px-3 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>}
            {!loading && filtered.map((x) => (
              <tr key={x.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{x.code}</td>
                <td className="px-3 py-2 text-slate-800 text-xs">
                  {x.supplier ? `${x.supplier.code} — ${x.supplier.name}` : '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {x.invoice ? (
                    <Link to={`/procurement/invoices/${x.invoice.id}`} className="font-mono text-cyan-700 hover:underline">
                      {x.invoice.code}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(x.paymentDate)}</td>
                <td className="px-3 py-2 text-center text-xs">{METHOD_LABEL[x.method]}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {x.bankAccount?.name ?? x.reference ?? '—'}
                </td>
                <td className="px-3 py-2 text-left font-mono text-xs font-bold text-emerald-700">{fmt(x.amount)}</td>
                <td className="px-3 py-2 text-center">
                  <AdminDeleteButton endpoint="/supplier-payments" id={x.id} itemLabel={x.code} onSuccess={load} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">حذف پرداخت</h3>
            <p className="text-sm text-slate-600 mb-4">
              آیا از حذف پرداخت <span className="font-mono">{deleteTarget.code}</span> به مبلغ{' '}
              <span className="font-mono">{fmt(deleteTarget.amount)}</span> ریال مطمئن هستید؟
              <span className="block text-xs text-rose-600 mt-2">سند حسابداری مرتبط هم حذف می‌شود و وضعیت فاکتور به‌روزرسانی می‌گردد.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
              <button onClick={confirmDelete} disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50">
                {busy ? '...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone: 'slate'|'emerald'|'amber' }) {
  const c = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${c}`}>
      <div className="text-xs opacity-80 mb-1">{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}