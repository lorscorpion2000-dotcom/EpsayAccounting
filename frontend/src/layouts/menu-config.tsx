import {
  LayoutDashboard,
  Bell,
  CheckSquare,
  FileSpreadsheet,
  FolderKanban,
  Building2,
  FileSignature,
  ShieldCheck,
  ShoppingCart,
  Package,
  Layers,
  ArrowRightLeft,
  Truck,
  HardHat,
  AlertTriangle,
  Receipt,
  Users,
  BookOpen,
  Scale,
  Landmark,
  Wallet,
  Coins,
  DollarSign,
  CalendarCheck,
  FileText,
  PieChart,
  Settings,
  Shield,
  HelpCircle,
  DatabaseBackup,
  Trash2,
  ScrollText,
  Tags,
  SlidersHorizontal,
  FolderSync,
  Clock,
  BadgePercent,
  Warehouse,
  ClipboardList,
} from 'lucide-react';
import { getMenuPermission } from '../config/route-permissions';

export interface MenuItem {
  to: string;
  label: string;
  icon?: any;
}

export interface MenuSubSection {
  key: string;
  title: string;
  items: MenuItem[];
}

export interface MenuSection {
  key: string;
  title: string;
  icon?: any;
  items?: MenuItem[];
  subsections?: MenuSubSection[];
}

/**
 * مسیر ورودی (Landing Page) پیش‌فرض بر اساس نقش کاربری
 */
export const ROLE_HOME_ROUTES: Record<string, string> = {
  CEO: '/dashboard',
  CFO: '/dashboard',
  ACCOUNTANT: '/accounting/journals',
  SITE_MANAGER: '/site-ops/daily-reports',
  WAREHOUSE_KEEPER: '/warehouse/receipts',
  PROCUREMENT_OFFICER: '/procurement/orders',
  ADMIN: '/dashboard',
};

/**
 * کلید بخش‌های مجاز منو به تفکیک نقش کاربری
 */
export const ROLE_MENU_PRESETS: Record<string, string[]> = {
  CEO: ['dashboard', 'contracts', 'reports', 'financial', 'sales-and-revenue'],
  CFO: ['dashboard', 'contracts', 'procurement', 'warehouse', 'financial', 'treasury', 'sales-and-revenue', 'reports', 'settings'],
  ACCOUNTANT: ['dashboard', 'procurement', 'warehouse', 'financial', 'treasury', 'sales-and-revenue', 'reports'],
  SITE_MANAGER: ['dashboard', 'procurement', 'warehouse', 'site-ops'],
  WAREHOUSE_KEEPER: ['dashboard', 'warehouse'],
  PROCUREMENT_OFFICER: ['dashboard', 'procurement', 'treasury'],
  ADMIN: ['dashboard', 'contracts', 'procurement', 'warehouse', 'site-ops', 'financial', 'treasury', 'sales-and-revenue', 'reports', 'settings'],
};

export const MENU: MenuSection[] = [
  // ۱. داشبورد و کارتابل
  {
    key: 'dashboard',
    title: 'داشبورد و کارتابل',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard },
      { to: '/approvals', label: 'کارتابل تأییدات', icon: CheckSquare },
      { to: '/notifications', label: 'اعلان‌ها و یادآوری‌ها', icon: Bell },
    ],
  },

  // ۲. پروژه‌ها و قراردادها
  {
    key: 'contracts',
    title: 'پروژه‌ها و قراردادها',
    icon: FolderKanban,
    items: [
      { to: '/projects', label: 'پروژه‌های عمرانی و ساخت', icon: Building2 },
      { to: '/contracts', label: 'قراردادها و پیمان‌ها', icon: FileSignature },
      { to: '/contracts/templates', label: 'قالب‌های قرارداد', icon: FileSpreadsheet },
      { to: '/timeline/guarantees', label: 'ضمانت‌نامه‌های پروژه', icon: ShieldCheck },
    ],
  },

  // ۳. تدارکات و خرید
  {
    key: 'procurement',
    title: 'تدارکات و خرید',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/requests', label: 'درخواست‌های خرید کارگاه', icon: ClipboardList },
      { to: '/procurement/orders', label: 'سفارش‌های خرید (کارپرداز)', icon: ShoppingCart },
      { to: '/procurement/invoices', label: 'فاکتورهای خرید و تأمین', icon: Receipt },
      { to: '/procurement/supplier-payments', label: 'پرداخت به تأمین‌کنندگان', icon: DollarSign },
    ],
  },

  // ۴. انبار و مدیریت مصالح
  {
    key: 'warehouse',
    title: 'انبار و مدیریت مصالح',
    icon: Warehouse,
    items: [
      { to: '/warehouse/warehouses', label: 'انبار مرکزی و پروژه‌ها', icon: Warehouse },
      { to: '/warehouse/items', label: 'کاتالوگ کالا و مصالح', icon: Package },
      { to: '/warehouse/receipts', label: 'رسید ورود کالا (انبارداری)', icon: Layers },
      { to: '/warehouse/issues', label: 'حواله خروج و مصرف پروژه', icon: Layers },
      { to: '/warehouse-transfers', label: 'انتقال بین انبارها', icon: ArrowRightLeft },
      { to: '/inventory-counts', label: 'انبارگردانی و کسری/اضافی', icon: CheckSquare },
      { to: '/warehouse/kardex', label: 'کاردکس ریالی و تعدادی', icon: FileSpreadsheet },
      { to: '/material-report/consumption', label: 'مدیریت مصالح پای کار', icon: Package },
    ],
  },

  // ۵. کارگاه و عملیات اجرایی
  {
    key: 'site-ops',
    title: 'کارگاه و عملیات اجرایی',
    icon: HardHat,
    items: [
      { to: '/site-ops/daily-reports', label: 'گزارش روزانه سرپرست', icon: HardHat },
      { to: '/site-ops/failed-forwardings', label: 'صندوق ارسال گزارشات', icon: AlertTriangle },
      { to: '/equipment', label: 'ماشین‌آلات و تجهیزات کارگاه', icon: Truck },
    ],
  },

  // ۶. حسابداری مالی و پروژه‌ای
  {
    key: 'financial',
    title: 'حسابداری مالی و پروژه‌ای',
    icon: BookOpen,
    subsections: [
      {
        key: 'accounting-ops',
        title: 'عملیات اسناد و دفاتر',
        items: [
          { to: '/accounting/journals', label: 'اسناد حسابداری (سند دوبل)', icon: BookOpen },
          { to: '/accounting/journal-book', label: 'دفتر روزنامه رسمی', icon: FileText },
          { to: '/accounting/advanced-ledger', label: 'دفتر کل و معین پیشرفته', icon: FileSpreadsheet },
          { to: '/adjustments', label: 'اسناد تعدیل و اصلاحی', icon: SlidersHorizontal },
          { to: '/settings/period-lock', label: 'بستن حساب‌ها و قفل دوره', icon: ShieldCheck },
        ],
      },
      {
        key: 'financial-statements',
        title: 'صورت‌های مالی و ترازها',
        items: [
          { to: '/accounting/trial-balance', label: 'تراز آزمایشی (۴ و ۸ ستونی)', icon: Scale },
          { to: '/accounting/reports/detailed-trial-balance', label: 'تراز تفصیلی حساب‌ها', icon: Scale },
          { to: '/accounting/reports/balance-sheet', label: 'ترازنامه مالی', icon: FileSpreadsheet },
          { to: '/accounting/reports/profit-loss', label: 'صورت سود و زیان (پروژه/ستاد)', icon: PieChart },
          { to: '/accounting/reports/project-ledger', label: 'ریز تفصیلی به تفکیک پروژه', icon: Layers },
          { to: '/overhead-allocations', label: 'تسهیم هزینه‌های بالاسری', icon: BadgePercent },
          { to: '/accounting/reports/vat', label: 'مالیات بر ارزش افزوده (VAT)', icon: Receipt },
          { to: '/tax-reports', label: 'گزارشات فصلی و مالیاتی', icon: FileSpreadsheet },
        ],
      },
    ],
  },

  // ۷. خزانه‌داری و نقدینگی
  {
    key: 'treasury',
    title: 'خزانه‌داری و نقدینگی',
    icon: Landmark,
    items: [
      { to: '/accounting/banks', label: 'بانک‌ها و صندوق‌های شرکت', icon: Landmark },
      { to: '/accounting/cheques', label: 'مدیریت چک‌های دریافتی/پرداختی', icon: FileText },
      { to: '/petty-cash', label: 'تنخواه‌گردان‌های پروژه‌ها', icon: Wallet },
      { to: '/expenses', label: 'هزینه‌های جاری کارگاه و ستاد', icon: Coins },
      { to: '/accounting/reports/cash-flow', label: 'جریان وجوه نقد (Cash Flow)', icon: DollarSign },
      { to: '/partner-capital/accounts', label: 'سرمایه، سهم‌الشرکه و شرکا', icon: Users },
      { to: '/accounting/fixed-assets', label: 'اموال و دارایی‌های ثابت', icon: Package },
    ],
  },

  // ۸. فروش و صورت‌وضعیت‌ها
  {
    key: 'sales-and-revenue',
    title: 'فروش و صورت‌وضعیت',
    icon: Receipt,
    items: [
      { to: '/payroll/subcontractor-statements', label: 'صورت‌وضعیت پیمانکاران جزء', icon: FileSpreadsheet },
      { to: '/sales/units', label: 'واحدهای ساختمانی و فروش', icon: Building2 },
      { to: '/sales/customers', label: 'خریداران و کارفرمایان', icon: Users },
      { to: '/sales/contracts', label: 'قراردادهای پیش‌فروش و فروش', icon: FileSignature },
      { to: '/sales/invoices', label: 'فاکتورهای فروش و درآمد', icon: Receipt },
      { to: '/sales/receipts', label: 'رسید دریافت وجوه فروش', icon: DollarSign },
    ],
  },

  // ۹. گزارشات جامع مدیریتی
  {
    key: 'reports',
    title: 'گزارش‌های جامع',
    icon: PieChart,
    items: [
      { to: '/reports', label: 'مرکز جامع گزارشات', icon: PieChart },
      { to: '/reports/project', label: 'گزارش تحلیلی بهای تمام‌شده پروژه', icon: FolderKanban },
      { to: '/reports/contracting-revenue', label: 'گزارش درآمد و سود پیمانکاری', icon: DollarSign },
      { to: '/accounting/reports/ap-aging-detail', label: 'گزارش سنی بدهی‌ها (بستانکاران)', icon: FileSpreadsheet },
      { to: '/accounting/reports/ar-aging-detail', label: 'گزارش سنی مطالبات (بدهکاران)', icon: FileSpreadsheet },
      { to: '/wip', label: 'کنترل پروژه و بودجه‌بندی', icon: Scale },
    ],
  },

  // ۱۰. پایه‌ها و تنظیمات سیستم
  {
    key: 'settings',
    title: 'پایه‌ها و تنظیمات سیستم',
    icon: Settings,
    subsections: [
      {
        key: 'base-definitions',
        title: 'اطلاعات و تعاریف پایه',
        items: [
          { to: '/settings/fiscal-years', label: 'سال‌های مالی', icon: CalendarCheck },
          { to: '/accounting/accounts', label: 'کدینگ حساب‌ها (کل، معین، تفصیلی)', icon: BookOpen },
          { to: '/accounting/cost-centers', label: 'مراکز هزینه و پروژه‌ها', icon: FolderKanban },
          { to: '/accounting/mappings', label: 'نگاشت خودکار اسناد حسابداری', icon: SlidersHorizontal },
          { to: '/directory', label: 'دفترچه مخاطبان و اشخاص', icon: Users },
          { to: '/price-lists', label: 'فهرست‌بهای رسمی و قیمت‌ها', icon: Tags },
          { to: '/settings/units', label: 'واحدهای سنجش و اندازه‌گیری', icon: SlidersHorizontal },
          { to: '/settings/expense-categories', label: 'سرفصل‌های هزینه‌های کارگاه', icon: Tags },
          { to: '/timeline/permits', label: 'مجوزها، بیمه و اسناد پروژه', icon: Clock },
        ],
      },
      {
        key: 'system-management',
        title: 'امنیت و نگهداری',
        items: [
          { to: '/settings/users', label: 'کاربران سیستم', icon: Users },
          { to: '/settings/roles', label: 'نقش‌ها و ماتریس مجوزها', icon: Shield },
          { to: '/audit', label: 'ردپای عملیات و لاگ‌های امنیتی', icon: ScrollText },
          { to: '/backup', label: 'پشتیبان‌گیری از دیتابیس', icon: DatabaseBackup },
          { to: '/data-io', label: 'ورود و خروج گروهی داده‌ها (Excel)', icon: FolderSync },
          { to: '/recycle-bin', label: 'سطل بازیافت موارد حذف‌شده', icon: Trash2 },
          { to: '/settings/company', label: 'مشخصات شرکت و مهر و لوگو', icon: Building2 },
          { to: '/settings/profile', label: 'پروفایل کاربر جاری', icon: Users },
          { to: '/help/workflows', label: 'راهنمای گردش‌کارهای سیستم', icon: HelpCircle },
        ],
      },
    ],
  },
];

export function findActiveSection(pathname: string): string {
  if (!pathname) return '';

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return 'contracts';
  }

  if (
    pathname === '/payroll' ||
    pathname.startsWith('/payroll/') ||
    pathname === '/accounting' ||
    pathname.startsWith('/accounting/')
  ) {
    return 'financial';
  }

  if (pathname === '/reports/project' || pathname.startsWith('/reports/project/')) {
    return 'dashboard';
  }

  for (const section of MENU) {
    if (section.items) {
      for (const item of section.items) {
        if (pathname === item.to || pathname.startsWith(item.to + '/')) {
          return section.key;
        }
      }
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        if (sub.items) {
          for (const item of sub.items) {
            if (pathname === item.to || pathname.startsWith(item.to + '/')) {
              return section.key;
            }
          }
        }
      }
    }
  }

  return '';
}

export function buildFilteredMenu(
  hasPermission: (code: string) => boolean,
  role?: string
): MenuSection[] {
  const allowedSections = role && ROLE_MENU_PRESETS[role] ? ROLE_MENU_PRESETS[role] : null;

  const result: MenuSection[] = [];

  for (const section of MENU) {
    if (allowedSections && !allowedSections.includes(section.key)) {
      continue;
    }

    let filteredItems: MenuItem[] | undefined = undefined;
    let filteredSubsections: MenuSubSection[] | undefined = undefined;

    if (section.items) {
      filteredItems = section.items
        .filter((item) => {
          const code = getMenuPermission(item.to);
          if (!code) return true;
          return hasPermission(code);
        })
        .map((item) => {
          if (item.to === '/approvals' && !hasPermission('approvals.update')) {
            return { ...item, label: 'کارتابل من' };
          }
          return item;
        });
    }

    if (section.subsections) {
      filteredSubsections = section.subsections
        .map((sub) => ({
          ...sub,
          items: sub.items.filter((item) => {
            const code = getMenuPermission(item.to);
            if (!code) return true;
            return hasPermission(code);
          }),
        }))
        .filter((sub) => sub.items.length > 0);
    }

    if ((filteredItems && filteredItems.length > 0) || (filteredSubsections && filteredSubsections.length > 0)) {
      result.push({
        ...section,
        items: filteredItems,
        subsections: filteredSubsections,
      });
    }
  }

  return result;
}
