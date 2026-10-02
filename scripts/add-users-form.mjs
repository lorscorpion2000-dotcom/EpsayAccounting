import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Users API client
// ═══════════════════════════════════════════════════════════════
const apiContent = `import { api } from '@/services/api';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  isActive: boolean;
  roles: { id: string; code: string; displayName: string }[];
}

export interface SystemRole {
  id: string;
  code: string;
  displayName: string;
  description?: string;
}

export const usersApi = {
  list: async (): Promise<SystemUser[]> => {
    const { data } = await api.get<SystemUser[]>('/users');
    return data;
  },
  create: async (payload: any): Promise<SystemUser> => {
    const { data } = await api.post<SystemUser>('/users', payload);
    return data;
  },
  update: async (id: string, payload: any): Promise<SystemUser> => {
    const { data } = await api.patch<SystemUser>('/users/' + id, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/users/' + id);
  },
  roles: async (): Promise<SystemRole[]> => {
    const { data } = await api.get<SystemRole[]>('/roles');
    return data;
  },
};
`;

fs.mkdirSync(ROOT + '/frontend/src/modules/settings/services', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/settings/services/users.api.ts', apiContent, 'utf8');
console.log('OK users.api.ts');

// ═══════════════════════════════════════════════════════════════
// 2) UserFormModal.tsx
// ═══════════════════════════════════════════════════════════════
const modalContent = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2, Shield, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { usersApi, SystemUser, SystemRole } from '../services/users.api';

interface Props {
  isOpen: boolean;
  editing?: SystemUser | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function UserFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  useEffect(() => {
    if (!isOpen) return;
    usersApi.roles().then(setRoles).catch(() => []);

    if (editing) {
      reset({
        username: editing.username,
        fullName: editing.fullName,
        email: editing.email || '',
        mobile: editing.mobile || '',
        password: '',
        isActive: editing.isActive,
      });
      setSelectedRoles(editing.roles.map((r) => r.id));
    } else {
      reset({ username: '', fullName: '', email: '', mobile: '', password: '', isActive: true });
      setSelectedRoles([]);
    }
  }, [isOpen, editing, reset]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  };

  const onSubmit = async (data: any) => {
    if (!editing && !data.password) {
      toast.error('برای کاربر جدید رمز عبور الزامی است');
      return;
    }
    if (data.password && data.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        username: data.username,
        fullName: data.fullName,
        email: data.email || undefined,
        mobile: data.mobile || undefined,
        isActive: data.isActive,
        roleIds: selectedRoles,
      };
      if (data.password) payload.password = data.password;

      if (editing) {
        await usersApi.update(editing.id, payload);
        toast.success('کاربر ویرایش شد');
      } else {
        await usersApi.create(payload);
        toast.success('کاربر جدید ساخته شد');
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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش کاربر' : 'کاربر جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input
                {...register('fullName', { required: 'نام الزامی است' })}
                className="input w-full"
                placeholder="علی رضایی"
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{(errors.fullName as any).message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کاربری *</label>
              <input
                {...register('username', { required: 'نام کاربری الزامی است' })}
                className="input w-full num"
                dir="ltr"
                placeholder="ali.rezaei"
                disabled={!!editing}
              />
              {errors.username && <p className="text-xs text-red-500 mt-1">{(errors.username as any).message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ایمیل</label>
              <input {...register('email')} className="input w-full num" dir="ltr" placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">موبایل</label>
              <input {...register('mobile')} className="input w-full num" dir="ltr" placeholder="09..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                رمز عبور {editing ? '(خالی بگذارید تا تغییر نکند)' : '*'}
              </label>
              <input
                type="password"
                {...register('password')}
                className="input w-full num"
                dir="ltr"
                placeholder={editing ? 'برای تغییر رمز جدید وارد کنید' : 'حداقل ۶ کاراکتر'}
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
                <span className="text-sm text-slate-700">کاربر فعال است</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نقش‌ها و دسترسی‌ها</label>
            {roles.length === 0 ? (
              <p className="text-xs text-slate-500">هیچ نقشی تعریف نشده</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const selected = selectedRoles.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={
                        'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-right ' +
                        (selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700')
                      }
                    >
                      <div className={
                        'w-5 h-5 rounded flex items-center justify-center shrink-0 ' +
                        (selected ? 'bg-brand-500 text-white' : 'bg-slate-100')
                      }>
                        {selected ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3 text-slate-400" />}
                      </div>
                      <div className="flex-1 text-sm font-medium truncate">{r.displayName}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              برای انتخاب چندگانه، روی هر نقش کلیک کنید
            </p>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
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

fs.mkdirSync(ROOT + '/frontend/src/modules/settings/components', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/settings/components/UserFormModal.tsx', modalContent, 'utf8');
console.log('OK UserFormModal.tsx');

// ═══════════════════════════════════════════════════════════════
// 3) UsersPage — full rewrite
// ═══════════════════════════════════════════════════════════════
const pageContent = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Shield, Edit, Trash2, RefreshCw } from 'lucide-react';
import { usersApi, SystemUser } from '../services/users.api';
import UserFormModal from '../components/UserFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState<SystemUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch {
      toast.error('خطا در بارگذاری کاربران');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await usersApi.remove(deleting.id);
      toast.success('حذف شد');
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
          <h1 className="text-2xl font-bold text-slate-800">کاربران</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت کاربران و دسترسی‌های سیستم</p>
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
            کاربر جدید
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ کاربری ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین کاربر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">کاربر</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">ایمیل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">موبایل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نقش‌ها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{u.fullName}</div>
                          <div className="text-xs text-slate-500 num" dir="ltr">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 num text-xs" dir="ltr">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 num text-xs" dir="ltr">{u.mobile || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs">
                              <Shield className="w-3 h-3" />
                              {r.displayName}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ' + (u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                        <span className={'w-1.5 h-1.5 rounded-full ' + (u.isActive ? 'bg-emerald-500' : 'bg-red-500')}></span>
                        {u.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(u); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(u)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
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

      <UserFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف کاربر"
        message={'آیا از حذف «' + (deleting?.fullName || '') + '» اطمینان دارید؟ این عمل قابل بازگشت نیست.'}
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

fs.writeFileSync(ROOT + '/frontend/src/modules/settings/pages/UsersPage.tsx', pageContent, 'utf8');
console.log('OK UsersPage.tsx');

console.log('');
console.log('=== DONE ===');
console.log('⚠ اگر /roles یا /users endpoint نبود، backend نیاز به پچ دارد');