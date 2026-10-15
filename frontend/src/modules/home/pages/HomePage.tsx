import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useAuthStore } from '@/store/auth.store';

interface Shortcut {
  label: string;
  href: string;
  icon: string;
  permission: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'درخواست خرید',   href: '/procurement/requests',    icon: '📝', permission: 'procurement.read' },
  { label: 'سفارش خرید',     href: '/procurement/orders',      icon: '🛒', permission: 'procurement.read' },
  { label: 'فاکتور خرید',    href: '/procurement/invoices',    icon: '🧾', permission: 'procurement.read' },
  { label: 'رسید انبار',     href: '/warehouse/receipts',      icon: '📦', permission: 'warehouse.read' },
  { label: 'حواله انبار',    href: '/warehouse/issues',        icon: '📤', permission: 'warehouse.read' },
  { label: 'کارتابل تایید',  href: '/approvals',               icon: '✅', permission: 'approvals.read' },
  { label: 'اسناد حسابداری', href: '/accounting/journals',     icon: '📒', permission: 'accounting.journals.read' },
  { label: 'تنخواه',         href: '/petty-cash',              icon: '💰', permission: 'petty-cash.read' },
  { label: 'گزارش روزانه',   href: '/site-ops/daily-reports',  icon: '📋', permission: 'site-ops.read' },
  { label: 'پروژه‌ها',       href: '/projects',               icon: '🏗',  permission: 'projects.read' },
  { label: 'اشخاص',          href: '/directory',               icon: '👥', permission: 'partners.read' },
  { label: 'گزارشات',        href: '/reports',                 icon: '📊', permission: 'dashboard.read' },
];

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  link?: string;
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const userPerms = useMemo<Set<string>>(() => {
    const raw = (user as { permissions?: string[] } | null)?.permissions;
    if (Array.isArray(raw)) return new Set(raw);
    return new Set<string>();
  }, [user]);

  const displayName =
    (user as { fullName?: string; username?: string } | null)?.fullName ||
    (user as { fullName?: string; username?: string } | null)?.username ||
    'کاربر';

  const todayFa = useMemo(
    () =>
      new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/notifications?limit=5', {
          credentials: 'include',
        });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const list: NotificationItem[] = Array.isArray(data)
          ? data
          : data?.items ?? data?.data ?? [];
        setNotifications(list.slice(0, 5));
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleShortcuts =
    userPerms.size > 0 ? SHORTCUTS.filter((s) => userPerms.has(s.permission)) : SHORTCUTS;

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-slate-50">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">سلام {displayName} 👋</h1>
            <p className="text-slate-500 mt-1 num">{todayFa}</p>
          </div>
          <div className="text-xs text-slate-400 self-center">استودیو معماری اپسای</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">🚀 دسترسی سریع</h2>
            {visibleShortcuts.length === 0 ? (
              <p className="text-slate-400 text-sm">میان‌بری برای نقش شما تعریف نشده.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {visibleShortcuts.map((s) => (
                  <Link
                    key={s.href}
                    to={s.href}
                    className="card p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{s.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">🔔 اعلان‌های اخیر</h2>
              <Link to="/notifications" className="text-brand-600 hover:underline text-sm">
                مشاهده همه
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-slate-400 text-sm py-2">اعلان جدیدی وجود ندارد.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      to={n.link || '/notifications'}
                      className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
                    >
                      <div className="font-medium text-slate-700 text-sm">{n.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5 line-clamp-1">{n.message}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 self-start">📅 تقویم</h2>
            <Calendar calendar={persian} locale={persian_fa} readOnly className="rmdp-wrapper" />
          </div>
        </div>
      </div>
    </div>
  );
}
