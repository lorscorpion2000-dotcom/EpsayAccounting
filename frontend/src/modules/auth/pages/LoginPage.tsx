import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, User, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { authApi } from '../services/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/utils/api-error';
import { useThemeStore } from '@/store/theme.store';

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'نام کاربری الزامی است')
    .min(3, 'نام کاربری حداقل ۳ کاراکتر است'),
  password: z
    .string()
    .min(1, 'رمز عبور الزامی است')
    .min(6, 'رمز عبور حداقل ۶ کاراکتر است'),
});
type FormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors }, getValues: _getValues } = useForm<FormData>({ resolver: zodResolver(loginSchema) });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // 2FA state
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [totpToken, setTotpToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const applySuccessfulLogin = (res: any) => {
    setAuth(res.accessToken, res.user, res.refreshToken);

    // اعمال theme ذخیره‌شده کاربر
    const savedTheme = (res.user as any).themePreference;
    if (savedTheme) {
      useThemeStore.getState().setTheme(savedTheme, false);
    }
    if ((res.user as any).mustChangePassword) {
      toast.warning('لطفاً رمز عبور پیش‌فرض خود را تغییر دهید');
      navigate('/settings/profile?force=1', { replace: true });
      return;
    }
    toast.success(`خوش آمدید، ${res.user.fullName}`);
    navigate('/dashboard', { replace: true });
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.username, data.password);

      // 2FA required?
      if (res.requiresTwoFactor && res.totpToken) {
        setTotpToken(res.totpToken);
        setStep('2fa');
        setTwoFactorCode('');
        toast.info('کد تأیید دو مرحله‌ای را وارد کنید');
        return;
      }

      // login عادی
      if (res.accessToken && res.user) {
        applySuccessfulLogin(res);
      }
    } catch (e: any) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = twoFactorCode.trim();
    if (code.length < 6) {
      toast.error('کد ۶ رقمی را وارد کنید');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verify2FA(totpToken, code);
      applySuccessfulLogin(res);
    } catch (e: any) {
      toast.error(getApiErrorMessage(e));
      setTwoFactorCode('');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setTotpToken('');
    setTwoFactorCode('');
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

          {step === 'credentials' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">نام کاربری</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    {...register('username')}
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
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className="input ps-12 pe-10"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                    title={showPassword ? 'مخفی کردن' : 'نمایش'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
          )}

          {step === '2fa' && (
            <form onSubmit={onVerify2FA} className="space-y-4">
              <div className="flex flex-col items-center mb-2">
                <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-8 h-8 text-brand-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">تأیید دو مرحله‌ای</h2>
                <p className="text-sm text-slate-500 text-center">
                  کد ۶ رقمی اپ Authenticator را وارد کنید
                </p>
              </div>

              <div>
                <label className="label">کد تأیید</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
                  className="input text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={12}
                  autoFocus
                  dir="ltr"
                />
                <p className="text-xs text-slate-400 mt-2 text-center">
                  می‌توانید از کد بازیابی هم استفاده کنید
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.trim().length < 6}
                className="btn-primary w-full py-3 text-base mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    در حال بررسی...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    تأیید و ورود
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={backToCredentials}
                disabled={loading}
                className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 py-2"
              >
                <ArrowRight className="w-4 h-4" />
                بازگشت
              </button>
            </form>
          )}

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
