import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, ShoppingCart, RefreshCw, FileSpreadsheet,
  Eye, Edit, Trash2, Send, CheckCircle2, XCircle, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { procurementApi } from '../services/procurement.api';
import type { PurchaseRequest, PRStatus } from '@/types/procurement';
import { PR_STATUS_LABELS, PR_STATUS_COLORS } from '@/types/procurement';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function PRListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: PurchaseRequest; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await procurementApi.pr.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const { item, action } = actionItem;
      if (action === 'delete') {
        await procurementApi.pr.remove(item.id);
        toast.success('حذف شد');
        setActionItem(null);
        setReason('');
        loadData();
        return;
      }
      if (action === 'submit') {
        await procurementApi.pr.submit(item.id);
        toast.success('درخواست به کارتابل مدیر ارسال شد');
        setActionItem(null);
        setReason('');
        setTimeout(() => navigate('/approvals'), 500);
        return;
      }
      if (action === 'approve') {
        await procurementApi.pr.approve(item.id);
        toast.success('تایید شد');
      }
      if (action === 'reject') {
        if (!reason.trim()) { toast.error('دلیل رد الزامی است'); setActionLoading(false); return; }
        await procurementApi.pr.reject(item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null);
      setReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((p, i) => ({
      'ردیف': i + 1,
      'کد': p.code,
      'پروژه': p.project?.name || '',
      'درخواست‌کننده': p.requester?.fullName || '',
      'تاریخ': formatJalaliDate(p.requestDate),
      'تاریخ نیاز': p.requiredDate ? formatJalaliDate(p.requiredDate) : '',
      'تعداد اقلام': p._count?.items || 0,
      'وضعیت': PR_STATUS_LABELS[p.status],
    }));
    void exportToExcel({
      filename: `PurchaseRequests-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'PRs',
        rows,
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-600" />
            درخواست‌های خرید
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت درخواست‌های خرید (PR)</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button className="btn-primary" onClick={() => navigate('/procurement/requests/new')}>
            <Plus className="w-4 h-4" />
            درخواست جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">همه وضعیت‌ها</option>
            {(Object.keys(PR_STATUS_LABELS) as PRStatus[]).map((k) => (
              <option key={k} value={k}>{PR_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ درخواست خریدی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/procurement/requests/new')}>
              <Plus className="w-4 h-4" />
              ثبت اولین درخواست
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">درخواست‌کننده</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">اقلام</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{pr.code}</span></td>
                    <td className="px-4 py-3 text-slate-800">{pr.project?.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs text-slate-700">{formatJalaliDate(pr.requestDate)}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{pr.requester?.fullName}</td>
                    <td className="px-4 py-3 text-center"><span className="num text-xs">{toPersianDigits(pr._count?.items || 0)}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', PR_STATUS_COLORS[pr.status])}>
                        {PR_STATUS_LABELS[pr.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/procurement/requests"
                          id={pr.id}
                          itemLabel={(pr as any).code}
                          onSuccess={loadData}
                        />
                        <button
                          onClick={() => navigate('/procurement/requests/' + pr.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {pr.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => navigate('/procurement/requests/' + pr.id + '/edit')}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                              title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionItem({ item: pr, action: 'submit' })}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                              title="ارسال به کارتابل"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionItem({ item: pr, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {pr.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={() => setActionItem({ item: pr, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                              title="تایید"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionItem({ item: pr, action: 'reject' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="رد"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(pr.status === 'APPROVED' || pr.status === 'IN_RFQ' || pr.status === 'RFQ_COMPLETED') && (
                          <button
                            onClick={() => navigate('/procurement/requests/' + pr.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="استعلام"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
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

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action === 'delete'}
        title="حذف درخواست خرید"
        message={`آیا از حذف «${actionItem?.item.code}» اطمینان دارید؟`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action === 'submit'}
        title="ارسال به کارتابل"
        message={`آیا از ارسال درخواست «${actionItem?.item.code}» به کارتابل مدیر اطمینان دارید؟ پس از ارسال امکان ویرایش وجود ندارد.`}
        confirmLabel="بله، ارسال شود"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action === 'approve'}
        title="تایید درخواست"
        message={`آیا درخواست «${actionItem?.item.code}» را تایید می‌کنید؟`}
        confirmLabel="بله، تایید می‌کنم"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem && actionItem.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد درخواست خرید</h3>
            <p className="text-sm text-slate-600 mb-4">
              درخواست «<span className="num font-medium">{actionItem.item.code}</span>» رد می‌شود.
            </p>
            <label className="label">دلیل رد *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4"
              placeholder="دلیل رد..."
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !reason.trim()}
                className="btn-danger"
              >
                {actionLoading ? 'در حال رد...' : 'رد درخواست'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
