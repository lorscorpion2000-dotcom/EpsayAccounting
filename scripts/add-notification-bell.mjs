import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) NotificationBell.tsx — کامپوننت زنگوله
// ═══════════════════════════════════════════════════════════════
const bellComponent = `import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Loader2, ShoppingCart, ShoppingBag, Wallet, X,
  CheckCircle2, AlertCircle, Building2, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { approvalsApi, PendingApproval } from '@/modules/approvals/services/approvals.api';

interface NotifItem {
  id: string;
  module: string;
  type: string;
  title: string;
  subtitle?: string;
  amount?: number;
  url: string;
  icon: any;
  color: string;
}

const MODULE_META: Record<string, { label: string; icon: any; color: string; urlPrefix: string }> = {
  PR:      { label: 'درخواست خرید',   icon: ShoppingCart, color: 'text-blue-600',   urlPrefix: '/procurement/requests/' },
  PO:      { label: 'دستور خرید',     icon: ShoppingBag,  color: 'text-orange-600', urlPrefix: '/procurement/orders/' },
  CASH_TX: { label: 'تراکنش تنخواه', icon: Wallet,       color: 'text-amber-600',  urlPrefix: '/petty-cash/' },
  CASH_RQ: { label: 'درخواست تنخواه', icon: Wallet,       color: 'text-emerald-600',urlPrefix: '/petty-cash/' },
  STATEMENT: { label: 'صورت\u200Cوضعیت', icon: FileText,  color: 'text-violet-600', urlPrefix: '/payroll/subcontractor-statements/' },
};

function toItems(data: any): NotifItem[] {
  if (!data) return [];
  const items: NotifItem[] = [];

  const push = (list: PendingApproval[], moduleKey: string) => {
    if (!Array.isArray(list)) return;
    const meta = MODULE_META[moduleKey] || { label: moduleKey, icon: Bell, color: 'text-slate-600', urlPrefix: '/' };
    for (const p of list) {
      items.push({
        id: p.id,
        module: p.module,
        type: meta.label,
        title: (p.title || p.code || 'بدون عنوان') + (p.code ? ' \\u2014 ' + p.code : ''),
        subtitle: p.projectName || p.requester || p.description || '',
        amount: typeof p.amount === 'number' ? p.amount : Number(p.amount) || undefined,
        url: meta.urlPrefix + p.id,
        icon: meta.icon,
        color: meta.color,
      });
    }
  };

  push(data.purchaseRequests || [], 'PR');
  push(data.purchaseOrders || [], 'PO');
  push(data.pettyCashTransactions || [], 'CASH_TX');
  push(data.pettyCashRequests || [], 'CASH_RQ');
  if (Array.isArray(data.statements)) push(data.statements, 'STATEMENT');

  return items;
}

export default function NotificationBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await approvalsApi.getPending();
      setItems(toItems(data));
      setLastError(null);
    } catch {
      setLastError('خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  // بارگذاری اولیه + هر ۳۰ ثانیه
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // بستن وقتی بیرون کلیک شد
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const goTo = (url: string) => {
    setOpen(false);
    nav(url);
  };

  const goToCartable = () => {
    setOpen(false);
    nav('/approvals');
  };

  const count = items.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative"
        title="اعلانات"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          {/* هدر */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-slate-800 text-sm">اعلانات</span>
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={load}
                className="p-1 rounded hover:bg-slate-200 text-slate-500 text-xs"
                title="به\u200Cروزرسانی"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⟳'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* محتوا */}
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">در حال بارگذاری...</span>
              </div>
            ) : lastError ? (
              <div className="p-8 text-center text-red-500 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {lastError}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <div className="text-sm">هیچ اعلان جدیدی نیست</div>
                <div className="text-xs mt-1">کارتابل شما خالی است</div>
              </div>
            ) : (
              <>
                {items.slice(0, 10).map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      onClick={() => goTo(it.url)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right border-b border-slate-100 last:border-0"
                    >
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100', it.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-700 mb-0.5">{it.type}</div>
                        <div className="text-xs text-slate-800 truncate">{it.title}</div>
                        {it.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{it.subtitle}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {items.length > 10 && (
                  <button
                    onClick={goToCartable}
                    className="w-full py-2 text-xs text-brand-600 hover:bg-brand-50 font-medium"
                  >
                    + {items.length - 10} مورد دیگر
                  </button>
                )}
              </>
            )}
          </div>

          {/* پانویس */}
          {items.length > 0 && (
            <button
              onClick={goToCartable}
              className="w-full py-3 text-sm text-brand-600 hover:bg-brand-50 font-bold border-t bg-slate-50"
            >
              مشاهده همه در کارتابل
            </button>
          )}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/components/NotificationBell.tsx', bellComponent, 'utf8');
console.log('OK NotificationBell.tsx');

// ═══════════════════════════════════════════════════════════════
// 2) به\u200Cروزرسانی MainLayout — استفاده از NotificationBell
// ═══════════════════════════════════════════════════════════════
const mlPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let ml = fs.readFileSync(mlPath, 'utf8');
let changed = false;

// import
if (!ml.includes('NotificationBell')) {
  ml = ml.replace(
    "import ThemeSelector from '@/components/ThemeSelector';",
    "import ThemeSelector from '@/components/ThemeSelector';\nimport NotificationBell from '@/components/NotificationBell';"
  );
  changed = true;
  console.log('OK import NotificationBell');
}

// جایگزینی Bell button با کامپوننت
const oldBell = `            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>`;

if (ml.includes(oldBell)) {
  ml = ml.replace(oldBell, '            <NotificationBell />');
  changed = true;
  console.log('OK Bell جایگزین شد');
} else {
  // تلاش با regex
  const bellRegex = /<button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative">[\s\S]*?<Bell[\s\S]*?<\/button>/;
  if (bellRegex.test(ml)) {
    ml = ml.replace(bellRegex, '<NotificationBell />');
    changed = true;
    console.log('OK Bell جایگزین شد (regex)');
  } else {
    console.log('!! Bell button پیدا نشد');
  }
}

if (changed) {
  fs.writeFileSync(mlPath, ml, 'utf8');
  console.log('OK MainLayout.tsx ذخیره شد');
}

console.log('');
console.log('=== DONE ===');