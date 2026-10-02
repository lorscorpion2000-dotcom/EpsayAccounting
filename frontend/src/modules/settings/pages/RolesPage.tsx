import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Shield, Plus, Edit, Trash2, RefreshCw, Lock } from 'lucide-react';
import { rolesApi, SystemRole } from '../services/roles.api';
import RoleFormModal from '../components/RoleFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function RolesPage() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SystemRole | null>(null);
  const [deleting, setDeleting] = useState<SystemRole | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRoles(await rolesApi.list()); }
    catch { toast.error('خطا در بارگذاری نقش‌ها'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await rolesApi.remove(deleting.id);
      toast.success('نقش حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">نقش‌ها و مجوزها</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت نقش‌ها و سطوح دسترسی سیستم</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="btn-primary"
            onClick={() => { setEditing(null); setShowModal(true); }}
          >
            <Plus className="w-4 h-4" />
            نقش جدید
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ نقشی ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین نقش
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{r.displayName}</div>
                    <div className="text-xs text-slate-500 num truncate" dir="ltr">{r.code}</div>
                  </div>
                </div>
                {r.isSystem && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 inline-flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" />
                    سیستمی
                  </span>
                )}
              </div>

              {r.description && (
                <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                  {r.description}
                </p>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700 num">{r.permissions?.length ?? 0}</span> مجوز
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(r); setShowModal(true); }}
                    className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                    title="ویرایش"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(r)}
                    disabled={r.isSystem}
                    className={
                      'p-1.5 rounded-lg ' +
                      (r.isSystem
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'hover:bg-red-50 text-red-600')
                    }
                    title={r.isSystem ? 'نقش سیستمی قابل حذف نیست' : 'حذف'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف نقش"
        message={'آیا از حذف نقش «' + (deleting?.displayName || '') + '» اطمینان دارید؟ این عمل قابل بازگشت نیست.'}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
