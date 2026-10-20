import {
  LayoutDashboard, FolderKanban, ShoppingCart, Package, Building2,
  BookOpen, Landmark, Users, Receipt, BarChart3, Settings
} from 'lucide-react';

export interface MenuItem {
  title: string;
  href: string;
  icon?: any;
  children?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
  {
    title: 'داشبورد و کارتابل',
    href: '/',
    icon: LayoutDashboard,
    children: [
      { title: 'داشبورد مدیریتی', href: '/' },
      { title: 'کارتابل مدیریت و تاییدات', href: '/approvals' },
    ],
  },
  {
    title: 'پروژه‌ها و پیمان‌ها',
    href: '/projects',
    icon: FolderKanban,
    children: [
      { title: 'پروژه‌های عمرانی و ساخت', href: '/projects' },
      { title: 'قراردادها و پیمان‌ها', href: '/contracts' },
      { title: 'قالب‌های قرارداد', href: '/contracts/templates' },
      { title: 'ضمانت‌نامه‌ها و تضامین', href: '/timeline/guarantees' },
    ],
  },
  {
    title: 'تدارکات و خرید',
    href: '/procurement',
    icon: ShoppingCart,
    children: [
      { title: 'درخواست‌های خرید کارگاه', href: '/procurement/requests' },
      { title: 'سفارش‌های خرید', href: '/procurement/orders' },
      { title: 'فاکتورهای خرید', href: '/procurement/invoices' },
      { title: 'پرداخت به تامین‌کنندگان', href: '/procurement/supplier-payments' },
    ],
  },
  {
    title: 'انبار و مدیریت مصالح',
    href: '/warehouse',
    icon: Package,
    children: [
      { title: 'انبار مرکزی و پروژه‌ها', href: '/warehouse/warehouses' },
      { title: 'کاتالوگ کالا و مصالح', href: '/warehouse/items' },
      { title: 'رسید ورود کالا (GRN)', href: '/warehouse/receipts' },
      { title: 'حواله خروج و مصرف (GIN)', href: '/warehouse/issues' },
      { title: 'انتقال بین انبارها', href: '/warehouse-transfers' },
      { title: 'انبارگردانی', href: '/inventory-counts' },
      { title: 'کاردکس ریالی و تعدادی', href: '/warehouse/kardex' },
      { title: 'مصالح پای کار', href: '/material-report/consumption' },
    ],
  },
  {
    title: 'کارگاه و عملیات اجرایی',
    href: '/site-ops',
    icon: Building2,
    children: [
      { title: 'گزارش روزانه سرپرست', href: '/site-ops/daily-reports' },
      { title: 'صندوق ارسال گزارشات', href: '/site-ops/failed-forwardings' },
      { title: 'ماشین‌آلات و تجهیزات', href: '/equipment' },
    ],
  },
  {
    title: 'حسابداری مالی و پروژه‌ای',
    href: '/accounting',
    icon: BookOpen,
    children: [
      { title: 'اسناد حسابداری (سند دوبل)', href: '/accounting/journals' },
      { title: 'دفتر روزنامه رسمی', href: '/accounting/journal-book' },
      { title: 'دفتر کل و معین پیشرفته', href: '/accounting/advanced-ledger' },
      { title: 'تراز آزمایشی (۴ و ۸ ستونی)', href: '/accounting/trial-balance' },
      { title: 'تراز تفصیلی حساب‌ها', href: '/accounting/reports/detailed-trial-balance' },
      { title: 'ترازنامه مالی', href: '/accounting/reports/balance-sheet' },
      { title: 'صورت سود و زیان', href: '/accounting/reports/profit-loss' },
      { title: 'ریز تفصیلی پروژه', href: '/accounting/reports/project-ledger' },
      { title: 'اسناد تعدیل', href: '/adjustments' },
      { title: 'تسهیم هزینه‌های بالاسری', href: '/overhead-allocations' },
    ],
  },
  {
    title: 'خزانه‌داری و نقدینگی',
    href: '/treasury',
    icon: Landmark,
    children: [
      { title: 'بانک‌ها و صندوق‌ها', href: '/accounting/banks' },
      { title: 'مدیریت چک‌ها', href: '/accounting/cheques' },
      { title: 'تنخواه‌گردان پروژه‌ها', href: '/petty-cash' },
      { title: 'هزینه‌های جاری', href: '/expenses' },
      { title: 'صورت جریان وجوه نقد', href: '/accounting/reports/cash-flow' },
      { title: 'سرمایه و سهم‌الشرکه شرکا', href: '/partner-capital/accounts' },
      { title: 'اموال و دارایی‌های ثابت', href: '/accounting/fixed-assets' },
    ],
  },
  {
    title: 'حقوق، دستمزد و پیمانکاران',
    href: '/payroll',
    icon: Users,
    children: [
      { title: 'پرونده پرسنل', href: '/payroll/employees' },
      { title: 'کارکرد و حضور غیاب', href: '/payroll/attendance' },
      { title: 'محاسبه و فیش حقوقی', href: '/payroll/periods' },
      { title: 'درخواست مساعده', href: '/payroll/advance-requests' },
      { title: 'صورت‌وضعیت پرسنل', href: '/payroll/worker-statements' },
      { title: 'صورت‌وضعیت پیمانکاران جزء', href: '/payroll/subcontractor-statements' },
    ],
  },
  {
    title: 'فروش و درآمد',
    href: '/sales',
    icon: Receipt,
    children: [
      { title: 'واحدهای ساختمانی', href: '/sales/units' },
      { title: 'خریداران و کارفرمایان', href: '/sales/customers' },
      { title: 'قراردادهای پیش‌فروش و فروش', href: '/sales/contracts' },
      { title: 'فاکتورهای فروش', href: '/sales/invoices' },
      { title: 'رسید دریافت وجوه', href: '/sales/receipts' },
      { title: 'صورت‌وضعیت کارفرما (استاندارد ۹)', href: '/client-statements' },
    ],
  },
  {
    title: 'گزارش‌های جامع مدیریتی',
    href: '/reports',
    icon: BarChart3,
    children: [
      { title: 'مرکز جامع گزارشات', href: '/reports' },
      { title: 'گزارش بهای تمام‌شده', href: '/reports/project' },
      { title: 'کنترل پروژه و بودجه (WIP)', href: '/wip' },
      { title: 'سنی مطالبات بدهکاران', href: '/accounting/reports/ar-aging-detail' },
      { title: 'سنی بدهی بستانکاران', href: '/accounting/reports/ap-aging-detail' },
    ],
  },
  {
    title: 'پایه‌ها و تنظیمات سیستم',
    href: '/settings',
    icon: Settings,
    children: [
      { title: 'سال‌های مالی', href: '/settings/fiscal-years' },
      { title: 'کدینگ حساب‌ها', href: '/accounting/accounts' },
      { title: 'مراكز هزینه و پروژه‌ها', href: '/accounting/cost-centers' },
      { title: 'نگاشت خودکار اسناد', href: '/accounting/mappings' },
      { title: 'دفترچه مخاطبان', href: '/directory' },
      { title: 'کاربران و دسترسی‌ها', href: '/settings/users' },
      { title: 'لاگ‌های امنیتی', href: '/audit' },
      { title: 'سطل بازیافت', href: '/recycle-bin' },
    ],
  },
];