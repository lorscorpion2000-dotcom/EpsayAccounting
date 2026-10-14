import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, FolderTree, Edit, RefreshCw, Archive } from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { ItemCategory } from '@/types/warehouse';
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS } from '@/types/warehouse';
import { toPersianDigits } from '@/utils/format';
import CategoryFormModal from '../components/CategoryFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function CategoriesPage() {
  const [items, setItems] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ItemCategory | null>(null);
  const [deleting, setDeleting] = useState<ItemCategory | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.categories.list();
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {
      await warehouseApi.categories.remove(deleting.id, force);
      toast.success('دسته حذف شد');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'CATEGORY_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-emerald-600" />
            دسته‌بندی کالا
          </h1>
          <p className="text-sm text-slate-500 mt-1">ساختار درختی دسته‌بندی کالاها</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> دسته جدید
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ دسته‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> اولین دسته
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام دسته</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">کالاها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono text-slate-600" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded border', ITEM_TYPE_COLORS[c.type])}>
                        {ITEM_TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center num text-slate-600">
                      {toPersianDigits(c._count?.items || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/warehouse/categories"
                          id={c.id}
                          itemLabel={(c as any).code || (c as any).name || (c as any).title || (c as any).fullName || (c as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button
                          onClick={() => { setEditing(c); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
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

      <CategoryFormModal
        isOpen={showModal}
        editing={editing}
        categories={items}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting && !forceConfirm}
        title="حذف دسته"
        message={deleting ? "دسته «" + deleting.name + "» حذف شود؟" : ""}
        confirmLabel="بله، حذف شود"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">دسته قابل حذف نیست</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceError(null); setDeleting(null); }} className="btn-secondary">بستن</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
