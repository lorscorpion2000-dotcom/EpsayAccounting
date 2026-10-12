import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Wallet, Edit, User, FolderOpen, TrendingUp, FileSpreadsheet, RefreshCw, Eye } from 'lucide-react';
import clsx from 'clsx';
import { pettyCashApi } from '../services/petty-cash.api';
import type { PettyCashAccount } from '@/types/petty-cash';
import { formatNumber } from '@/utils/format';
import AccountFormModal from '../components/AccountFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function PettyCashAccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PettyCashAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<PettyCashAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await pettyCashApi.accounts.list();
      setAccounts(data);
    } catch {
      toast.error('خطا در بارگذاری حساب‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setDeleting(true);
    try {
      await pettyCashApi.accounts.remove(deletingAccount.id);
      toast.success('حساب تنخواه حذف شد');
      setDeletingAccount(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (accounts.length === 0) {
      toast.info('داده‌ای وجود ندارد');
      return;
    }
    const rows = accounts.map((a, i) => ({
      'ردیف': i + 1,
      'کد': a.code,
      'نام حساب': a.name,
      'تنخواه‌دار': a.employee?.fullName || a.holder?.fullName || '—' || '',
      'پروژه': a.project?.name || 'عمومی',
      'سقف هر خرید': Number(a.ceilingPerTx),
      'سقف هفتگی': Number(a.weeklyLimit),
      'موجودی': Number(a.balance),
      'وضعیت': a.isActive ? 'فعال' : 'غیرفعال',
    }));
    void exportToExcel({
      filename: `PettyCash-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'PettyCash',
        rows,
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  const filtered = search
    ? accounts.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.employee?.fullName || a.holder?.fullName || '—'?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  const totals = {
    balance: accounts.reduce((s, a) => s + Number(a.balance), 0),
    active: accounts.filter((a) => a.isActive).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            تنخواه و هزینه‌های جاری
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت حساب‌های تنخواه، تراکنش‌ها و درخواست‌های شارژ
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            className="btn-primary"
            onClick={() => { setEditingAccount(null); setShowFormModal(true); }}
          >
            <Plus className="w-4 h-4" />
            حساب تنخواه جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد حساب‌ها</div>
            <div className="text-xl font-bold text-slate-800 num">
              {formatNumber(accounts.length)}
            </div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="text-xs text-emerald-700 mb-1">مجموع موجودی</div>
            <div className="text-xl font-bold text-emerald-700 num">
              {formatNumber(totals.balance)}
            </div>
            <div className="text-xs text-emerald-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">حساب‌های فعال</div>
            <div className="text-xl font-bold text-brand-700 num">
              {formatNumber(totals.active)}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام، کد یا تنخواه‌دار..."
            className="input ps-10 pe-4 w-full"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ حساب تنخواهی ثبت نشده است</p>
          <button
            className="btn-primary"
            onClick={() => { setEditingAccount(null); setShowFormModal(true); }}
          >
            <Plus className="w-4 h-4" />
            ایجاد اولین حساب تنخواه
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:shadow-card-hover transition-all group relative">
              <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/petty-cash/' + a.id); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-brand-50 hover:text-brand-600 text-slate-600"
                  title="مشاهده"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingAccount(a); setShowFormModal(true); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-600"
                  title="ویرایش"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <AdminDeleteButton endpoint="/petty-cash/accounts" id={a.id} itemLabel={(a as any).name || a.code} />
              </div>

              <div onClick={() => navigate('/petty-cash/' + a.id)} className="cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                    a.isActive
                      ? 'bg-gradient-to-br from-brand-500 to-brand-700'
                      : 'bg-gradient-to-br from-slate-400 to-slate-600',
                  )}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-brand-600">
                      {a.name}
                    </div>
                    <div className="text-xs text-slate-500 num" dir="ltr">{a.code}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{a.employee?.fullName || a.holder?.fullName || '—' || '—'}</span>
                  </div>
                  {a.project && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{a.project.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-0.5">موجودی فعلی</div>
                  <div className={clsx(
                    'text-2xl font-bold num',
                    Number(a.balance) > 0 ? 'text-emerald-600' : 'text-slate-400',
                  )}>
                    {formatNumber(Number(a.balance))}
                    <span className="text-xs font-normal text-slate-500 ms-1">ریال</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                  <span className="flex items-center gap-1 text-slate-500">
                    <TrendingUp className="w-3.5 h-3.5" />
                    سقف خرید: <span className="num">{formatNumber(Number(a.ceilingPerTx))}</span>
                  </span>
                  {a._count && (
                    <span className="text-slate-500">
                      <span className="num">{formatNumber(a._count.transactions)}</span> تراکنش
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AccountFormModal
        isOpen={showFormModal}
        editingAccount={editingAccount}
        onClose={() => { setShowFormModal(false); setEditingAccount(null); }}
        onSaved={loadData}
      />

      <ConfirmDialog
        isOpen={!!deletingAccount}
        title="حذف حساب تنخواه"
        message={`آیا از حذف «${deletingAccount?.name}» اطمینان دارید؟ فقط حساب‌های بدون تراکنش قابل حذف هستند.`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAccount(null)}
      />
    </div>
  );
}
