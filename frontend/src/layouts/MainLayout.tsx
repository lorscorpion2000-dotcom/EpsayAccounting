import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation } from 'react-router-dom';
import { LogOut, Search, Menu, ChevronDown, ChevronLeft } from 'lucide-react';
import { useState, useEffect, Suspense, useMemo } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import ErrorBoundary from '@/components/ErrorBoundary';
import DateDisplay from '@/components/DateDisplay';
import HelpButton from '@/modules/help/components/HelpButton';
import ThemeSelector from '@/components/ThemeSelector';
import NotificationBell from '@/modules/notifications/components/NotificationBell';
import { findActiveSection, buildFilteredMenu } from './menu-config';



/** تعیین بخش فعال بر اساس مسیر فعلی */

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
  const filteredMenu = useMemo(
    () => buildFilteredMenu(hasPermission),
    [hasPermission],
  );

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
