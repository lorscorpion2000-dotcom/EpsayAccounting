
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, User, Loader2 } from 'lucide-react';
import { authApi } from '../services/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';

interface FormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.username, data.password);
      setAuth(res.accessToken, res.user);

      // اعمال theme ذخیره‌شده کاربر
      const savedTheme = (res.user as any).themePreference;
      if (savedTheme) {
        useThemeStore.getState().setTheme(savedTheme, false);
      }
      toast.success(`خوش آمدید، ${res.user.fullName}`);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-4" dir="rtl">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-72 h-72 bg-brand-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <img
              src="/images/logo.png"
              alt="استودیو معماری اپسای"
              className="w-24 h-24 object-contain mb-4 mx-auto"
            />
            <h1 className="text-2xl font-bold text-slate-800 mb-1">حسابداری اپسای</h1>
            <p className="text-sm text-slate-500">استودیو معماری اپسای</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">نام کاربری</label>
              <div className="relative">
                <User className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoComplete="username"
                  {...register('username', { required: 'نام کاربری الزامی است' })}
                  className="input ps-4 pe-10"
                  placeholder="admin"
                  autoFocus
                  dir="ltr"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="label">رمز عبور</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  {...register('password', { required: 'رمز عبور الزامی است' })}
                  className="input ps-4 pe-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                'ورود به سیستم'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              نسخه {import.meta.env.VITE_APP_VERSION} • © ۱۴۰۴ استودیو اپسای
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
