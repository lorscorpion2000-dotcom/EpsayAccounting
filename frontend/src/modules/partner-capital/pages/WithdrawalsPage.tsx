import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, TrendingDown, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle, ArrowLeftRight,
} from 'lucide-react';
import clsx from 'clsx';
import { partnerCapitalApi, Withdrawal } from '../services/partner-capital.api';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import WithdrawalFormModal from '../components/WithdrawalFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده', APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده', CANCELLED: 'لغو‌شده',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700', PAID: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function WithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Withdrawal | null>(null);
  const [actionItem, setActionItem] = useState<{ item: Withdrawal; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.withdrawals.list({ status: statusFilter || undefined });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await partnerCapitalApi.withdrawals.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await partnerCapitalApi.withdrawals.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await partnerCapitalApi.withdrawals.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await partnerCapitalApi.withdrawals.reject(actionItem.item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null); setReason(''); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((w, i) => ({
      'ردیف': i + 1, 'کد': w.code, 'شریک': w.partner.name,
      'مبلغ': Number(w.amount), 'تاریخ': formatJalaliDate(w.withdrawalDate),
      'انتقال به پروژه دیگر': w.transferToContribution ? 'بله' : 'خیر',
      'وضعیت': STATUS_LABELS[w.status], 'دلیل': w.reason || '',
    }));
    void exportToExcel({
      filename: 'Withdrawals-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Withdrawals',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((w) =>
        w.code.toLowerCase().includes(search.toLowerCase()) ||
        w.partner.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalApproved = items.filter((w) => w.status === 'APPROVED').reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            برداشت شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و تایید برداشت از حساب سرمایه</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> برداشت جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(items.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-rose-50 to-white border-rose-200">
            <div className="text-xs text-rose-700 mb-1">مجموع تاییدشده</div>
            <div className="text-xl font-bold text-rose-700 num">{formatNumber(totalApproved)}</div>
            <div className="text-xs text-rose-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">در انتظار تایید</div>
            <div className="text-xl font-bold text-amber-700 num">
              {formatNumber(items.filter((w) => w.status === 'SUBMITTED').length)}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ برداشتی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین برداشت
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">انتقال</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{w.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{w.partner.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(w.withdrawalDate)}</span></td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-rose-700" dir="ltr">{formatNumber(Number(w.amount))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w.transferToContribution ? (
                        <span title="انتقال به پروژه دیگر" className="inline-flex items-center gap-1 text-xs text-brand-600">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> بله
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[w.status])}>
                        {STATUS_LABELS[w.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {w.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(w); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'submit' })}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {w.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => setActionItem({ item: w, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'reject' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {w.status === 'APPROVED' && (
                          <span className="text-xs text-emerald-600 font-medium">تاییدشده</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WithdrawalFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف برداشت' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید برداشت'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'برداشت به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، موجودی حساب شریک کاهش می‌یابد. ادامه؟'
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد برداشت</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
