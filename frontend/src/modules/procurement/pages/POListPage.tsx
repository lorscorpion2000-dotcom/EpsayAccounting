import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, ShoppingBag, RefreshCw, Eye, Trash2,
  CheckCircle2, Send, Printer,
} from 'lucide-react';
import clsx from 'clsx';
import { procurementApi } from '../services/procurement.api';
import type { PurchaseOrder, POStatus } from '@/types/procurement';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/types/procurement';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function POListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: PurchaseOrder; action: 'delete' | 'approve' | 'send' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await procurementApi.po.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'delete') {
        await procurementApi.po.remove(actionItem.item.id);
        toast.success('حذف شد');
      } else if (actionItem.action === 'approve') {
        await procurementApi.po.approve(actionItem.item.id);
        toast.success('دستور خرید تایید شد');
      } else if (actionItem.action === 'send') {
        await procurementApi.po.send(actionItem.item.id);
        toast.success('دستور خرید ارسال شد');
      }
      setActionItem(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            دستورات خرید
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت دستورات خرید (PO)</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={loadData}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/procurement/orders/new')}>
            <Plus className="w-4 h-4" /> دستور خرید جدید
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
            {(Object.keys(PO_STATUS_LABELS) as POStatus[]).map((k) => (
              <option key={k} value={k}>{PO_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ دستور خریدی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/procurement/orders/new')}>
              <Plus className="w-4 h-4" /> ثبت اولین دستور خرید
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">تأمین‌کننده</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ کل</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{po.code}</span>{(po as any).prId && <span className="inline-block ms-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" title="تبدیلشده از درخواست خرید">از PR</span>}</td>
                    <td className="px-4 py-3 text-slate-800">{po.supplier?.name || (<span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">در انتظار تأمین‌کننده</span>)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{po.project?.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(po.poDate)}</span></td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-slate-800" dir="ltr">{formatNumber(Number(po?.totalAmount || 0))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', PO_STATUS_COLORS[po.status])}>
                        {PO_STATUS_LABELS[po.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/procurement/orders"
                          id={po.id}
                          itemLabel={(po as any).code}
                          onSuccess={loadData}
                        />
                        <button
                          onClick={() => navigate('/procurement/orders/' + po.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                          title="مشاهده/چاپ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {po.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => setActionItem({ item: po, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                              title="تایید"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActionItem({ item: po, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {po.status === 'APPROVED' && (
                          <button
                            onClick={() => setActionItem({ item: po, action: 'send' })}
                            className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                            title="ارسال"
                          >
                            <Send className="w-4 h-4" />
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
        isOpen={!!actionItem}
        title={actionItem?.action === 'delete' ? 'حذف دستور خرید' : actionItem?.action === 'approve' ? 'تایید دستور خرید' : 'ارسال دستور خرید'}
        message={
          actionItem?.action === 'delete' ? `آیا از حذف «${actionItem.item.code}» اطمینان دارید؟` :
          actionItem?.action === 'approve' ? `آیا «${actionItem.item.code}» تایید می‌شود؟` :
          `آیا دستور خرید «${actionItem?.item.code}» برای تأمین‌کننده ارسال می‌شود؟`
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
