import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, ArrowRightLeft, Eye, Trash2, RefreshCw,
  Send, CheckCircle2, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseTransferApi } from '../services/inventory-count.api';
import { api } from '@/services/api';
import type { WarehouseTransfer } from '@/types/inventory-count';
import {
  TRANSFER_STATUS_LABELS, TRANSFER_STATUS_COLORS,
} from '@/types/inventory-count';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function TransfersListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WarehouseTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<WarehouseTransfer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, whs] = await Promise.all([
        warehouseTransferApi.list({
          fromWarehouseId: warehouseFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.get('/warehouses').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setWarehouses(whs);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [warehouseFilter, statusFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await warehouseTransferApi.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleSend = async (t: WarehouseTransfer) => {
    if (!confirm('انتقال ارسال شود؟ موجودی از انبار مبدأ کسر می‌شود.')) return;
    try {
      await warehouseTransferApi.send(t.id);
      toast.success('ارسال شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handleReceive = async (t: WarehouseTransfer) => {
    if (!confirm('دریافت شود؟ موجودی به انبار مقصد اضافه می‌شود.')) return;
    try {
      await warehouseTransferApi.receive(t.id);
      toast.success('دریافت شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handleCancel = async (t: WarehouseTransfer) => {
    if (!confirm('لغو شود؟ در صورت در راه بودن، به مبدأ برگردانده می‌شود.')) return;
    try {
      await warehouseTransferApi.cancel(t.id);
      toast.success('لغو شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-brand-600" />
            انتقال بین کارگاه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            جابه‌جایی مصالح و ابزار بین انبارهای پروژه‌ها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/warehouse-transfers/new')}>
            <Plus className="w-4 h-4" /> انتقال جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="input">
            <option value="">همه انبارها (مبدأ)</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(TRANSFER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ انتقالی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/warehouse-transfers/new')}>
              <Plus className="w-4 h-4" /> اولین انتقال
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-48">مبدأ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-48">مقصد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">ردیف</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">مبلغ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-52">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{t.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{t.fromWarehouse?.name}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{t.toWarehouse?.name}</td>
                    <td className="px-4 py-3 text-center num text-xs">{formatJalaliDate(t.transferDate)}</td>
                    <td className="px-4 py-3 text-center num text-xs">
                      {toPersianDigits(t._count?.items ?? t.items?.length ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-left num text-xs">
                      {toPersianDigits(Math.round(Number(t.totalValue)).toLocaleString())}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', TRANSFER_STATUS_COLORS[t.status])}>
                        {TRANSFER_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate('/warehouse-transfers/' + t.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {t.status === 'DRAFT' && (
                          <>
                            <button onClick={() => handleSend(t)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem(t)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {t.status === 'IN_TRANSIT' && (
                          <button onClick={() => handleReceive(t)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="دریافت">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {['DRAFT', 'IN_TRANSIT'].includes(t.status) && (
                          <button onClick={() => handleCancel(t)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="لغو">
                            <XCircle className="w-4 h-4" />
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
        title="حذف انتقال"
        message={actionItem ? `آیا از حذف «${actionItem.code}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
