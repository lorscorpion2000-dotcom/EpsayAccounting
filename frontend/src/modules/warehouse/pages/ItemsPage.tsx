import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Package, Edit, RefreshCw, FileSpreadsheet, Archive } from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { Item } from '@/types/warehouse';
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, ITEM_UNIT_LABELS } from '@/types/warehouse';
import { formatNumber, toPersianDigits } from '@/utils/format';
import ItemFormModal from '../components/ItemFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const getItemUnitLabel = (it: Item) =>
  it.unitObj?.symbol || it.unitObj?.name || (it.unit ? ITEM_UNIT_LABELS[it.unit] : '') || '—';

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

  const [forceConfirm, setForceConfirm] = useState(false);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      const res = await warehouseApi.items.remove(deleting.id, force);
      if (res?.hardDeleted) {
        toast.success('کالا حذف شد');
        setDeleting(null);
        load();
      } else {
        setForceConfirm(true);
      }
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
      'واحد': getItemUnitLabel(it),
      'دسته': it.category?.name || '',
      'موجودی کل': it.totalStock || 0,
      'ارزش موجودی': it.totalValue || 0,
    }));
    void exportToExcel({
      filename: `Items-${todayLocalISO()}.xlsx`,
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
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32 sticky left-0 bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] z-10">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="group hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{it.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded border', ITEM_TYPE_COLORS[it.type])}>
                        {ITEM_TYPE_LABELS[it.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">{getItemUnitLabel(it)}</td>
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
                    <td className="px-4 py-3 text-center sticky left-0 bg-white group-hover:bg-slate-50/50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/warehouse/items"
                          id={it.id}
                          itemLabel={(it as any).code || (it as any).name || (it as any).title || (it as any).fullName || (it as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => { setEditing(it); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(it)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                          <Archive className="w-4 h-4" />
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
        isOpen={!!deleting && !forceConfirm}
        title="حذف کالا"
        message={`آیا از حذف «${deleting?.name}» اطمینان دارید؟`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => handleDelete(false)}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        isOpen={forceConfirm}
        title="حذف کامل (مدیر سیستم)"
        message={`کالای «${deleting?.name}» در اسناد انباری استفاده شده است. حذف کامل همه‌ی اسناد مرتبط (رسید، حواله، کاردکس، موجودی) را نیز پاک می‌کند. اطمینان دارید؟`}
        confirmLabel="حذف کامل (خطرناک)"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => handleDelete(true)}
        onCancel={() => { setForceConfirm(false); setDeleting(null); }}
      />
    </div>
  );
}
