import { useEffect, useState } from 'react';
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
    usersApi.roles().then((list) => setRoles(Array.isArray(list) ? list : [])).catch(() => []);

    if (editing) {
      reset({
        username: editing.username,
        fullName: editing.fullName,
        email: editing.email || '',
        mobile: editing.mobile || '',
        password: '',
        isActive: editing.isActive,
      });
      setSelectedRoles(Array.isArray(editing.roles) ? editing.roles.map((r) => r.id) : []);
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
