import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, ClipboardCheck, Eye, Trash2, RefreshCw, CheckCircle2, Send, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { inventoryCountApi } from '../services/inventory-count.api';
import { api } from '@/services/api';
import type { InventoryCount } from '@/types/inventory-count';
import {
  INV_COUNT_STATUS_LABELS, INV_COUNT_STATUS_COLORS,
} from '@/types/inventory-count';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function InventoryCountsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<InventoryCount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, whs] = await Promise.all([
        inventoryCountApi.list({
          warehouseId: warehouseFilter || undefined,
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
      await inventoryCountApi.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleConfirm = async (c: InventoryCount) => {
    if (!confirm('انبارگردانی تایید شود؟')) return;
    try {
      await inventoryCountApi.confirm(c.id);
      toast.success('تایید شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handlePost = async (c: InventoryCount) => {
    if (!confirm('اختلافات روی موجودی انبار اعمال شود؟ این عمل قابل بازگشت نیست.')) return;
    try {
      await inventoryCountApi.post(c.id);
      toast.success('ثبت شد و موجودی اعمال شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handleCancel = async (c: InventoryCount) => {
    if (!confirm('انبارگردانی لغو شود؟')) return;
    try {
      await inventoryCountApi.cancel(c.id);
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
            <ClipboardCheck className="w-6 h-6 text-brand-600" />
            انبارگردانی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            شمارش فیزیکی موجودی انبار و اصلاح اختلافات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/inventory-counts/new')}>
            <Plus className="w-4 h-4" /> انبارگردانی جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="input">
            <option value="">همه انبارها</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(INV_COUNT_STATUS_LABELS).map(([k, v]) => (
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
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ انبارگردانی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/inventory-counts/new')}>
              <Plus className="w-4 h-4" /> اولین انبارگردانی
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">انبار</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">ردیف</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-56">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{c.warehouse?.name}</td>
                    <td className="px-4 py-3 text-center num text-xs">{formatJalaliDate(c.countDate)}</td>
                    <td className="px-4 py-3 text-center num text-xs">
                      {toPersianDigits(c._count?.items ?? c.items?.length ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', INV_COUNT_STATUS_COLORS[c.status])}>
                        {INV_COUNT_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate('/inventory-counts/' + c.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => handleConfirm(c)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem(c)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'CONFIRMED' && (
                          <button onClick={() => handlePost(c)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت نهایی">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(c.status === 'DRAFT' || c.status === 'CONFIRMED') && (
                          <button onClick={() => handleCancel(c)}
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
        title="حذف انبارگردانی"
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
