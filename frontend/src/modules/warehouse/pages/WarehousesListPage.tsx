import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, Warehouse as WarehouseIcon, Edit, Trash2, FolderOpen, MapPin, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { Warehouse } from '@/types/warehouse';
import { WAREHOUSE_TYPE_LABELS } from '@/types/warehouse';
import { formatNumber, toPersianDigits } from '@/utils/format';
import WarehouseFormModal from '../components/WarehouseFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function WarehousesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.warehouses.list();
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await warehouseApi.warehouses.remove(deleting.id);
      toast.success('انبار حذف شد');
      setDeleting(null);
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
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-brand-600" />
            انبارها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت انبارهای مرکزی و کارگاهی</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> انبار جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
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
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <WarehouseIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ انباری ثبت نشده است</p>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> اولین انبار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wh) => (
            <div key={wh.id} className="card p-5 hover:shadow-card-hover transition-all group relative">
              <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(wh); setShowModal(true); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-amber-50 text-slate-600"
                  title="ویرایش"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleting(wh); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-red-50 text-slate-600"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div onClick={() => { setEditing(wh); setShowModal(true); }} className="cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                    wh.isActive ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-gradient-to-br from-slate-400 to-slate-600',
                  )}>
                    <WarehouseIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 line-clamp-1">{wh.name}</div>
                    <div className="text-xs text-slate-500 num" dir="ltr">{wh.code}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{WAREHOUSE_TYPE_LABELS[wh.type]}</span>
                  </div>
                  {wh.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{wh.location}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400">کالا</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.stocks || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">رسید</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.receipts || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">حواله</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.issues || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WarehouseFormModal
        isOpen={showModal}
        editingWarehouse={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف انبار"
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
