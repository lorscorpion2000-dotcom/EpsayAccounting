import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation } from 'react-router-dom';
import { getMenuPermission } from '@/config/route-permissions';
import { Landmark, Link2, Target, LayoutDashboard, Users as UsersIcon, Shield, LogOut, Bell, Search, Menu, Briefcase, Crosshair, HandCoins, ReceiptText, Receipt, Wallet, Package, TrendingUp, PiggyBank, FileSpreadsheet, FileText, BookOpen, FolderTree, BarChart3, BookMarked, Inbox, ShoppingCart, ShoppingBag, PackagePlus, PackageMinus, ClipboardList, Calendar, Clock, CalendarOff, ChevronDown, ChevronLeft, TrendingDown, PieChart, Building2, FileCheck2, ShieldCheck, Lock, FileImage, CheckSquare, Scale, Ruler, User as UserIcon, GitBranch, Wrench, Truck, Calculator, Upload, ClipboardCheck, ArrowRightLeft, Database, FileWarning, Trash2 } from 'lucide-react';
import { useState, useEffect, Suspense, useMemo } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import DateDisplay from '@/components/DateDisplay';
import HelpButton from '@/modules/help/components/HelpButton';
import ThemeSelector from '@/components/ThemeSelector';
import NotificationBell from '@/modules/notifications/components/NotificationBell';

interface MenuItem {
  to: string;
  label: string;
  icon: any;
}

interface MenuSection {
  key: string;
  title: string;
  icon: any;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    key: 'dashboard',
    title: 'داشبورد',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard },
      { to: '/notifications', label: 'اعلان‌ها', icon: Bell },
      { to: '/approvals', label: 'کارتابل تأییدها', icon: Inbox },
    ],
  },
  {
    key: 'base-info',
    title: 'اطلاعات پایه',
    icon: FolderTree,
    items: [
      { to: '/directory', label: 'اشخاص و طرف‌های حساب', icon: UsersIcon },
      { to: '/accounting/accounts', label: 'کدینگ حساب‌ها', icon: FolderTree },
      { to: '/price-lists', label: 'فهرست بها (BOQ)', icon: BookMarked },
      { to: '/settings/fiscal-years', label: 'سال‌های مالی', icon: Calendar },
      { to: '/settings/period-lock', label: 'قفل دوره‌های مالی', icon: Lock },
      { to: '/data-io', label: 'ورود و خروج داده‌ها', icon: Upload },
      { to: '/accounting/cost-centers', label: 'مراکز هزینه', icon: Target },
      { to: '/accounting/mappings', label: 'نگاشت حساب‌ها', icon: Link2 },
      { to: '/accounting/banks', label: 'بانک‌ها و صندوق‌ها', icon: Landmark },
    ],
  },
  {
    key: 'contracts',
    title: 'قراردادها و پیمان‌ها',
    icon: FileText,
    items: [
      { to: '/contracts', label: 'همه قراردادها', icon: FileText },
      { to: '/contracts/templates', label: 'قالب‌های قرارداد', icon: FileImage },
      { to: '/projects', label: 'پروژه‌ها و WBS', icon: Briefcase },
      { to: '/timeline/guarantees', label: 'ضمانت‌نامه‌ها و تضامین', icon: Lock },
    ],
  },
  {
    key: 'site-ops',
    title: 'گزارش روزانه کارگاه',
    icon: ClipboardList,
    items: [
      { to: '/site-ops/daily-reports', label: 'گزارش‌های روزانه', icon: ClipboardList },
      { to: '/site-ops/failed-forwardings', label: 'صندوق خطای ارسال', icon: FileWarning },
    ],
  },
  {
    key: 'procurement',
    title: 'خرید و تدارکات',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/requests', label: 'درخواست خرید', icon: ShoppingCart },
      { to: '/procurement/orders', label: 'دستورات خرید', icon: ShoppingBag },
      { to: '/procurement/invoices', label: 'فاکتور خرید', icon: ReceiptText },
      { to: '/procurement/supplier-payments', label: 'پرداخت تأمین‌کننده', icon: HandCoins },
    ],
  },
  {
    key: 'warehouse',
    title: 'انبار و مصالح',
    icon: Package,
    items: [
      { to: '/warehouse/warehouses', label: 'انبارها', icon: Package },
      { to: '/warehouse/items', label: 'کالاها و مصالح', icon: Package },
      { to: '/warehouse/receipts', label: 'رسید انبار', icon: PackagePlus },
      { to: '/warehouse/issues', label: 'حواله مصرف', icon: PackageMinus },
      { to: '/warehouse/kardex', label: 'کاردکس', icon: BookMarked },
      { to: '/inventory-counts',     label: 'انبارگردانی',        icon: ClipboardCheck },
      { to: '/warehouse-transfers',  label: 'انتقال بین کارگاه‌ها', icon: ArrowRightLeft },
      { to: '/material-report/consumption', label: 'گزارش مصرف مصالح', icon: Package },
      { to: '/material-report/unit-cost',   label: 'بهای واحد WBS',     icon: BarChart3 },
    ],
  },
  {
    key: 'equipment',
    title: 'ماشین‌آلات و تجهیزات',
    icon: Truck,
    items: [

      { to: '/equipment',               label: 'شناسنامه ماشین‌آلات', icon: Truck },
      { to: '/equipment/logs',          label: 'کارکرد روزانه',        icon: Clock },
      { to: '/equipment/maintenances',  label: 'سوخت و تعمیرات',       icon: Wrench },
      { to: '/equipment/reports/usage', label: 'گزارش کارکرد',        icon: BarChart3 },

    ],
  },
  {
    key: 'payroll',
    title: 'حقوق و دستمزد',
    icon: UsersIcon,
    items: [
      { to: '/payroll/employees', label: 'پرسنل', icon: UsersIcon },
      { to: '/payroll/periods', label: 'دوره‌های حقوق', icon: Calendar },
      { to: '/payroll/worker-statements', label: 'صورت‌وضعیت پرسنل', icon: FileSpreadsheet },
      { to: '/payroll/attendance-grid', label: 'گرید ماهانه حاضری', icon: Calendar },
      { to: '/payroll/leave-requests', label: 'مرخصی‌ها', icon: CalendarOff },
      { to: '/payroll/advance-requests', label: 'مساعده', icon: Wallet },
    ],
  },
  {
    key: 'statements',
    title: 'صورت‌وضعیت‌ها',
    icon: FileText,
    items: [
      { to: '/payroll/subcontractor-statements', label: 'صورت‌وضعیت پیمانکاران', icon: FileText },
      { to: '/client-statements', label: 'صورت‌وضعیت کارفرما', icon: FileSpreadsheet },
    ],
  },
  {
    key: 'treasury',
    title: 'خزانه‌داری',
    icon: Wallet,
    items: [
      { to: '/accounting/cheques', label: 'چک‌ها', icon: FileCheck2 },
      { to: '/petty-cash', label: 'تنخواه و هزینه‌های جاری', icon: Wallet },
      { to: '/accounting/reports/cash-flow', label: 'جریان نقدی', icon: Wallet },
    ],
  },
  {
    key: 'accounting',
    title: 'حسابداری',
    icon: BookOpen,
    items: [
      { to: '/accounting/journals', label: 'اسناد حسابداری', icon: BookOpen },
      { to: '/accounting/journal-book', label: 'دفتر روزنامه', icon: FileText },
      { to: '/accounting/advanced-ledger', label: 'دفتر معین پیشرفته', icon: BookMarked },
      { to: '/adjustment-indices', label: 'شاخص‌های تعدیل', icon: TrendingUp },
      { to: '/adjustments', label: 'محاسبه تعدیل', icon: Calculator },
      { to: '/material-price-diffs', label: 'مابه‌التفاوت مصالح', icon: Package },
      { to: '/tax-reports', label: 'گزارش‌های مالیاتی', icon: Receipt },
      { to: '/operational-reports', label: 'گزارش‌های عملیاتی', icon: TrendingUp },
      { to: '/accounting/trial-balance', label: 'تراز آزمایشی', icon: BarChart3 },
      { to: '/accounting/reports/detailed-trial-balance', label: 'تراز تفصیلی', icon: BarChart3 },
      { to: '/accounting/reports/profit-loss', label: 'سود و زیان', icon: TrendingUp },
      { to: '/accounting/reports/balance-sheet', label: 'ترازنامه', icon: Scale },
      { to: '/accounting/reports/party-ledger', label: 'ریز حساب طرف', icon: UsersIcon },
      { to: '/accounting/reports/project-ledger', label: 'ریز حساب پروژه', icon: Briefcase },
      { to: '/accounting/reports/vat', label: 'ارزش افزوده', icon: Receipt },
      { to: '/overhead-allocations', label: 'تسهیم سربار ستاد', icon: Calculator },
    ],
  },
  {
    key: 'fixed-assets',
    title: 'دارایی‌های ثابت',
    icon: Building2,
    items: [
      { to: '/accounting/fixed-assets', label: 'دارایی‌های ثابت', icon: Building2 },
      { to: '/accounting/depreciation-run', label: 'اجرای استهلاک', icon: TrendingDown },
      { to: '/accounting/reports/fixed-assets', label: 'گزارش دارایی‌ها', icon: BarChart3 },
    ],
  },
  {
    key: 'project-control',
    title: 'کنترل پروژه و بودجه',
    icon: Crosshair,
    items: [
      { to: '/accounting/reports/budget-vs-actual', label: 'بودجه در مقابل واقعی', icon: Crosshair },
      { to: '/wip', label: 'کار در جریان ساخت (WIP)', icon: BarChart3 },
    ],
  },
  {
    key: 'reports',
    title: 'گزارشات جامع',
    icon: BarChart3,
    items: [
      { to: '/reports', label: 'مرکز گزارشات', icon: BarChart3 },
      { to: '/reports/project', label: 'گزارشات پروژه', icon: Building2 },
      { to: '/accounting/reports/ap-aging-detail', label: 'سنی بستانکاران (تفصیلی)', icon: TrendingDown },
      { to: '/accounting/reports/ar-aging-detail', label: 'سنی بدهکاران (تفصیلی)', icon: TrendingUp },
    ],
  },
  {
    key: 'partner-capital',
    title: 'سرمایه شرکا',
    icon: Wallet,
    items: [
      { to: '/partner-capital/accounts', label: 'حساب‌های سرمایه', icon: Wallet },
      { to: '/partner-capital/contributions', label: 'آورده‌ها', icon: TrendingUp },
      { to: '/partner-capital/withdrawals', label: 'برداشت‌ها', icon: TrendingDown },
      { to: '/partner-capital/shares', label: 'سهم‌الشرکه', icon: PieChart },
      { to: '/partner-capital/balance-sheet', label: 'تراز تسویه', icon: BarChart3 },
    ],
  },
  {
    key: 'sales',
    title: 'فروش و پیش‌فروش',
    icon: ShoppingBag,
    items: [
      { to: '/sales/units', label: 'واحدهای قابل فروش', icon: Building2 },
      { to: '/sales/customers', label: 'مشتریان فروش', icon: UsersIcon },
      { to: '/sales/contracts', label: 'قراردادهای فروش', icon: ShoppingBag },
      { to: '/sales/invoices', label: 'فاکتورهای فروش', icon: FileSpreadsheet },
      { to: '/sales/receipts', label: 'دریافت از مشتریان', icon: PiggyBank },
    ],
  },
  {
    key: 'timeline',
    title: 'گاه‌شمار و مجوزها',
    icon: FileCheck2,
    items: [
      { to: '/timeline/permits', label: 'مجوزها و پروانه‌ها', icon: FileCheck2 },
      { to: '/timeline/insurances', label: 'بیمه‌نامه‌ها', icon: ShieldCheck },
      { to: '/timeline/documents', label: 'اسناد فنی', icon: FileImage },
      { to: '/timeline/checklists', label: 'چک‌لیست‌های مهندسی', icon: CheckSquare },
    ],
  },
  {
    key: 'settings',
    title: 'ابزارها و تنظیمات',
    icon: Shield,
    items: [
      { to: '/settings/profile', label: 'پروفایل من', icon: UserIcon },
      { to: '/audit', label: 'لاگ تغییرات', icon: Shield },      { to: '/recycle-bin', label: 'سوابق حذف', icon: Trash2 },
      { to: '/backup', label: 'پشتیبانگیری', icon: Database },
      { to: '/settings/users', label: 'کاربران', icon: UsersIcon },
      { to: '/settings/roles', label: 'نقش‌ها و مجوزها', icon: Shield },
      { to: '/settings/units', label: 'واحدهای اندازه‌گیری', icon: Ruler },
      { to: '/help/workflows', label: 'راهنمای گردش کار', icon: GitBranch },
    ],
  },
];

/** تعیین بخش فعال بر اساس مسیر فعلی */
function findActiveSection(pathname: string): string {
  for (const section of MENU) {
    for (const item of section.items) {
      if (pathname === item.to || pathname.startsWith(item.to + '/')) {
        return section.key;
      }
    }
  }
  return '';
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const activeKey = findActiveSection(window.location.pathname);
    return activeKey ? { [activeKey]: true } : {};
  });
  const { user, logout } = useAuthStore();
  // F1.3 — فیلتر منو بر اساس permission کاربر
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const filteredMenu = useMemo(() => {
    return MENU
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const code = getMenuPermission(item.to);
          return !code || hasPermission(code);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [hasPermission]);

  const navigate = useNavigate();
  const location = useLocation();

  // باز شدن خودکار بخش فعال
  useEffect(() => {
    const activeKey = findActiveSection(location.pathname);
    // Only the active section stays open — others collapse
    setExpanded(activeKey ? { [activeKey]: true } : {});
    setSidebarMobileOpen(false);
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setExpanded((prev) => {
      const isCurrentlyOpen = !!prev[key];
      // Accordion: only one section can be open at a time
      return isCurrentlyOpen ? {} : { [key]: true };
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" dir="rtl">
      <>
        {/* Overlay موبایل */}
        {sidebarMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}

        <aside
          className={clsx(
            'bg-sidebar text-sidebar-text transition-transform duration-300 flex flex-col shrink-0 no-print z-50',
            // موبایل: fixed و کشویی
            'fixed lg:static inset-y-0 right-0',
            sidebarMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
            // عرض: در موبایل همیشه w-64
            'w-64',
            sidebarOpen ? 'lg:w-64' : 'lg:w-20',
          )}
        >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50 px-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="لوگو"
              className="w-9 h-9 object-contain shrink-0 bg-white rounded-lg p-0.5"
            />
            {sidebarOpen && (
              <div className="text-white">
                <div className="font-bold text-sm leading-tight">حسابداری اپسای</div>
                <div className="text-[10px] text-slate-400 leading-tight">Epsay Accounting</div>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {filteredMenu.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = !!expanded[section.key];
            const hasActiveItem = findActiveSection(location.pathname) === section.key;

            // وقتی سایدبار بسته است، فقط آیکون‌ها
            if (!sidebarOpen) {
              return (
                <div key={section.key} className="mb-1">
                  <div
                    className={clsx(
                      'flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                      hasActiveItem
                        ? 'bg-brand-600 text-white'
                        : 'hover:bg-sidebar-light hover:text-white',
                    )}
                    title={section.title}
                    onClick={() => {
                      // در حالت بسته، اولین آیتم بخش را باز کن
                      navigate(section.items[0].to);
                    }}
                  >
                    <SectionIcon className="w-5 h-5 shrink-0" />
                  </div>
                </div>
              );
            }

            return (
              <div key={section.key} className="mb-1">
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all',
                    hasActiveItem
                      ? 'bg-sidebar-light/60 text-white ring-1 ring-brand-500/30'
                      : isExpanded
                        ? 'bg-sidebar-light/30 text-white'
                        : 'text-sidebar-text hover:bg-sidebar-light hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                  )}
                </button>

                {/* Section Items */}
                {isExpanded && (
                  <div className="mt-1 me-2 ms-3 ps-3 border-s-2 border-brand-500/40 bg-slate-900/30 rounded-s-lg animate-fade-in">
                    {section.items.map((m) => {
                      const Icon = m.icon;
                      return (
                        <NavLink
                          key={m.to}
                          to={m.to}
                          end={m.to === '/accounting'}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all text-sm',
                              isActive
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-900/40 ring-1 ring-brand-400/50 font-semibold'
                                : 'text-slate-300 hover:bg-sidebar-light/70 hover:text-white',
                            )
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-medium">{m.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-700/50 p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>خروج</span>}
          </button>
        </div>
      </aside>
      </>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 no-print gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="منو"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="جستجو..."
                className="w-64 ps-10 pe-4 py-2 rounded-lg bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <DateDisplay />
          <div className="flex items-center gap-3">
            <ThemeSelector />

            <NotificationBell />
            <HelpButton />
            <div className="hidden md:flex items-center gap-2 ps-3 border-s border-slate-200">
              <div className="text-left">
                <div className="text-sm font-medium text-slate-700">{user?.fullName || 'کاربر'}</div>
                <div className="text-xs text-slate-500">
                  {user?.roles?.includes('super_admin') ? 'مدیر ارشد' : 'کاربر'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-12 text-center text-slate-400">در حال بارگذاری...</div>}>
            <Outlet />
          </Suspense>
          </ErrorBoundary>
        </main>

        <HelpButton variant="floating" />

      </div>
    </div>
  );
}
