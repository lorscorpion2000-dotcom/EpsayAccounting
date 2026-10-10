import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, TrendingUp, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { partnerCapitalApi, Contribution } from '../services/partner-capital.api';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import ContributionFormModal from '../components/ContributionFormModal';
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
const CATEGORY_LABELS: Record<string, string> = {
  CASH_DEPOSIT: 'واریز نقدی', BANK_TRANSFER: 'حواله بانکی', PETTY_CASH: 'تنخواه',
  LAND: 'زمین', MATERIALS: 'مصالح', SERVICES: 'خدمات', EQUIPMENT: 'تجهیزات',
  VEHICLE: 'خودرو', OTHER: 'سایر',
};

export default function ContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [actionItem, setActionItem] = useState<{ item: Contribution; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.contributions.list({ status: statusFilter || undefined });
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await partnerCapitalApi.contributions.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await partnerCapitalApi.contributions.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await partnerCapitalApi.contributions.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل رد الزامی'); setActionLoading(false); return; }
        await partnerCapitalApi.contributions.reject(actionItem.item.id, reason);
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
    const rows = items.map((c, i) => ({
      'ردیف': i + 1, 'کد': c.code, 'شریک': c.partner.name,
      'دسته': CATEGORY_LABELS[c.category] || c.category,
      'مبلغ': Number(c.amount), 'تاریخ': formatJalaliDate(c.contributionDate),
      'وضعیت': STATUS_LABELS[c.status], 'شرح': c.description || '',
    }));
    void exportToExcel({
      filename: 'Contributions-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Contributions',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((c) =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.partner.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalApproved = items.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            آورده شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و تایید آورده نقدی و غیرنقدی شرکا</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> آورده جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(items.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="text-xs text-emerald-700 mb-1">مجموع تاییدشده</div>
            <div className="text-xl font-bold text-emerald-700 num">{formatNumber(totalApproved)}</div>
            <div className="text-xs text-emerald-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">در انتظار تایید</div>
            <div className="text-xl font-bold text-amber-700 num">
              {formatNumber(items.filter((c) => c.status === 'SUBMITTED').length)}
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
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ آورده‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین آورده
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">دسته</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.partner.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(c.contributionDate)}</span></td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-emerald-700" dir="ltr">{formatNumber(Number(c.amount))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(c); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'submit' })}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => setActionItem({ item: c, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'reject' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'APPROVED' && (
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

      <ContributionFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف آورده' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید آورده'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'آورده به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، موجودی حساب شریک افزایش می‌یابد. ادامه؟'
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
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد آورده</h3>
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
