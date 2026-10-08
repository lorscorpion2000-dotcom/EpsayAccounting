import fs from 'node:fs';
import path from 'node:path';

const FE = 'E:\\EpsayAccounting\\frontend\\src';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ═══════════════════════════════════════
// 1) ساخت TwoFactorSection.tsx
// ═══════════════════════════════════════
console.log('--- TwoFactorSection.tsx (new) ---');
const compDir = FE + '\\modules\\settings\\components';
if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });

const compPath = compDir + '\\TwoFactorSection.tsx';

const compCode = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  QrCode,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Download,
  X,
} from 'lucide-react';
import { authApi } from '@/modules/auth/services/auth.api';

type Mode = 'idle' | 'setup' | 'recovery-codes' | 'disable-confirm';

export default function TwoFactorSection() {
  const [status, setStatus] = useState<{ enabled: boolean; enabledAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');

  // setup data
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');

  // recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // disable
  const [disablePassword, setDisablePassword] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const s = await authApi.status2FA();
      setStatus(s);
    } catch {
      toast.error('خطا در دریافت وضعیت 2FA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await authApi.setup2FA();
      setQrDataUrl(res.qrDataUrl);
      setOtpauth(res.otpauth);
      setSecret(res.secret);
      setCode('');
      setMode('setup');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در شروع فعال‌سازی');
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = () => {
    setMode('idle');
    setQrDataUrl('');
    setOtpauth('');
    setSecret('');
    setCode('');
  };

  const confirmEnable = async () => {
    const clean = code.replace(/\\s/g, '');
    if (clean.length < 6) {
      toast.error('کد ۶ رقمی را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.enable2FA(clean);
      setRecoveryCodes(res.recoveryCodes || []);
      setMode('recovery-codes');
      await loadStatus();
      toast.success('ورود دو مرحله‌ای فعال شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'کد نامعتبر است');
    } finally {
      setBusy(false);
    }
  };

  const closeRecovery = () => {
    setRecoveryCodes([]);
    setMode('idle');
    setCopied(false);
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('کدها کپی شدند');
    } catch {
      toast.error('کپی ناموفق بود');
    }
  };

  const downloadRecoveryCodes = () => {
    const txt =
      'کدهای بازیابی — حسابداری اپسای\\n' +
      'تاریخ: ' + new Date().toLocaleString('fa-IR') + '\\n' +
      'هر کد فقط یک بار قابل استفاده است.\\n\\n' +
      recoveryCodes.join('\\n') + '\\n';
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'epsay-2fa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startDisable = () => {
    setDisablePassword('');
    setMode('disable-confirm');
  };

  const confirmDisable = async () => {
    if (!disablePassword) {
      toast.error('رمز عبور را وارد کنید');
      return;
    }
    setBusy(true);
    try {
      await authApi.disable2FA(disablePassword);
      await loadStatus();
      setMode('idle');
      setDisablePassword('');
      toast.success('ورود دو مرحله‌ای غیرفعال شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'رمز عبور اشتباه است');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {status?.enabled ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <ShieldOff className="w-5 h-5 text-slate-400" />
          )}
          ورود دو مرحله‌ای (2FA)
        </h2>
        {status?.enabled && (
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold">
            فعال
          </span>
        )}
        {!status?.enabled && (
          <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold">
            غیرفعال
          </span>
        )}
      </div>

      {/* ─── حالت idle: غیرفعال ─── */}
      {status && !status.enabled && mode === 'idle' && (
        <>
          <p className="text-sm text-slate-600 mb-4">
            با فعال‌سازی ورود دو مرحله‌ای، علاوه بر رمز عبور، کد ۶ رقمی از اپ Authenticator
            (مثل Google Authenticator) هم لازم می‌شود. امنیت حساب به‌مراتب بیشتر می‌شود.
          </p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="btn-primary"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            فعال‌سازی ورود دو مرحله‌ای
          </button>
        </>
      )}

      {/* ─── حالت idle: فعال ─── */}
      {status && status.enabled && mode === 'idle' && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              ورود دو مرحله‌ای فعال است
            </div>
            {status.enabledAt && (
              <div className="text-xs text-emerald-700">
                تاریخ فعال‌سازی: {new Date(status.enabledAt).toLocaleString('fa-IR')}
              </div>
            )}
          </div>
          <button
            onClick={startDisable}
            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
          >
            <ShieldOff className="w-4 h-4" />
            غیرفعال کردن
          </button>
        </>
      )}

      {/* ─── حالت setup: نمایش QR ─── */}
      {mode === 'setup' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                اپ Authenticator را باز کنید، QR را اسکن کنید و کد ۶ رقمی که نمایش می‌دهد را وارد کنید.
                <span className="font-bold"> اگر کدها را ذخیره نکنید، در صورت گم شدن گوشی نمی‌توانید وارد شوید.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="2FA QR Code"
                className="w-56 h-56 rounded-lg border border-slate-200 bg-white p-2"
              />
            )}
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-1">یا کد زیر را دستی وارد کنید:</div>
              <code className="text-xs bg-slate-100 rounded px-2 py-1 font-mono num" dir="ltr">
                {secret}
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              کد ۶ رقمی از اپ Authenticator
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\\s/g, ''))}
              className="input w-full text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              maxLength={6}
              autoFocus
              dir="ltr"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={cancelSetup}
              disabled={busy}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              انصراف
            </button>
            <button
              onClick={confirmEnable}
              disabled={busy || code.replace(/\\s/g, '').length < 6}
              className="btn-primary disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              تأیید و فعال‌سازی
            </button>
          </div>
        </div>
      )}

      {/* ─── حالت recovery-codes ─── */}
      {mode === 'recovery-codes' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-1">این کدها را در جای امنی ذخیره کنید!</div>
                <div className="text-xs">
                  اگر گوشی خود را گم کنید، تنها راه ورود به سیستم استفاده از این کدهاست.
                  هر کد فقط یک بار قابل استفاده است و بعد از بستن این پنجره دیگر نمایش داده نمی‌شوند.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg">
            {recoveryCodes.map((c, i) => (
              <code
                key={i}
                className="text-sm font-mono num bg-white rounded px-2 py-1.5 border border-slate-200 text-center"
                dir="ltr"
              >
                {c}
              </code>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={copyRecoveryCodes} className="btn-secondary">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'کپی شد' : 'کپی همه'}
            </button>
            <button onClick={downloadRecoveryCodes} className="btn-secondary">
              <Download className="w-4 h-4" />
              دانلود
            </button>
            <button onClick={closeRecovery} className="btn-primary">
              <Check className="w-4 h-4" />
              ذخیره کردم
            </button>
          </div>
        </div>
      )}

      {/* ─── حالت disable-confirm ─── */}
      {mode === 'disable-confirm' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                با غیرفعال کردن 2FA، امنیت حساب شما کاهش می‌یابد. برای تأیید، رمز عبور خود را وارد کنید.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رمز عبور فعلی</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="input w-full ps-4 pe-10 num"
                dir="ltr"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setMode('idle'); setDisablePassword(''); }}
              disabled={busy}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              انصراف
            </button>
            <button
              onClick={confirmDisable}
              disabled={busy || !disablePassword}
              className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
              غیرفعال کردن 2FA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync(compPath, compCode, 'utf8');
console.log('OK TwoFactorSection.tsx created');

// ═══════════════════════════════════════
// 2) ProfilePage — اضافه کردن بخش 2FA
// ═══════════════════════════════════════
console.log('--- ProfilePage.tsx ---');
const pagePath = FE + '\\modules\\settings\\pages\\ProfilePage.tsx';
fs.copyFileSync(pagePath, `${pagePath}.bak-${STAMP}`);
let page = fs.readFileSync(pagePath, 'utf8');

// import
if (!page.includes('TwoFactorSection')) {
  page = page.replace(
    "import { profileApi } from '@/modules/auth/services/auth.api';",
    "import { profileApi } from '@/modules/auth/services/auth.api';\nimport TwoFactorSection from '../components/TwoFactorSection';"
  );
  console.log('OK import TwoFactorSection');
}

// درج کامپوننت قبل از بخش "فرم تغییر رمز"
const marker = `      {/* ÙØ±Ù… ØªØºÛŒÛŒØ± Ø±Ù…Ø² */}`;

if (page.includes(marker) && !page.includes('<TwoFactorSection')) {
  page = page.replace(marker, `      {/* 2FA */}\n      <TwoFactorSection />\n\n${marker}`);
  console.log('OK TwoFactorSection inserted before password form');
} else if (page.includes('<TwoFactorSection')) {
  console.log('INFO: already inserted');
} else {
  console.log('WARN: password form marker not found');
}

fs.writeFileSync(pagePath, page, 'utf8');

console.log('\n=== DONE 6.4c ===');