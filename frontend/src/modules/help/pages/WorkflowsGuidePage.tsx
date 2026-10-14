import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShoppingCart, ShoppingBag, Wallet, ClipboardList, PackagePlus, FileCheck2, Calendar, ArrowDown, CheckCircle2, XCircle, User, Send, Ban, GitBranch, Info, Package, FileWarning, Lock, Trash2, Ruler } from 'lucide-react';
import clsx from 'clsx';
import { useRef } from 'react';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

interface Step {
  actor: string;
  action: string;
  icon: any;
  color: string;
  target?: string;
}

interface Workflow {
  key: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  steps: Step[];
  onApprove?: string[];
  onReject?: string[];
  route?: string;
}

const WORKFLOWS: Workflow[] = [
  {
    key: 'fiscal-year',
    title: 'مدیریت سال مالی',
    description: 'ایجاد، جاری‌سازی، بستن، بازگشایی و حذف سال‌های مالی — مبنای همه اسناد حسابداری',
    icon: Calendar,
    color: 'cyan',
    route: '/settings/fiscal-years',
    steps: [
      { actor: 'مدیر ارشد', action: 'ایجاد سال مالی جدید (کد + نام + بازه)', icon: User, color: 'slate', target: 'سال مالی جدید' },
      { actor: 'مدیر ارشد', action: 'تنظیم به‌عنوان سال جاری', icon: CheckCircle2, color: 'emerald', target: 'مبنای ثبت اسناد' },
      { actor: 'مدیر ارشد', action: 'تولید سند افتتاحیه (از سال قبل)', icon: FileText, color: 'blue', target: 'سند افتتاحیه' },
      { actor: 'مدیر ارشد', action: 'تولید سند اختتامیه (بستن حساب‌های موقت)', icon: FileText, color: 'violet', target: 'سند اختتامیه' },
      { actor: 'مدیر ارشد', action: 'بستن سال مالی', icon: Lock, color: 'amber', target: 'سال بسته‌شده' },
    ],
    onApprove: [
      'فقط یک سال مالی می‌تواند «جاری» باشد — با تغییر جاری، قبلی غیرجاری می‌شود',
      'سند افتتاحیه: ماندهای دائمی (دارایی/بدهی/سرمایه) از سال قبل منتقل می‌شود',
      'سند اختتامیه: حساب‌های موقت (درآمد ۴.x و هزینه ۵.x) بسته و به سود و زیان انباشته (۳.۳) منتقل می‌شوند',
      'سال مالی «جاری» قابل بستن یا آرشیو نیست',
      'برای حذف: از دکمه «آرشیو» (زرد) استفاده کنید — قابل بازیابی از سوابق حذف',
    ],
    onReject: [
      'سال مالی «بسته» قابل بازگشایی است (دکمه Unlock) — ولی باید ابتدا مطمئن شوید که اسناد جدیدی لازم نیست',
      'حذف دائمی (قرمز — فقط مدیر ارشد): کاملاً از دیتابیس حذف می‌شود و قابل بازیابی نیست',
      'اگر سال مالی در جای دیگری ارجاع داشته باشد، حذف دائمی خطا می‌دهد',
      'برای بازگرداندن اشتباه: از «سوابق حذف» (Recycle Bin) استفاده کنید',
    ],
  },
  {
    key: 'petty-charge',
    title: 'درخواست شارژ تنخواه',
    description: 'درخواست تأمین نقدینگی تنخواه‌دار از مدیر و پرداخت توسط حسابداری',
    icon: Wallet,
    color: 'emerald',
    route: '/petty-cash',
    steps: [
      { actor: 'تنخواه‌دار', action: 'ثبت درخواست شارژ', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر', action: 'تأیید یا رد', icon: CheckCircle2, color: 'amber', target: 'کارتابل حسابداری' },
      { actor: 'حسابداری', action: 'پرداخت + انتخاب حساب مبدأ', icon: Wallet, color: 'blue', target: 'سند دوبل خودکار' },
      { actor: 'سیستم', action: 'ثبت سند + افزایش موجودی تنخواه', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'درخواست از کارتابل مدیر حذف و به کارتابل حسابداری منتقل می‌شود',
      'حسابداری دکمه «پرداخت» را می‌بیند',
      'پس از پرداخت: موجودی تنخواه افزایش می‌یابد',
      'سند دوبل خودکار: بدهکار تنخواه / بستانکار حساب بانک',
    ],
    onReject: [
      'درخواست در وضعیت REJECTED قرار می‌گیرد',
      'دلیل رد در کارتابل تنخواه‌دار نمایش داده می‌شود',
      'تنخواه‌دار می‌تواند ویرایش و دوباره ارسال کند',
    ],
  },
  {
    key: 'purchase-request',
    title: 'درخواست خرید (PR)',
    description: 'درخواست خرید کالا توسط کاربر، تأیید مدیر و تبدیل خودکار به دستور خرید',
    icon: ShoppingCart,
    color: 'blue',
    route: '/procurement/requests',
    steps: [
      { actor: 'کاربر', action: 'ثبت درخواست خرید', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر', action: 'تأیید یا رد', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ساخت خودکار PO + اختصاص به کارپرداز', icon: FileText, color: 'emerald', target: 'کارتابل کارپرداز' },
      { actor: 'کارپرداز', action: 'انتخاب تأمین‌کننده و قیمت‌ها', icon: ShoppingBag, color: 'indigo', target: 'PO نهایی' },
    ],
    onApprove: [
      'PR status → ORDERED',
      'سیستم خودکار یک PO با کد PO-YYYY-#### می‌سازد',
      'PO به کارپرداز اختصاص می‌یابد (بر اساس نقش purchaser)',
      'تأمین‌کننده خالی است و باید توسط کارپرداز پر شود',
    ],
    onReject: [
      'PR status → REJECTED',
      'دلیل رد برای درخواست‌کننده ارسال می‌شود',
    ],
  },
  {
    key: 'purchase-order',
    title: 'دستور خرید (PO)',
    description: 'دستور خرید پس از تأیید PR خودکار ساخته می‌شود — نیازی به تأیید مجدد ندارد',
    icon: ShoppingBag,
    color: 'orange',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'ساخت خودکار PO از PR تأییدشده', icon: FileText, color: 'emerald' },
      { actor: 'کارپرداز', action: 'تکمیل اطلاعات (تأمین‌کننده + قیمت)', icon: ShoppingBag, color: 'indigo', target: 'PO نهایی' },
      { actor: 'کارپرداز', action: 'ارسال به تأمین‌کننده', icon: Send, color: 'amber', target: 'ثبت رسید انبار' },
      { actor: 'انباردار', action: 'ثبت رسید پس از دریافت کالا', icon: PackagePlus, color: 'violet' },
    ],
    onApprove: [
      'PO به تأمین‌کننده ارسال می‌شود (status → SENT)',
      'پس از دریافت کالا، انباردار رسید ثبت می‌کند',
      'موجودی انبار خودکار افزایش می‌یابد',
    ],
  },
  {
    key: 'goods-receipt',
    title: 'رسید انبار',
    description: 'ثبت دریافت کالا از تأمین‌کننده یا کارگاه',
    icon: PackagePlus,
    color: 'violet',
    route: '/warehouse/receipts',
    steps: [
      { actor: 'انباردار', action: 'ثبت رسید', icon: User, color: 'slate', target: 'کارتابل سرپرست کارگاه' },
      { actor: 'سرپرست کارگاه', action: 'تأیید دریافت', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ثبت نهایی + افزایش موجودی انبار', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'رسید status → POSTED',
      'موجودی انبار افزایش می‌یابد',
      'تراکنش StockMovement ثبت می‌شود',
    ],
    onReject: [
      'رسید status → CANCELLED',
      'ثبت نهایی انجام نمی‌شود',
    ],
  },
  {
    key: 'subcontractor-statement',
    title: 'صورت‌وضعیت پیمانکار',
    description: 'ثبت صورت‌وضعیت پیمانکاران جزء توسط سرپرست کارگاه و تأیید مدیر پروژه',
    icon: FileText,
    color: 'indigo',
    route: '/payroll/subcontractor-statements',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت صورت‌وضعیت', icon: User, color: 'slate', target: 'کارتابل مدیر پروژه' },
      { actor: 'مدیر پروژه', action: 'پیوست نقشه + تأیید', icon: CheckCircle2, color: 'indigo', target: 'کارتابل مدیر ارشد' },
      { actor: 'مدیر ارشد', action: 'تأیید نهایی', icon: CheckCircle2, color: 'emerald', target: 'کارتابل حسابداری' },
      { actor: 'حسابداری', action: 'پرداخت + ثبت سند', icon: Wallet, color: 'blue' },
    ],
    onApprove: [
      'صورت‌وضعیت در وضعیت‌های مختلف (DRAFT → SUBMITTED → APPROVED → PAID) حرکت می‌کند',
      'در هر مرحله، تأییدکننده می‌تواند فایل‌های پیوست اضافه کند',
      'پس از تأیید نهایی، به کارتابل حسابداری منتقل می‌شود',
    ],
    onReject: [
      'صورت‌وضعیت status → REJECTED',
      'دلیل رد برای سرپرست کارگاه نمایش داده می‌شود',
    ],
  },
  {
    key: 'daily-report',
    title: 'گزارش روزانه کارگاه',
    description: 'ثبت وقایع روزانه کارگاه و دریافت تأیید سرپرست',
    icon: ClipboardList,
    color: 'amber',
    route: '/site-ops/daily-reports',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت گزارش روزانه', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر پروژه', action: 'تأیید گزارش', icon: CheckCircle2, color: 'indigo' },
      { actor: 'سیستم', action: 'ثبت به‌عنوان سابقه رسمی کارگاه', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'گزارش status → APPROVED',
      'برای گزارشات تحلیلی استفاده می‌شود',
    ],
    onReject: [
      'گزارش status → REJECTED',
      'سرپرست باید دلایل را اصلاح کند',
    ],
  },
  {
    key: 'leave-advance',
    title: 'مرخصی و مساعده',
    description: 'درخواست مرخصی یا مساعده پرسنل',
    icon: Calendar,
    color: 'cyan',
    route: '/payroll/leave-requests',
    steps: [
      { actor: 'پرسنل', action: 'ثبت درخواست', icon: User, color: 'slate', target: 'کارتابل سرپرست' },
      { actor: 'سرپرست کارگاه', action: 'تأیید اول', icon: CheckCircle2, color: 'amber', target: 'کارتابل منابع انسانی' },
      { actor: 'منابع انسانی', action: 'تأیید نهایی', icon: CheckCircle2, color: 'cyan', target: 'کارتابل حسابداری' },
      { actor: 'حسابداری', action: 'پرداخت + ثبت سند', icon: Wallet, color: 'blue' },
    ],
    onApprove: [
      'درخواست به مرحله بعد منتقل می‌شود',
      'در محاسبه حقوق ماهانه لحاظ می‌شود',
    ],
    onReject: [
      'درخواست status → REJECTED',
      'به درخواست‌کننده اطلاع داده می‌شود',
    ],
  },
  {
    key: 'journal',
    title: 'سند حسابداری دستی',
    description: 'ثبت سند دوبل با کنترل تراز خودکار',
    icon: FileText,
    color: 'emerald',
    route: '/accounting/journals',
    steps: [
      { actor: 'حسابدار', action: 'ثبت سند (DRAFT)', icon: User, color: 'slate', target: 'پیش‌نویس' },
      { actor: 'حسابدار', action: 'بازبینی + ثبت نهایی', icon: CheckCircle2, color: 'emerald', target: 'POSTED' },
      { actor: 'مدیر مالی', action: 'ابطال (در صورت نیاز)', icon: Ban, color: 'red', target: 'سند معکوس' },
    ],
    onApprove: [
      'سند DRAFT → POSTED',
      'در گزارشات مالی لحاظ می‌شود',
      'پس از POSTED، حذف ممکن نیست — فقط ابطال',
    ],
    onReject: [
      'سند ابطال‌شده: یک سند معکوس خودکار ثبت می‌شود',
      'دلیل ابطال در سند اصلی نمایش داده می‌شود',
    ],
  },
  {
    key: 'budget-check',
    title: 'کنترل بودجه در تأیید PO',
    description: 'هنگام تأیید دستور خرید، مجموع تعهدات و واقعی با بودجه WBS مقایسه می‌شود',
    icon: ClipboardList,
    color: 'amber',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'محاسبه بودجه + تعهدات + واقعی', icon: ClipboardList, color: 'slate', target: 'بررسی آستانه' },
      { actor: 'سیستم', action: 'مقایسه با بودجه × (۱ + آستانه)', icon: FileCheck2, color: 'amber', target: 'هشدار یا تأیید' },
      { actor: 'مدیر', action: 'تأیید با وجود هشدار', icon: CheckCircle2, color: 'emerald', target: 'PO → APPROVED' },
    ],
    onApprove: [
      'بودجه از WBS خوانده می‌شود',
      'تعهدات = مجموع PO های APPROVED روی همان WBS',
      'واقعی = مجموع فاکتورهای خرید روی همان WBS',
      'آستانه پیش‌فرض ۱۰٪ — قابل تغییر در کد',
      'اگر مجموع پیش‌بینی از آستانه بگذرد، هشدار نمایش داده می‌شود',
    ],
    onReject: [
      'اگر کاربر تأیید نکند، PO در DRAFT باقی می‌ماند',
    ],
  },
  {
    key: 'fixed-asset',
    title: 'دارایی ثابت از فاکتور خرید',
    description: 'در فاکتور خرید، اقلام CAPITAL به‌صورت خودکار به دارایی ثابت تبدیل می‌شوند',
    icon: Package,
    color: 'violet',
    route: '/procurement/invoices',
    steps: [
      { actor: 'کاربر', action: 'ثبت فاکتور با تیک «دارایی ثابت»', icon: User, color: 'slate', target: 'ذخیره DRAFT' },
      { actor: 'حسابدار', action: 'تأیید فاکتور', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ساخت FixedAsset + سند خودکار', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'برای هر قلم isCapital، یک FixedAsset ساخته می‌شود',
      'عمر مفید پیش‌فرض ۱۲۰ ماه — قابل تنظیم روی هر ردیف',
      'حساب‌ها از mapping FIXED_ASSET_ACQUISITION و DEPRECIATION_MONTHLY',
      'کد FA-YYYY-#### تولید می‌شود',
      'سند خرید به حساب دارایی (نه هزینه) بدهکار می‌شود',
    ],
  },
  {
    key: 'failed-forwardings',
    title: 'صندوق خطای ارسال گزارش روزانه',
    description: 'ردیف‌هایی که در forward شدن به واحد مقصد خطا خورده‌اند',
    icon: FileWarning,
    color: 'red',
    route: '/site-ops/failed-forwardings',
    steps: [
      { actor: 'سیستم', action: 'تلاش برای forward ردیف‌ها', icon: Send, color: 'slate', target: 'ثبت نتیجه' },
      { actor: 'سیستم', action: 'ثبت FAILED + پیام خطا', icon: XCircle, color: 'red', target: 'صندوق خطا' },
      { actor: 'کاربر', action: 'کلیک Retry در صندوق خطا', icon: CheckCircle2, color: 'emerald', target: 'تلاش مجدد' },
    ],
    onApprove: [
      'Forwarding نهایی به چند جدول: DailyWorkLog، GoodsReceipt، GoodsIssue، EquipmentDailyLog، PurchaseRequest، PettyCashRequest',
      'هر ردیف با کلید یکتا (reportId + sectionType + rowNumber + targetType) ذخیره می‌شود',
      'در صورت موفقیت مجدد، از لیست صندوق خطا حذف می‌شود',
    ],
  },
  {
    key: 'period-lock',
    title: 'قفل دوره مالی',
    description: 'جلوگیری از ثبت اسناد حسابداری در ماه‌های قفل‌شده',
    icon: Lock,
    color: 'orange',
    route: '/settings/period-lock',
    steps: [
      { actor: 'حسابدار', action: 'قفل کردن ماه', icon: Lock, color: 'slate', target: 'ذخیره در FiscalYear.lockedMonths' },
      { actor: 'سیستم', action: 'رد کردن سند با تاریخ ماه قفل‌شده', icon: XCircle, color: 'red' },
      { actor: 'حسابدار', action: 'بازکردن قفل (در صورت نیاز)', icon: Lock, color: 'emerald' },
    ],
    onApprove: [
      'در لحظه ثبت هر سند (JournalsService.create)، چک می‌شود',
      'اگر ماه قفل باشد → PERIOD_LOCKED با پیام فارسی',
      'در صفحه فاکتور/سند/صورت‌وضعیت نمایش داده می‌شود',
    ],
  },
  {
    key: 'admin-hard-delete',
    title: 'حذف کامل توسط مدیر (Hard Delete)',
    description: 'امکان حذف کامل برای admin روی همه‌ی موجودیت‌های main',
    icon: Trash2,
    color: 'red',
    route: '/recycle-bin',
    steps: [
      { actor: 'کاربر', action: 'کلیک حذف روی رکورد', icon: Trash2, color: 'slate', target: 'مودال اول' },
      { actor: 'سیستم', action: 'چک ارجاع‌ها', icon: ClipboardList, color: 'amber', target: 'مودال دوم (admin)' },
      { actor: 'مدیر', action: 'تأیید حذف کامل', icon: CheckCircle2, color: 'red', target: 'پاک‌سازی' },
    ],
    onApprove: [
      'اگر رکورد ارجاعی نداشته باشد → پاک می‌شود',
      'اگر داشته باشد → حالت پیش‌فرض soft delete (غیرفعال) با پیام هشدار',
      'اگر admin تأیید کند → تمام ارجاع‌ها حذف و رکورد اصلی پاک می‌شود',
      'موجودیت‌های پشتیبانی: اسناد، اشخاص، پروژه، قرارداد، کالا، انبار، دسته، ماشین، مشتری، قرارداد فروش، چک، مجوز، بیمه، تضمین، سند فنی، چک‌لیست، پرسنل',
    ],
  },
  {
    key: 'telegram-alerts',
    title: 'هشدار تلگرام در مانیتورینگ',
    description: 'ارسال پیام تلگرام در صورت خطا یا restart سرویس‌ها',
    icon: Send,
    color: 'cyan',
    steps: [
      { actor: 'سیستم', action: 'هر ۵ دقیقه چک HTTP سرویس‌ها', icon: ClipboardList, color: 'slate', target: 'لاگ' },
      { actor: 'سیستم', action: 'در صورت ERROR/WARN/RESTART → تلگرام', icon: Send, color: 'amber' },
    ],
    onApprove: [
      'تنظیمات در E:\EpsayAccounting\tools\telegram.config.json',
      'levels: ERROR, WARN, RESTART',
      'rateLimitSeconds: فاصله حداقل بین پیام‌های هم‌سطح',
      'در هر پیام: نام کامپیوتر + سطح + متن خطا',
    ],
  },
  {
    key: 'custom-units',
    title: 'واحدهای قابل تعریف کاربر',
    description: 'تعریف واحد جدید در Settings و استفاده بلافاصله در همه فرم‌ها',
    icon: Ruler,
    color: 'blue',
    route: '/settings/units',
    steps: [
      { actor: 'مدیر سیستم', action: 'افزودن واحد جدید در تنظیمات', icon: User, color: 'slate', target: 'ذخیره در DB' },
      { actor: 'سیستم', action: 'بارگذاری خودکار در useUnits hook', icon: ClipboardList, color: 'amber' },
      { actor: 'کاربر', action: 'استفاده در فرم کالا/WBS/PR/PO/PI', icon: CheckCircle2, color: 'emerald' },
    ],
    onApprove: [
      'واحدهای سیستمی (NUMBER, KG, TON, M, ...) قابل حذف نیستند — فقط غیرفعال',
      'واحدهای کاربری اگر در اسناد استفاده نشده باشند قابل حذف هستند',
      'کش در useUnits مشترک است — یک بار از API خوانده می‌شود',
    ],
  },];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    gradient: 'from-blue-500 to-blue-700' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  gradient: 'from-orange-500 to-orange-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  gradient: 'from-violet-500 to-violet-700' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  gradient: 'from-indigo-500 to-indigo-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   gradient: 'from-amber-500 to-amber-700' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    gradient: 'from-cyan-500 to-cyan-700' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-700',   border: 'border-slate-200',   gradient: 'from-slate-500 to-slate-700' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     gradient: 'from-red-500 to-red-700' },
};

export default function WorkflowsGuidePage() {
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand-600" />
            راهنمای گردش کارها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            نقشه کامل گردش همه اسناد در سیستم — از ثبت تا تأیید و اقدام نهایی
          </p>
        </div>
        <PrintButton contentRef={printRef} documentTitle="راهنمای گردش کارها" />
      </div>

      {/* اطلاعات کلی */}
      <div ref={printRef} className="space-y-6">
        <PrintHeader title="راهنمای گردش کارها" subtitle="Epsay Accounting — نقشه فرایندها" />

        <div className="card p-5 bg-gradient-to-bl from-blue-50 to-white border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-1">چطور از این راهنما استفاده کنید</h3>
              <p className="text-sm text-blue-700 leading-6">
                برای هر سند، مراحل گردش کار، اقدامات پس از تأیید و اقدامات پس از رد نمایش داده شده است.
                برای رفتن به صفحه هر سند، روی دکمه «مشاهده» کلیک کنید.
              </p>
            </div>
          </div>
        </div>

        {/* راهنمای همه گردش‌ها */}
        {WORKFLOWS.map((wf) => {
          const Icon = wf.icon;
          const colors = COLOR_MAP[wf.color] || COLOR_MAP.slate;
          return (
            <div key={wf.key} className="card overflow-hidden">
              {/* هدر سند */}
              <div className={clsx('p-5 border-b', colors.bg, colors.border)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br shrink-0', colors.gradient)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={clsx('text-lg font-bold', colors.text)}>{wf.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">{wf.description}</p>
                    </div>
                  </div>
                  {wf.route && (
                    <button
                      onClick={() => nav(wf.route!)}
                      className="btn-secondary text-xs no-print"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      مشاهده
                    </button>
                  )}
                </div>
              </div>

              {/* مراحل */}
              <div className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">مراحل گردش کار</h3>
                <div className="space-y-2">
                  {wf.steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const stepColors = COLOR_MAP[step.color] || COLOR_MAP.slate;
                    return (
                      <div key={idx}>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center shrink-0">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center num">
                              {idx + 1}
                            </span>
                          </div>
                          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stepColors.bg)}>
                            <StepIcon className={clsx('w-4 h-4', stepColors.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-700">{step.actor}:</span>
                              <span className="text-sm text-slate-800">{step.action}</span>
                            </div>
                            {step.target && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                <ArrowLeft className="w-3 h-3 inline text-slate-400" /> {step.target}
                              </div>
                            )}
                          </div>
                        </div>
                        {idx < wf.steps.length - 1 && (
                          <div className="flex items-center ms-3 my-1">
                            <ArrowDown className="w-3 h-3 text-slate-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* نتایج تأیید/رد */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t">
                  {wf.onApprove && wf.onApprove.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">پس از تأیید</span>
                      </div>
                      <ul className="space-y-1">
                        {wf.onApprove.map((item, i) => (
                          <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wf.onReject && wf.onReject.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-800">پس از رد</span>
                      </div>
                      <ul className="space-y-1">
                        {wf.onReject.map((item, i) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                            <span className="text-red-500 mt-0.5">▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* پانویس */}
        <div className="card p-4 bg-slate-50 text-center">
          <p className="text-xs text-slate-500">
            این راهنما برای درک بهتر گردش کارهای سیستم ساخته شده است.
            برای اطلاعات دقیق‌تر درباره هر سند، به راهنمای همان صفحه مراجعه کنید (آیکون ؟ در هدر).
          </p>
        </div>
      </div>
    </div>
  );
}
