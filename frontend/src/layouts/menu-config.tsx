import { getMenuPermission } from '@/config/route-permissions';
import {
  Landmark, Link2, Target, LayoutDashboard, Users as UsersIcon, Shield, Bell,
  Briefcase, Crosshair, HandCoins, ReceiptText, Receipt, Wallet, Package,
  TrendingUp, PiggyBank, FileSpreadsheet, FileText, BookOpen, FolderTree,
  BarChart3, BookMarked, Inbox, ShoppingCart, ShoppingBag, PackagePlus,
  PackageMinus, ClipboardList, Calendar, Clock, CalendarOff, TrendingDown,
  PieChart, Building2, FileCheck2, ShieldCheck, Lock, FileImage, CheckSquare,
  Scale, Ruler, User as UserIcon, GitBranch, Wrench, Truck, Calculator,
  Upload, ClipboardCheck, ArrowRightLeft, Database, FileWarning, Trash2,
} from 'lucide-react';

interface MenuItem {
  to: string;
  label: string;
  icon: any;
}

interface MenuSubSection {
  key: string;
  title: string;
  items: MenuItem[];
}

interface MenuSection {
  key: string;
  title: string;
  icon: any;
  items?: MenuItem[];
  subsections?: MenuSubSection[];
}

const MENU: MenuSection[] = [
  {
    key: 'dashboard',
    title: 'داشبورد و گزارشات',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard },
      { to: '/notifications', label: 'اعلان‌ها', icon: Bell },
      { to: '/approvals', label: 'کارتابل تأییدها', icon: Inbox },
    ],
    subsections: [
      {
        key: 'reports-hub',
        title: 'گزارشات جامع',
        items: [
          { to: '/reports', label: 'مرکز گزارشات', icon: BarChart3 },
          { to: '/reports/project', label: 'گزارشات پروژه', icon: Building2 },
          { to: '/accounting/reports/ap-aging-detail', label: 'بستانکاران سنواتی', icon: TrendingDown },
          { to: '/accounting/reports/ar-aging-detail', label: 'بدهکاران سنواتی', icon: TrendingUp },
        ],
      },
      {
        key: 'revenue',
        title: 'درآمد',
        items: [
          { to: '/reports/contracting-revenue', label: 'درآمد پیمانکاری', icon: BarChart3 },
        ],
      },
    ],
  },

  {
    key: 'base-info',
    title: 'اطلاعات اولیه',
    icon: FolderTree,
    items: [
      { to: '/settings/fiscal-years', label: 'سال‌های مالی', icon: Calendar },
      { to: '/directory', label: 'اشخاص و طرف حسابها', icon: UsersIcon },
      { to: '/accounting/banks', label: 'بانک‌ها و صندوق‌ها', icon: Landmark },
      { to: '/accounting/cost-centers', label: 'مراکز هزینه', icon: Target },
      { to: '/price-lists', label: 'فهرست بها', icon: BookMarked },
      { to: '/settings/units', label: 'واحدهای اندازه‌گیری', icon: Ruler },
      { to: '/accounting/accounts', label: 'کدینگ حسابها', icon: FolderTree },
      { to: '/accounting/mappings', label: 'نگاشت حسابها', icon: Link2 },
      { to: '/data-io', label: 'ورود و خروج داده‌ها', icon: Upload },
    ],
    subsections: [
      {
        key: 'timeline',
        title: 'گاه‌شمار و مجوزها',
        items: [
          { to: '/timeline/permits', label: 'مجوزها و پروانه‌ها', icon: FileCheck2 },
          { to: '/timeline/insurances', label: 'بیمه‌نامه‌ها', icon: ShieldCheck },
          { to: '/timeline/documents', label: 'اسناد فنی', icon: FileImage },
          { to: '/timeline/checklists', label: 'چک‌لیست‌های مهندسی', icon: CheckSquare },
        ],
      },
    ],
  },

  {
    key: 'financial',
    title: 'مالی و منابع انسانی',
    icon: BookOpen,
    subsections: [
      {
        key: 'accounting',
        title: 'حسابداری',
        items: [
          { to: '/accounting/journals', label: 'اسناد حسابداری', icon: BookOpen },
          { to: '/accounting/journal-book', label: 'دفتر روزنامه', icon: FileText },
          { to: '/accounting/advanced-ledger', label: 'دفتر معین', icon: BookMarked },
          { to: '/adjustment-indices', label: 'شاخص‌های تعدیل', icon: TrendingUp },
          { to: '/adjustments', label: 'محاسبه تعدیل', icon: Calculator },
          { to: '/material-price-diffs', label: 'مابه‌التفاوت مصالح', icon: Package },
          { to: '/accounting/reports/balance-sheet', label: 'ترازنامه', icon: Scale },
          { to: '/accounting/reports/detailed-trial-balance', label: 'تراز تفضیلی', icon: BarChart3 },
          { to: '/accounting/reports/profit-loss', label: 'سود و زیان', icon: TrendingUp },
          { to: '/accounting/reports/party-ledger', label: 'ریز حساب طرف حسابها', icon: UsersIcon },
          { to: '/accounting/reports/project-ledger', label: 'ریز حساب پروژه', icon: Briefcase },
          { to: '/accounting/reports/vat', label: 'ارزش افزوده', icon: Receipt },
          { to: '/overhead-allocations', label: 'تسهیم سربار ستاد', icon: Calculator },
          { to: '/settings/period-lock', label: 'قفل دوره مالی', icon: Lock },
          { to: '/tax-reports', label: 'گزارش‌های مالیاتی', icon: Receipt },
          { to: '/operational-reports', label: 'گزارش‌های عملیاتی', icon: TrendingUp },
        ],
      },
      {
        key: 'payroll',
        title: 'حقوق و دستمزد',
        items: [
          { to: '/payroll/employees', label: 'پرسنل', icon: UsersIcon },
          { to: '/payroll/periods', label: 'دوره‌های حقوق', icon: Calendar },
          { to: '/payroll/attendance-grid', label: 'گرید ماهانه حاضری', icon: Calendar },
          { to: '/payroll/leave-requests', label: 'مرخصی‌ها', icon: CalendarOff },
          { to: '/payroll/advance-requests', label: 'مساعده', icon: Wallet },
        ],
      },
      {
        key: 'treasury',
        title: 'خزانه‌داری',
        items: [
          { to: '/accounting/cheques', label: 'چک‌ها', icon: FileCheck2 },
          { to: '/petty-cash', label: 'تنخواه و هزینه‌های جاری', icon: Wallet },
          { to: '/expenses', label: 'هزینه‌ها', icon: ReceiptText },
          { to: '/settings/expense-categories', label: 'دسته‌بندی هزینه‌ها', icon: FolderTree },
          { to: '/accounting/reports/cash-flow', label: 'جریان نقدی', icon: Wallet },
        ],
      },
      {
        key: 'fixed-assets',
        title: 'دارایی‌های ثابت',
        items: [
          { to: '/accounting/fixed-assets', label: 'دارایی‌های ثابت', icon: Building2 },
          { to: '/accounting/depreciation-run', label: 'اجرای استهلاک', icon: TrendingDown },
          { to: '/accounting/reports/fixed-assets', label: 'گزارش دارایی‌ها', icon: BarChart3 },
        ],
      },
      {
        key: 'project-control',
        title: 'کنترل پروژه و بودجه',
        items: [
          { to: '/accounting/reports/budget-vs-actual', label: 'تحقق بودجه', icon: Crosshair },
          { to: '/wip', label: 'کار در جریان ساخت', icon: BarChart3 },
        ],
      },
      {
        key: 'partner-capital',
        title: 'سرمایه شرکا',
        items: [
          { to: '/partner-capital/accounts', label: 'حساب‌های سرمایه', icon: Wallet },
          { to: '/partner-capital/contributions', label: 'آورده‌ها', icon: TrendingUp },
          { to: '/partner-capital/withdrawals', label: 'برداشت‌ها', icon: TrendingDown },
          { to: '/partner-capital/shares', label: 'سهم‌الشرکه', icon: PieChart },
          { to: '/partner-capital/balance-sheet', label: 'تراز تسویه', icon: BarChart3 },
        ],
      },
      {
        key: 'statements',
        title: 'صورت‌وضعیت‌ها',
        items: [
          { to: '/payroll/subcontractor-statements', label: 'صورت‌وضعیت پیمانکاران', icon: FileText },
          { to: '/client-statements', label: 'صورت‌وضعیت کارفرما', icon: FileSpreadsheet },
        ],
      },
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
    key: 'procurement-warehouse',
    title: 'خرید و انبار',
    icon: ShoppingCart,
    subsections: [
      {
        key: 'procurement',
        title: 'خرید و تدارکات',
        items: [
          { to: '/procurement/requests', label: 'درخواست خرید', icon: ShoppingCart },
          { to: '/procurement/orders', label: 'دستور خرید', icon: ShoppingBag },
          { to: '/procurement/invoices', label: 'فاکتور خرید', icon: ReceiptText },
          { to: '/procurement/supplier-payments', label: 'پرداخت تامین‌کننده', icon: HandCoins },
        ],
      },
      {
        key: 'warehouse',
        title: 'انبار و مصالح',
        items: [
          { to: '/warehouse/warehouses', label: 'انبارها', icon: Package },
          { to: '/warehouse/items', label: 'کالاها و مصالح', icon: Package },
          { to: '/warehouse/receipts', label: 'رسید انبار', icon: PackagePlus },
          { to: '/warehouse/issues', label: 'حواله مصرف', icon: PackageMinus },
          { to: '/warehouse/kardex', label: 'کاردکس', icon: BookMarked },
          { to: '/inventory-counts', label: 'انبارگردانی', icon: ClipboardCheck },
          { to: '/warehouse-transfers', label: 'انتقال بین کارگاه‌ها', icon: ArrowRightLeft },
          { to: '/material-report/consumption', label: 'گزارش مصرف مصالح', icon: Package },
          { to: '/material-report/unit-cost', label: 'بهای واحد WBS', icon: BarChart3 },
        ],
      },
    ],
  },

  {
    key: 'site-ops',
    title: 'کارگاه',
    icon: ClipboardList,
    subsections: [
      {
        key: 'daily-reports',
        title: 'گزارش روزانه کارگاه',
        items: [
          { to: '/site-ops/daily-reports', label: 'گزارش‌های روزانه', icon: ClipboardList },
          { to: '/site-ops/failed-forwardings', label: 'صندوق خطای ارسال', icon: FileWarning },
        ],
      },
      {
        key: 'equipment',
        title: 'ماشین آلات و تجهیزات',
        items: [
          { to: '/equipment', label: 'شناسه ماشین آلات', icon: Truck },
          { to: '/equipment/logs', label: 'کارکرد روزانه', icon: Clock },
          { to: '/equipment/maintenances', label: 'سوخت و تعمیرات', icon: Wrench },
          { to: '/equipment/reports/usage', label: 'گزارش کارکرد', icon: BarChart3 },
        ],
      },
    ],
  },

  {
    key: 'revenue',
    title: 'درآمدها',
    icon: TrendingUp,
    subsections: [
      {
        key: 'sales',
        title: 'فروش و پیش فروش',
        items: [
          { to: '/sales/units', label: 'واحدهای قابل فروش', icon: Building2 },
          { to: '/sales/customers', label: 'مشتریان فروش', icon: UsersIcon },
          { to: '/sales/contracts', label: 'قراردادهای فروش', icon: ShoppingBag },
          { to: '/sales/invoices', label: 'فاکتورهای فروش', icon: FileSpreadsheet },
          { to: '/sales/receipts', label: 'دریافت از مشتریان', icon: PiggyBank },
        ],
      },
    ],
  },

  {
    key: 'settings',
    title: 'ابزارها و تنظیمات',
    icon: Shield,
    items: [
      { to: '/settings/profile', label: 'پروفایل من', icon: UserIcon },
      { to: '/settings/company', label: 'تنظیمات شرکت', icon: Building2 },
      { to: '/audit', label: 'لاگ تغییرات', icon: Shield },
      { to: '/recycle-bin', label: 'سوابق حذف', icon: Trash2 },
      { to: '/settings/users', label: 'کاربران', icon: UsersIcon },
      { to: '/settings/roles', label: 'نقش‌ها و مجوزها', icon: Shield },
      { to: '/help/workflows', label: 'راهنمای گردش کار', icon: GitBranch },
      { to: '/backup', label: 'پشتیبان‌گیری', icon: Database },
    ],
  },
];

function findActiveSection(pathname: string): string {
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
        for (const item of sub.items) {
          if (pathname === item.to || pathname.startsWith(item.to + '/')) {
            return section.key;
          }
        }
      }
    }
  }
  return '';
}

export function buildFilteredMenu(
  hasPermission: (code: string) => boolean,
): MenuSection[] {
  const canApproveAll = hasPermission('approvals.update');

  const filterItems = (items: MenuItem[]) =>
    items
      .filter((item) => {
        const code = getMenuPermission(item.to);
        return !code || hasPermission(code);
      })
      .map((item) =>
        item.to === '/approvals' && !canApproveAll
          ? { ...item, label: 'کارتابل من' }
          : item,
      );

  return MENU
    .map((section) => {
      const filteredItems = section.items ? filterItems(section.items) : undefined;
      const filteredSubs = section.subsections
        ? section.subsections
            .map((sub) => ({ ...sub, items: filterItems(sub.items) }))
            .filter((sub) => sub.items.length > 0)
        : undefined;

      return {
        ...section,
        items: filteredItems,
        subsections: filteredSubs,
      };
    })
    .filter((section) => {
      const hasItems = section.items && section.items.length > 0;
      const hasSubs = section.subsections && section.subsections.length > 0;
      return hasItems || hasSubs;
    });
}

export { MENU, findActiveSection };
export type { MenuItem, MenuSubSection, MenuSection };
