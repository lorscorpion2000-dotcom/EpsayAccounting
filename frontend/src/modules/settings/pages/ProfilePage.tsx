import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, User as UserIcon, Save, KeyRound, Mail, Phone, Shield, Upload, Trash2, FileSignature } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth.store';
import { profileApi } from '@/modules/auth/services/auth.api';
import TwoFactorSection from '../components/TwoFactorSection';
import { api } from '@/services/api';

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceChange = searchParams.get('force') === '1';
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>((user as any)?.signatureUrl || null);
  const [uploadingSig, setUploadingSig] = useState(false);

  const profileForm = useForm<any>({
    defaultValues: { fullName: '', email: '', mobile: '' },
  });

  const passwordForm = useForm<any>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) {
      setSignatureUrl((user as any)?.signatureUrl || null);
    }
  }, [user]);

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
    if (!data.newPassword || data.newPassword.length < 10) {
      toast.error('رمز جدید باید حداقل ۱۰ کاراکتر باشد'); return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error('تکرار رمز جدید مطابقت ندارد'); return;
    }
    setChangingPassword(true);
    try {
      await profileApi.changePassword(data.oldPassword, data.newPassword);
      toast.success('رمز عبور تغییر کرد');
      passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
      if (token && user) {
        setAuth(token, { ...user, mustChangePassword: false });
      }
      if (forceChange) {
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      }
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setChangingPassword(false); }
  };
  const uploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingSig(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data: res } = await api.patch('/auth/signature', { signatureUrl: data.url });
      setSignatureUrl(res.signatureUrl);
      toast.success('امضای شما ذخیره شد');
    } catch {
      toast.error('خطا در آپلود امضا');
    } finally {
      setUploadingSig(false);
      e.target.value = '';
    }
  };

  const removeSignature = async () => {
    if (!confirm('امضای شما حذف شود؟')) return;
    try {
      await api.patch('/auth/signature', { signatureUrl: null });
      setSignatureUrl(null);
      toast.success('امضا حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  if (!user) return null;


  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {forceChange && (
        <div className="card p-4 border-r-4 border-amber-500 bg-amber-50">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-amber-800">تغییر رمز پیش‌فرض الزامی است</div>
              <div className="text-sm text-amber-700 mt-0.5">
                برای استفاده از سیستم، ابتدا رمز عبور خود را تغییر دهید.
              </div>
            </div>
          </div>
        </div>
      )}
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

      {/* 2FA */}
      <TwoFactorSection />

      {/* امضای من */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-emerald-600" />
          امضای من
        </h2>
        <p className="text-sm text-slate-500">
          این امضا به‌صورت خودکار در پایین اسناد چاپی (صورت‌وضعیت، فاکتور و ...) زیر نام شما درج می‌شود.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          {signatureUrl ? (
            <img src={signatureUrl} alt="امضای من" className="border rounded bg-white p-2" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain' }} />
          ) : (
            <div className="border-2 border-dashed rounded flex items-center justify-center text-slate-400 text-xs" style={{ width: 200, height: 80 }}>
              امضا ثبت نشده
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="btn-primary flex items-center gap-1 cursor-pointer">
              {uploadingSig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {signatureUrl ? 'تغییر امضا' : 'آپلود امضا'}
              <input type="file" accept="image/*" className="hidden" onChange={uploadSignature} disabled={uploadingSig} />
            </label>
            {signatureUrl && (
              <button type="button" onClick={removeSignature} className="btn-secondary text-red-600 flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> حذف امضا
              </button>
            )}
          </div>
        </div>
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
