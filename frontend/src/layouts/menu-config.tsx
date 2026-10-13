import { getMenuPermission } from '@/config/route-permissions';
import { Landmark, Link2, Target, LayoutDashboard, Users as UsersIcon, Shield, Bell, Briefcase, Crosshair, HandCoins, ReceiptText, Receipt, Wallet, Package, TrendingUp, PiggyBank, FileSpreadsheet, FileText, BookOpen, FolderTree, BarChart3, BookMarked, Inbox, ShoppingCart, ShoppingBag, PackagePlus, PackageMinus, ClipboardList, Calendar, Clock, CalendarOff, TrendingDown, PieChart, Building2, FileCheck2, ShieldCheck, Lock, FileImage, CheckSquare, Scale, Ruler, User as UserIcon, GitBranch, Wrench, Truck, Calculator, Upload, ClipboardCheck, ArrowRightLeft, Database, FileWarning, Trash2 } from 'lucide-react';

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
      { to: '/expenses',                    label: 'هزینه‌ها',                icon: ReceiptText },
      { to: '/settings/expense-categories', label: 'دسته‌بندی هزینه‌ها',       icon: FolderTree },
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

/**
 * فیلتر منو بر اساس permission کاربر
 * - admin/super_admin همه آیتم‌ها را می‌بیند
 * - کاربران عادی فقط آیتم‌های مجاز
 * - لیبل /approvals برای غیر-approver → 'کارتابل من'
 */
export function buildFilteredMenu(
  hasPermission: (code: string) => boolean,
): MenuSection[] {
  const canApproveAll = hasPermission('approvals.update');
  return MENU
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => {
          const code = getMenuPermission(item.to);
          return !code || hasPermission(code);
        })
        .map((item) =>
          item.to === '/approvals' && !canApproveAll
            ? { ...item, label: 'کارتابل من' }
            : item,
        ),
    }))
    .filter((section) => section.items.length > 0);
}

export { MENU, findActiveSection };
export type { MenuItem, MenuSection };
