import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, PackagePlus, Eye, Edit, Trash2,
  CheckCircle2, RefreshCw, Printer, Send, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { GoodsReceipt, ReceiptStatus } from '@/types/warehouse';
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_COLORS } from '@/types/warehouse';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function ReceiptsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: GoodsReceipt; action: 'delete' | 'submit' | 'approve' | 'reject' | 'post' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.receipts.list({ status: statusFilter || undefined });
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
      if (a === 'delete') {
        await warehouseApi.receipts.remove(actionItem.item.id);
        toast.success('رسید حذف شد');
      } else if (a === 'submit') {
        await (warehouseApi.receipts as any).submit(actionItem.item.id);
        toast.success('به کارتابل ارسال شد');
        setActionItem(null);
        setTimeout(() => navigate('/approvals'), 500);
        return;
      } else if (a === 'approve') {
        await (warehouseApi.receipts as any).approve(actionItem.item.id);
        toast.success('تایید شد');
      } else if (a === 'reject') {
        await (warehouseApi.receipts as any).reject(actionItem.item.id, 'رد توسط مدیر');
        toast.success('رد شد');
      } else if (a === 'post') {
        await warehouseApi.receipts.post(actionItem.item.id);
        toast.success('رسید ثبت شد و موجودی افزایش یافت');
      }
      setActionItem(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = search
    ? items.filter((i) =>
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        i.reference?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-emerald-600" />
            رسیدهای انبار
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت ورود کالا و مصالح</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/warehouse/receipts/new')}>
            <Plus className="w-4 h-4" /> رسید جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); }} className="flex-1 min-w-[250px]">
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
            {Object.entries(RECEIPT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
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
            <PackagePlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ رسیدی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/warehouse/receipts/new')}>
              <Plus className="w-4 h-4" /> اولین رسید
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">انبار</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">تأمین‌کننده</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">اقلام</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">ارزش کل</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono text-emerald-700 font-bold" dir="ltr">{r.code}</span></td>
                    <td className="px-4 py-3 text-slate-800">{r.warehouse?.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.supplier?.name || '—'}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(r.receiptDate)}</span></td>
                    <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(r._count?.items || 0)}</td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-slate-800" dir="ltr">{formatNumber(Number(r.totalValue))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', RECEIPT_STATUS_COLORS[r.status])}>
                        {RECEIPT_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/warehouse/receipts"
                          id={r.id}
                          itemLabel={(r as any).code || (r as any).name || (r as any).title || (r as any).fullName || (r as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => navigate('/warehouse/receipts/' + r.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {r.status === 'DRAFT' && (
                          <>
                            <button onClick={() => navigate('/warehouse/receipts/' + r.id + '/edit')} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: r, action: 'submit' })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال به کارتابل">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: r, action: 'delete' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(r.status as string) === 'SUBMITTED' && (
                          <>
                            <button onClick={() => setActionItem({ item: r, action: 'approve' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: r, action: 'reject' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(r.status as string) === 'APPROVED' && (
                          <button onClick={() => setActionItem({ item: r, action: 'post' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت نهایی">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {r.status === 'POSTED' && (
                          <button onClick={() => navigate('/warehouse/receipts/' + r.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="چاپ">
                            <Printer className="w-4 h-4" />
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
        title={actionItem?.action === 'delete' ? 'حذف رسید' : actionItem?.action === 'submit' ? 'ارسال به کارتابل' : actionItem?.action === 'approve' ? 'تایید رسید' : actionItem?.action === 'reject' ? 'رد رسید' : 'ثبت نهایی رسید'}
        message={
          actionItem?.action === 'delete'
            ? `آیا از حذف «${actionItem.item.code}» اطمینان دارید؟`
            : `با ثبت نهایی رسید «${actionItem?.item.code}»، موجودی انبار افزایش می‌یابد. ادامه؟`
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
