import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Roles & Permissions API
// ═══════════════════════════════════════════════════════════════
const apiContent = `import { api } from '@/services/api';

export interface SystemPermission {
  id: string;
  code: string;
  displayName: string;
  module: string;
  action: string;
}

export interface SystemRole {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  isSystem?: boolean;
  permissions?: SystemPermission[];
}

export const rolesApi = {
  list: async (): Promise<SystemRole[]> => {
    const { data } = await api.get<SystemRole[]>('/roles');
    return data;
  },
  get: async (id: string): Promise<SystemRole> => {
    const { data } = await api.get<SystemRole>('/roles/' + id);
    return data;
  },
  create: async (payload: any): Promise<SystemRole> => {
    const { data } = await api.post<SystemRole>('/roles', payload);
    return data;
  },
  update: async (id: string, payload: any): Promise<SystemRole> => {
    const { data } = await api.patch<SystemRole>('/roles/' + id, payload);
    return data;
  },
  assignPermissions: async (id: string, permissionIds: string[]): Promise<SystemRole> => {
    const { data } = await api.patch<SystemRole>('/roles/' + id + '/permissions', { permissionIds });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/roles/' + id);
  },
};

export const permissionsApi = {
  list: async (): Promise<SystemPermission[]> => {
    const { data } = await api.get<SystemPermission[]>('/permissions');
    return data;
  },
};
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/settings/services/roles.api.ts', apiContent, 'utf8');
console.log('OK roles.api.ts');

// ═══════════════════════════════════════════════════════════════
// 2) RoleFormModal.tsx
// ═══════════════════════════════════════════════════════════════
const modalContent = `import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2, Shield, Check, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { rolesApi, permissionsApi, SystemRole, SystemPermission } from '../services/roles.api';

interface Props {
  isOpen: boolean;
  editing?: SystemRole | null;
  onClose: () => void;
  onSaved: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  users: 'کاربران',
  roles: 'نقش‌ها',
  partners: 'اشخاص',
  projects: 'پروژه‌ها',
  contracts: 'قراردادها',
  wbs: 'ساختار شکست',
  budgets: 'بودجه',
  accounting: 'حسابداری',
  'petty-cash': 'تنخواه',
  approvals: 'تأییدات',
  procurement: 'خرید و تأمین',
  warehouse: 'انبار',
  'site-ops': 'عملیات کارگاه',
  payroll: 'حقوق و دستمزد',
  'partner-capital': 'سرمایه شرکا',
  timeline: 'گاه‌شمار',
  'legal-contracts': 'قراردادهای حقوقی',
  sales: 'فروش',
  dashboard: 'داشبورد',
  settings: 'تنظیمات',
  directory: 'دایرکتوری',
};

export default function RoleFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  useEffect(() => {
    if (!isOpen) return;
    permissionsApi.list().then(setPermissions).catch(() => []);

    if (editing) {
      reset({
        code: editing.code,
        displayName: editing.displayName,
        description: editing.description || '',
      });
      setSelected(editing.permissions?.map((p) => p.id) || []);
    } else {
      reset({ code: '', displayName: '', description: '' });
      setSelected([]);
    }
    setPermSearch('');
  }, [isOpen, editing, reset]);

  // گروه‌بندی permissions بر اساس module
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, SystemPermission[]>();
    const filtered = permSearch
      ? permissions.filter(
          (p) =>
            p.displayName.includes(permSearch) ||
            p.code.toLowerCase().includes(permSearch.toLowerCase()),
        )
      : permissions;
    for (const p of filtered) {
      const mod = p.module.split('.')[0];
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, permSearch]);

  const togglePerm = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleModule = (module: string) => {
    const modulePerms = groupedPermissions.find(([m]) => m === module)?.[1] || [];
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editing) {
        await rolesApi.update(editing.id, {
          displayName: data.displayName,
          description: data.description || undefined,
        });
        await rolesApi.assignPermissions(editing.id, selected);
        toast.success('نقش ویرایش شد');
      } else {
        await rolesApi.create({
          code: data.code,
          displayName: data.displayName,
          description: data.description || undefined,
          permissionIds: selected,
        });
        toast.success('نقش جدید ساخته شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش نقش' : 'نقش جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد نقش *</label>
              <input
                {...register('code', {
                  required: 'کد الزامی است',
                  minLength: { value: 3, message: 'حداقل ۳ کاراکتر' },
                  pattern: { value: /^[a-z0-9_]+$/, message: 'فقط حروف کوچک، عدد و _' },
                })}
                className="input w-full num"
                dir="ltr"
                placeholder="accountant"
                disabled={!!editing}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{(errors.code as any).message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام نمایشی *</label>
              <input
                {...register('displayName', { required: 'نام الزامی است' })}
                className="input w-full"
                placeholder="حسابدار"
              />
              {errors.displayName && <p className="text-xs text-red-500 mt-1">{(errors.displayName as any).message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
              <textarea {...register('description')} rows={2} className="input w-full resize-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block text-sm font-medium text-slate-700">
                مجوزها ({selected.length} از {permissions.length} انتخاب‌شده)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(permissions.map((p) => p.id))}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  انتخاب همه
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  پاک کردن
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="جستجوی مجوز..."
                className="input ps-10 pe-4 w-full text-sm"
              />
            </div>

            <div className="border rounded-lg max-h-80 overflow-y-auto p-3 bg-slate-50 space-y-3">
              {groupedPermissions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">مجوزی پیدا نشد</p>
              ) : (
                groupedPermissions.map(([module, perms]) => {
                  const allSelected = perms.every((p) => selected.includes(p.id));
                  const someSelected = perms.some((p) => selected.includes(p.id));
                  return (
                    <div key={module} className="bg-white rounded-lg border">
                      <button
                        type="button"
                        onClick={() => toggleModule(module)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-t-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className={
                            'w-5 h-5 rounded flex items-center justify-center shrink-0 ' +
                            (allSelected ? 'bg-brand-500 text-white' : someSelected ? 'bg-brand-200' : 'bg-slate-200')
                          }>
                            {allSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="font-medium text-slate-700 text-sm">
                            {MODULE_LABELS[module] || module}
                          </span>
                          <span className="text-xs text-slate-400">({perms.length})</span>
                        </div>
                      </button>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-3 pt-0">
                        {perms.map((p) => {
                          const isSel = selected.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => togglePerm(p.id)}
                              className={
                                'flex items-center gap-2 p-2 rounded text-right text-xs transition-all ' +
                                (isSel
                                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                  : 'text-slate-600 hover:bg-slate-50 border border-transparent')
                              }
                            >
                              <div className={
                                'w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 ' +
                                (isSel ? 'bg-brand-500 text-white' : 'bg-slate-200')
                              }>
                                {isSel && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span className="truncate">{p.displayName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50 shrink-0">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/settings/components/RoleFormModal.tsx', modalContent, 'utf8');
console.log('OK RoleFormModal.tsx');

// ═══════════════════════════════════════════════════════════════
// 3) RolesPage — full rewrite
// ═══════════════════════════════════════════════════════════════
const pageContent = `import { useEffect, useState } from 'react';
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
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/settings/pages/RolesPage.tsx', pageContent, 'utf8');
console.log('OK RolesPage.tsx');

console.log('');
console.log('=== Frontend DONE ===');