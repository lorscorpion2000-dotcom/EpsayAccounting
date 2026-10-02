import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, User as UserIcon, Save, KeyRound, Mail, Phone, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth.store';
import { profileApi } from '@/modules/auth/services/auth.api';

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const profileForm = useForm<any>({
    defaultValues: { fullName: '', email: '', mobile: '' },
  });

  const passwordForm = useForm<any>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        email: user.email || '',
        mobile: user.mobile || '',
      });
    }
  }, [user]);

  const onSaveProfile = async (data: any) => {
    setSavingProfile(true);
    try {
      const updated = await profileApi.updateProfile({
        fullName: data.fullName,
        email: data.email || undefined,
        mobile: data.mobile || undefined,
      });
      if (token && user) {
        setAuth(token, { ...user, ...updated });
      }
      toast.success('اطلاعات ذخیره شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSavingProfile(false); }
  };

  const onChangePassword = async (data: any) => {
    if (!data.oldPassword) { toast.error('رمز فعلی الزامی است'); return; }
    if (!data.newPassword || data.newPassword.length < 6) {
      toast.error('رمز جدید باید حداقل ۶ کاراکتر باشد'); return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error('تکرار رمز جدید مطابقت ندارد'); return;
    }
    setChangingPassword(true);
    try {
      await profileApi.changePassword(data.oldPassword, data.newPassword);
      toast.success('رمز عبور تغییر کرد');
      passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setChangingPassword(false); }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-brand-600" />
          پروفایل کاربری
        </h1>
        <p className="text-sm text-slate-500 mt-1">مدیریت اطلاعات شخصی و رمز عبور</p>
      </div>

      {/* هدر پروفایل */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg shrink-0">
            {user.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-slate-800">{user.fullName}</div>
            <div className="text-sm text-slate-500 num" dir="ltr">@{user.username}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user.roles?.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs">
                  <Shield className="w-3 h-3" />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* فرم اطلاعات */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-brand-600" />
          اطلاعات شخصی
        </h2>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input
                {...profileForm.register('fullName', { required: 'نام الزامی است' })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> ایمیل
              </label>
              <input
                {...profileForm.register('email')}
                className="input w-full num"
                dir="ltr"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> موبایل
              </label>
              <input
                {...profileForm.register('mobile')}
                className="input w-full num"
                dir="ltr"
                placeholder="09..."
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              ذخیره تغییرات
            </button>
          </div>
        </form>
      </div>

      {/* فرم تغییر رمز */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-600" />
          تغییر رمز عبور
        </h2>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رمز عبور فعلی *</label>
            <input
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('oldPassword')}
              className="input w-full num"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رمز جدید *</label>
              <input
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('newPassword')}
                className="input w-full num"
                dir="ltr"
                placeholder="حداقل ۶ کاراکتر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تکرار رمز جدید *</label>
              <input
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('confirmPassword')}
                className="input w-full num"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={changingPassword} className="btn-primary">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              تغییر رمز عبور
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
