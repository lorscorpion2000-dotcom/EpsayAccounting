import type { ReactNode } from 'react';
import { ShieldOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  /** کد permission لازم. آرایه = همه لازم است. */
  code?: string | string[];
  /** هر یک از این کدها کافی است (OR) */
  anyOf?: string[];
  /** محتوای جایگزین در صورت عدم دسترسی (پیش‌فرض: صفحه «دسترسی ندارید») */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * F1 — محافظت از محتوای یک صفحه یا دکمه بر اساس permission.
 * - code: همه کدها لازم است (AND)
 * - anyOf: هر یک از کدها کافی است (OR)
 * - بدون code و anyOf: آزاد
 * - super_admin همه‌چیز را می‌بیند
 */
export function RequirePermission({ code, anyOf, fallback, children }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

  let ok = true;
  if (code) {
    ok = Array.isArray(code) ? code.every((c) => hasPermission(c)) : hasPermission(code);
  } else if (anyOf && anyOf.length > 0) {
    ok = hasAnyPermission(...anyOf);
  }

  if (!ok) {
    return <>{fallback ?? <AccessDenied />}</>;
  }
  return <>{children}</>;
}

export function AccessDenied() {
  return (
    <div className="card p-12 text-center max-w-md mx-auto mt-12">
      <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
        <ShieldOff className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">دسترسی ندارید</h2>
      <p className="text-sm text-slate-500 leading-relaxed">
        برای مشاهده این بخش با مدیر سیستم تماس بگیرید یا از منوی اصلی صفحه دیگری را انتخاب کنید.
      </p>
    </div>
  );
}

export default RequirePermission;
