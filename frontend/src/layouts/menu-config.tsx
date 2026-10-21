export function findActiveSection(pathname: string): string {
  if (!pathname) return '';

  // ۱. جستجوی پویا در تمام بخش‌ها، زیربخش‌ها و آیتم‌های منوی فعلی
  for (const section of MENU) {
    // بررسی آیتم‌های مستقیم بخش
    if (section.items) {
      for (const item of section.items) {
        if (
          pathname === item.to ||
          (item.to !== '/' && pathname.startsWith(item.to + '/'))
        ) {
          return section.key;
        }
      }
    }

    // بررسی آیتم‌های زیربخش‌ها (Subsections)
    if (section.subsections) {
      for (const sub of section.subsections) {
        if (sub.items) {
          for (const item of sub.items) {
            if (
              pathname === item.to ||
              (item.to !== '/' && pathname.startsWith(item.to + '/'))
            ) {
              return section.key;
            }
          }
        }
      }
    }
  }

  // ۲. نگاشت پیش‌فرض برای صفحات جزئیات و مسیرهایی که دقیقاً همنام هدر نیستند
  if (pathname.startsWith('/projects') || pathname.startsWith('/contracts') || pathname.startsWith('/timeline')) {
    return 'projects-hub';
  }
  if (pathname.startsWith('/procurement')) {
    return 'procurement';
  }
  if (pathname.startsWith('/warehouse') || pathname.startsWith('/inventory') || pathname.startsWith('/material')) {
    return 'warehouse';
  }
  if (pathname.startsWith('/site-ops') || pathname.startsWith('/equipment')) {
    return 'site-ops';
  }
  if (pathname.startsWith('/accounting') || pathname.startsWith('/adjustments') || pathname.startsWith('/tax')) {
    return 'accounting';
  }
  if (pathname.startsWith('/petty-cash') || pathname.startsWith('/expenses') || pathname.startsWith('/partner-capital')) {
    return 'treasury';
  }
  if (pathname.startsWith('/payroll') && !pathname.startsWith('/payroll/subcontractor-statements')) {
    return 'payroll';
  }
  if (pathname.startsWith('/sales') || pathname.startsWith('/payroll/subcontractor-statements')) {
    return 'sales-and-revenue';
  }
  if (pathname.startsWith('/reports') || pathname.startsWith('/wip')) {
    return 'reports';
  }
  if (
    pathname.startsWith('/settings') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/price-lists') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/backup') ||
    pathname.startsWith('/data-io') ||
    pathname.startsWith('/recycle-bin')
  ) {
    return 'settings';
  }

  return '';
}