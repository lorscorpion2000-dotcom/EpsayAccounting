import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Edit, Trash2, RefreshCw, Ruler, Info } from 'lucide-react';
import clsx from 'clsx';
import { unitsApi, Unit } from '../services/units.api';
import { invalidateUnitsCache } from '@/hooks/useUnits';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import UnitFormModal from '../components/UnitFormModal';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState<Unit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await unitsApi.list({ search: search || undefined });
      setItems(list);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await unitsApi.remove(deleting.id);
      toast.success('واحد حذف شد');
      setDeleting(null);
      invalidateUnitsCache();
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در حذف');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ruler className="w-6 h-6 text-brand-600" />
            واحدهای اندازهگیری
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            واحدهای سراسری برنامه — قابل استفاده در کالاها خرید WBS و قیمتها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> واحد جدید
          </button>
        </div>
      </div>

      <div className="card p-4 border-s-4 border-s-blue-500 bg-blue-50/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            واحدهای سیستمی قابل حذف نیستند (فقط غیرفعال). واحدهایی که در اسناد استفاده شدهاند هم قابل حذف نیستند.
          </div>
        </div>
      </div>

      <div className="card p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          placeholder="جستجو در کد یا نام..."
          className="input w-full max-w-sm"
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Ruler className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">واحدی یافت نشد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">نماد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">نوع</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u, i) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center text-xs text-slate-500 num">
                      {toPersianDigits(i + 1)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono" dir="ltr">{u.code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-center text-slate-500 num" dir="ltr">
                      {u.symbol || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded',
                        u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                      )}>
                        {u.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isSystem
                        ? <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">سیستمی</span>
                        : <span className="text-xs text-slate-400">کاربری</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/units"
                          id={u.id}
                          itemLabel={(u as any).code || (u as any).name || (u as any).title || (u as any).fullName || (u as any).username || ''}
                          onSuccess={load}
                        />
                        <button
                          onClick={() => { setEditing(u); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {!u.isSystem && (
                          <button
                            onClick={() => setDeleting(u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
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

      <UnitFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={() => { invalidateUnitsCache(); load(); }}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف واحد"
        message={deleting ? 'آیا از حذف «' + deleting.name + '» اطمینان دارید' : ''}
        confirmLabel="بله حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
