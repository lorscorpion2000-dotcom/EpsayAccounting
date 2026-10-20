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
  ClipboardList
} from 'lucide-react';
import { getMenuPermission } from '../config/route-permissions';

export interface MenuItem {
  to: string;
  label: string;
  icon: any;
}

export interface MenuSubSection {
  key: string;
  title: string;
  items: MenuItem[];
}

export interface MenuSection {
  key: string;
  title: string;
  icon: any;
  items?: MenuItem[];
  subsections?: MenuSubSection[];
}

export const MENU: MenuSection[] = [
  // 1. داشبورد و کارتابل
  {
    key: 'dashboard',
    title: 'داشبورد و کارتابل',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'داشبورد ارشد', icon: LayoutDashboard },
      { to: '/approvals', label: 'کارتابل تأییدات', icon: CheckSquare },
      { to: '/notifications', label: 'اعلان‌ها و یادآوری‌ها', icon: Bell },
    ]
  },

  // 2. پروژه‌ها و پیمان‌ها
  {
    key: 'projects-hub',
    title: 'پروژه‌ها و پیمان‌ها',
    icon: FolderKanban,
    items: [
      { to: '/projects', label: 'پروژه‌های عمرانی و ساخت', icon: Building2 },
      { to: '/contracts', label: 'قراردادها و پیمان‌ها', icon: FileSignature },
      { to: '/contracts/templates', label: 'قالب‌های قرارداد', icon: FileSpreadsheet },
      { to: '/timeline/guarantees', label: 'ضمانت‌نامه‌های پروژه', icon: ShieldCheck },
    ]
  },

  // 3. تدارکات و خرید
  {
    key: 'procurement',
    title: 'تدارکات و خرید',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/requests', label: 'درخواست‌های خرید کارگاه', icon: ClipboardList },
      { to: '/procurement/orders', label: 'سفارش‌های خرید (کارپرداز)', icon: ShoppingCart },
      { to: '/procurement/invoices', label: 'فاکتورهای خرید و تأمین', icon: Receipt },
      { to: '/procurement/supplier-payments', label: 'پرداخت به تأمین‌کنندگان', icon: DollarSign },
    ]
  },

  // 4. انبار و مدیریت مصالح
  {
    key: 'warehouse',
    title: 'انبار و مدیریت مصالح',
    icon: Warehouse,
    items: [
      { to: '/warehouse/warehouses', label: 'انبار مرکزی و پروژه‌ها', icon: Warehouse },
      { to: '/warehouse/items', label: 'کاتالوگ کالا و مصالح', icon: Package },
      { to: '/warehouse/receipts', label: 'رسید ورود کالا (GRN)', icon: Layers },
      { to: '/warehouse/issues', label: 'حواله خروج و مصرف (GIN)', icon: Layers },
      { to: '/warehouse-transfers', label: 'انتقال بین انبارها', icon: ArrowRightLeft },
      { to: '/inventory-counts', label: 'انبارگردانی و کسری/اضافی', icon: CheckSquare },
      { to: '/warehouse/kardex', label: 'کاردکس ریالی و تعدادی', icon: FileSpreadsheet },
      { to: '/material-report/consumption', label: 'مدیریت مصالح پای کار', icon: Package },
    ]
  },

  // 5. کارگاه و عملیات اجرایی
  {
    key: 'site-ops',
    title: 'کارگاه و عملیات اجرایی',
    icon: HardHat,
    items: [
      { to: '/site-ops/daily-reports', label: 'گزارش روزانه سرپرست', icon: HardHat },
      { to: '/site-ops/failed-forwardings', label: 'صندوق ارسال گزارشات', icon: AlertTriangle },
      { to: '/equipment', label: 'ماشین‌آلات و تجهیزات کارگاه', icon: Truck },
    ]
  },

  // 6. حسابداری مالی و پروژه‌ای
  {
    key: 'accounting',
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
        ]
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
        ]
      },
    ]
  },

  // 7. خزانه‌داری و نقدینگی
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
    ]
  },

  // 8. حقوق، دستمزد و پیمانکاران
  {
    key: 'payroll',
    title: 'حقوق، دستمزد و پیمانکاران',
    icon: Users,
    items: [
      { to: '/payroll/employees', label: 'پرونده و مشخصات پرسنل', icon: Users },
      { to: '/payroll/attendance', label: 'کارکرد و حضور و غیاب', icon: Clock },
      { to: '/payroll/periods', label: 'محاسبه و فیش حقوقی', icon: CalendarCheck },
      { to: '/payroll/advance-requests', label: 'درخواست‌های مساعده', icon: DollarSign },
      { to: '/payroll/worker-statements', label: 'صورت‌وضعیت پرسنل و کارگران', icon: FileText },
      { to: '/payroll/subcontractor-statements', label: 'صورت‌وضعیت پیمانکاران جزء', icon: FileSpreadsheet },
    ]
  },

  // 9. فروش و درآمد
  {
    key: 'sales-and-revenue',
    title: 'فروش و درآمد',
    icon: Receipt,
    items: [
      { to: '/sales/units', label: 'واحدهای ساختمانی و فروش', icon: Building2 },
      { to: '/sales/customers', label: 'خریداران و کارفرمایان', icon: Users },
      { to: '/sales/contracts', label: 'قراردادهای پیش‌فروش و فروش', icon: FileSignature },
      { to: '/sales/invoices', label: 'فاکتورهای فروش و درآمد', icon: Receipt },
      { to: '/sales/receipts', label: 'رسید دریافت وجوه فروش', icon: DollarSign },
      { to: '/client-statements', label: 'صورت‌وضعیت کارفرما (استاندارد ۹)', icon: FileSpreadsheet },
    ]
  },

  // 10. گزارش‌های جامع مدیریتی
  {
    key: 'reports',
    title: 'گزارش‌های جامع مدیریتی',
    icon: PieChart,
    items: [
      { to: '/reports', label: 'مرکز جامع گزارشات', icon: PieChart },
      { to: '/reports/project', label: 'گزارش تحلیلی بهای تمام‌شده', icon: FolderKanban },
      { to: '/wip', label: 'کنترل پروژه و بودجه‌بندی (WIP)', icon: Scale },
      { to: '/accounting/reports/ar-aging-detail', label: 'گزارش سنی مطالبات بدهکاران', icon: FileSpreadsheet },
      { to: '/accounting/reports/ap-aging-detail', label: 'گزارش سنی بدهی بستانکاران', icon: FileSpreadsheet },
    ]
  },

  // 11. پایه‌ها و تنظیمات سیستم
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
          { to: '/accounting/mappings', label: 'نگاشت خودکار اسناد', icon: SlidersHorizontal },
          { to: '/directory', label: 'دفترچه مخاطبان و اشخاص', icon: Users },
        ]
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
          { to: '/help/workflows', label: 'راهنمای گردش‌کارهای سیستم', icon: HelpCircle },
        ]
      },
    ]
  },
];

export function findActiveSection(pathname: string): string {
  if (!pathname) return '';

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return 'projects-hub';
  }

  if (
    pathname === '/payroll' ||
    pathname.startsWith('/payroll/') ||
    pathname === '/accounting' ||
    pathname.startsWith('/accounting/')
  ) {
    return 'accounting';
  }

  for (const section of MENU) {
    if (section.items) {
      for (const item of section.items) {
        if (pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to + '/'))) {
          return section.key;
        }
      }
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        if (sub.items) {
          for (const item of sub.items) {
            if (pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to + '/'))) {
              return section.key;
            }
          }
        }
      }
    }
  }

  return 'dashboard';
}

export function buildFilteredMenu(hasPermission: (code: string) => boolean): MenuSection[] {
  const result: MenuSection[] = [];

  for (const section of MENU) {
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
          })
        }))
        .filter((sub) => sub.items.length > 0);
    }

    const hasItems = filteredItems && filteredItems.length > 0;
    const hasSubs = filteredSubsections && filteredSubsections.length > 0;

    if (hasItems || hasSubs) {
      result.push({
        ...section,
        items: hasItems ? filteredItems : undefined,
        subsections: hasSubs ? filteredSubsections : undefined
      });
    }
  }

  return result;
}