import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Wallet, RefreshCw, FolderOpen, FileSpreadsheet, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { partnerCapitalApi, CapitalAccount } from '../services/partner-capital.api';
import { formatNumber } from '@/utils/format';
import CapitalAccountFormModal from '../components/CapitalAccountFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function CapitalAccountsPage() {
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CapitalAccount | null>(null);
  const [deleting, setDeleting] = useState<CapitalAccount | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.accounts.list();
      setAccounts(data);
    } catch {
      toast.error('خطا در بارگذاری حساب‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      await partnerCapitalApi.accounts.remove(deleting.id);
      toast.success('حساب حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!accounts.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = accounts.map((a, i) => ({
      'ردیف': i + 1,
      'کد': a.code,
      'شریک': a.partner.name,
      'پروژه': a.project?.name || 'شرکت (عمومی)',
      'موجودی (ریال)': Number(a.balance),
      'تعداد آورده': a._count?.contributions || 0,
      'تعداد برداشت': a._count?.withdrawals || 0,
      'وضعیت': a.isActive ? 'فعال' : 'غیرفعال',
    }));
    void exportToExcel({
      filename: 'CapitalAccounts-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'CapitalAccounts',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? accounts.filter((a) =>
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.partner.name.toLowerCase().includes(search.toLowerCase()) ||
        a.project?.name?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            حساب‌های سرمایه شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت حساب‌های سرمایه هر شریک در هر پروژه
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> حساب جدید
          </button>
        </div>
      </div>

      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد حساب‌ها</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(accounts.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="text-xs text-emerald-700 mb-1">مجموع موجودی</div>
            <div className="text-xl font-bold text-emerald-700 num">{formatNumber(total)}</div>
            <div className="text-xs text-emerald-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">حساب‌های فعال</div>
            <div className="text-xl font-bold text-brand-700 num">
              {formatNumber(accounts.filter((a) => a.isActive).length)}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس کد، شریک یا پروژه..."
            className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ حساب سرمایه‌ای ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین حساب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:shadow-card-hover transition-all group relative">
              <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => setDeleting(a)}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-red-50 text-slate-600"
                  title="حذف">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <AdminDeleteButton
                  endpoint="/partner-capital/accounts"
                  id={a.id}
                  itemLabel={(a as any).partner?.name || (a as any).code}
                  onSuccess={load}
                  size="sm"
                />
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                  a.isActive ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-gradient-to-br from-slate-400 to-slate-600')}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 line-clamp-1">{a.partner.name}</div>
                  <div className="text-xs text-slate-500 num" dir="ltr">{a.code}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="line-clamp-1">{a.project?.name || 'شرکت (عمومی)'}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-0.5">موجودی فعلی</div>
                <div className={clsx('text-2xl font-bold num',
                  Number(a.balance) > 0 ? 'text-emerald-600' : Number(a.balance) < 0 ? 'text-rose-600' : 'text-slate-400')}>
                  {formatNumber(Number(a.balance))}
                  <span className="text-xs font-normal text-slate-500 ms-1">ریال</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>{formatNumber(a._count?.contributions || 0)} آورده</span>
                <span>{formatNumber(a._count?.withdrawals || 0)} برداشت</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CapitalAccountFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف حساب سرمایه"
        message={'آیا از حذف «' + (deleting?.partner.name || '') + '» اطمینان دارید؟ فقط حساب‌های بدون گردش قابل حذف هستند.'}
        confirmLabel="بله، حذف شود" variant="danger" loading={deletingLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
