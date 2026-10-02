import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, Package, Edit, Trash2, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { Item, ItemType } from '@/types/warehouse';
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, ITEM_UNIT_LABELS } from '@/types/warehouse';
import { formatNumber, toPersianDigits } from '@/utils/format';
import ItemFormModal from '../components/ItemFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.items.list({
        search: search || undefined,
        type: typeFilter || undefined,
      });
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await warehouseApi.items.remove(deleting.id);
      toast.success('کالا حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (items.length === 0) return;
    const rows = items.map((it, i) => ({
      'ردیف': i + 1,
      'کد': it.code,
      'نام کالا': it.name,
      'نوع': ITEM_TYPE_LABELS[it.type],
      'واحد': ITEM_UNIT_LABELS[it.unit],
      'دسته': it.category?.name || '',
      'موجودی کل': it.totalStock || 0,
      'ارزش موجودی': it.totalValue || 0,
    }));
    void exportToExcel({
      filename: `Items-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{
        name: 'Items',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            کالاها و مصالح
          </h1>
          <p className="text-sm text-slate-500 mt-1">کاتالوگ کالا با موجودی جاری</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> کالای جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex-1 min-w-[250px]">
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
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">همه انواع</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ کالایی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> اولین کالا
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام کالا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">واحد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">موجودی کل</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">ارزش موجودی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{it.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded border', ITEM_TYPE_COLORS[it.type])}>
                        {ITEM_TYPE_LABELS[it.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">{ITEM_UNIT_LABELS[it.unit]}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx(
                        'num font-medium',
                        (it.totalStock || 0) === 0 ? 'text-slate-400' : 'text-slate-800',
                      )} dir="ltr">
                        {toPersianDigits((it.totalStock || 0).toFixed(2))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="num text-slate-700" dir="ltr">{formatNumber(it.totalValue || 0)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(it); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(it)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ItemFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف کالا"
        message={`آیا از حذف «${deleting?.name}» اطمینان دارید؟`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
