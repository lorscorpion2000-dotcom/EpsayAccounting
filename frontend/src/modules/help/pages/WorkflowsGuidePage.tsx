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
  // ═══════════════════════════════════════════════════════
  // گردش‌های پایه‌ی حسابداری
  // ═══════════════════════════════════════════════════════
  {
    key: 'fiscal-year',
    title: 'مدیریت سال مالی',
    description: 'ساخت سال مالی، تعیین سال جاری، بستن حساب‌های پایان سال و بازگشایی در صورت نیاز. سال مالی پایه‌ی همه‌ی اسناد حسابداری است.',
    icon: Calendar,
    color: 'cyan',
    route: '/settings/fiscal-years',
    steps: [
      { actor: 'مدیر ارشد', action: 'یک سال مالی جدید بساز (کد، نام، تاریخ شروع، تاریخ پایان)', icon: User, color: 'slate', target: 'سال مالی جدید' },
      { actor: 'مدیر ارشد', action: 'آن را به‌عنوان سال جاری تعیین کن', icon: CheckCircle2, color: 'emerald', target: 'مبنای ثبت اسناد' },
      { actor: 'حسابدار', action: 'در طول سال، اسناد حسابداری را ثبت کن', icon: FileText, color: 'blue', target: 'سند حسابداری' },
      { actor: 'حسابدار', action: 'سند اختتامیه بساز تا حساب‌های درآمد و هزینه بسته شوند', icon: FileText, color: 'violet', target: 'سند اختتامیه' },
      { actor: 'مدیر ارشد', action: 'سال را ببند', icon: Lock, color: 'amber', target: 'سال بسته‌شده' },
    ],
    onApprove: [
      'در هر لحظه فقط یک سال می‌تواند جاری باشد. با تعیین سال جدید، سال قبلی خودکار غیرجاری می‌شود.',
      'سال بسته نمی‌شود اگر حتی یک سند پیش‌نویس در آن باشد. اول همه‌ی پیش‌نویس‌ها را نهایی یا باطل کن.',
      'بعد از بستن سال، دیگر نمی‌توانی سند جدید در آن ثبت کنی.',
      'اگر سالی را اشتباهی بستی، می‌توانی بازگشایی کنی — بقیه‌ی سال‌ها دست‌نخورده می‌مانند.',
      'سند افتتاحیه مانده‌ی دارایی، بدهی و سرمایه را از سال قبل به این سال منتقل می‌کند.',
      'سند اختتامیه حساب‌های درآمدی (۴.х) و هزینه‌ای (۵.х) را می‌بندد و مانده‌ی آن‌ها را به سود و زیان انباشته (۳.۳) منتقل می‌کند.',
    ],
    onReject: [
      'سال مالی باز می‌ماند اگر فقط اسناد نهایی داشته باشد؛ فقط سند پیش‌نویس جلوی بستن را می‌گیرد.',
      'اگر فقط می‌خواهی یک ماه قفل شود، از «قفل دوره مالی» استفاده کن، نه بستن سال.',
      'برای حذف سال از دکمه‌ی «آرشیو» استفاده کن؛ بازیابی از سوابق حذف ممکن است.',
      'حذف دائمی فقط توسط مدیر ارشد ممکن است و بازیابی ندارد.',
    ],
  },
  {
    key: 'period-lock',
    title: 'قفل دوره مالی',
    description: 'قفل کردن یک ماه خاص برای جلوگیری از ثبت سند جدید در آن ماه — بدون بستن کل سال.',
    icon: Lock,
    color: 'orange',
    route: '/settings/period-lock',
    steps: [
      { actor: 'حسابدار', action: 'یک ماه را انتخاب و قفل کن', icon: Lock, color: 'slate', target: 'ذخیره در ماه‌های قفل‌شده‌ی سال' },
      { actor: 'سیستم', action: 'به‌طور خودکار در هر ثبت سند چک می‌کند که ماه باز باشد', icon: XCircle, color: 'red', target: 'خطای «ماه قفل است»' },
      { actor: 'حسابدار', action: 'اگر لازم شد، قفل ماه را باز کن', icon: Lock, color: 'emerald', target: 'بازکردن قفل ماه' },
    ],
    onApprove: [
      'قفل هر ماه مستقل از بستن سال است. می‌توانی یک ماه را قفل کنی و سال باز بماند.',
      'قفل ماه به فرمت میلادی است — مثلاً «ماه دهم سال ۲۰۲۶».',
      'قفل روی همه‌ی مسیرهایی که سند ثبت می‌کنند اعمال می‌شود: سند دستی، تأیید فاکتور فروش، دریافت فروش.',
      'اگر ماه قفل باشد و کسی سعی کند سند ثبت کند، پیام «این ماه قفل است» می‌گیرد.',
      'برای رفع خطای «هیچ سال مالی جاری فعالی وجود ندارد»، یک سال مالی باز را به‌عنوان سال جاری تعیین کن.',
    ],
    onReject: [
      'اگر می‌خواهی کل سال بسته شود، از «مدیریت سال مالی» استفاده کن.',
      'بعضی سرویس‌ها (مثل شارژ تنخواه) نیاز دارند حداقل یک سال مالی باز و جاری وجود داشته باشد.',
    ],
  },
  {
    key: 'petty-charge',
    title: 'درخواست شارژ تنخواه',
    description: 'درخواست تأمین نقدینگی تنخواه‌دار از مدیر، تأیید مدیر، پرداخت توسط حسابداری و ثبت خودکار سند.',
    icon: Wallet,
    color: 'emerald',
    route: '/petty-cash',
    steps: [
      { actor: 'تنخواه‌دار', action: 'یک درخواست شارژ ثبت کن (حساب، مبلغ، دلیل)', icon: User, color: 'slate', target: 'در انتظار تأیید' },
      { actor: 'مدیر', action: 'تأیید یا رد کن', icon: CheckCircle2, color: 'amber', target: 'تأییدشده یا ردشده' },
      { actor: 'حسابدار', action: 'پرداخت کن و حساب مبدأ را انتخاب کن', icon: Wallet, color: 'blue', target: 'پرداخت‌شده' },
      { actor: 'سیستم', action: 'سند حسابداری خودکار ثبت و موجودی تنخواه زیاد می‌شود', icon: FileText, color: 'emerald', target: 'سند خودکار شارژ تنخواه' },
    ],
    onApprove: [
      'در مرحله‌ی پرداخت، انتخاب حساب مبدأ (بانک یا صندوق) الزامی است.',
      'سند خودکار: حساب تنخواه‌گردان‌ها (۱.۱.۵) بدهکار می‌شود و حساب مبدأ بستانکار.',
      'کد سند خودکار با پیشوند «JE-PC» شروع می‌شود.',
      'یک تراکنش متناظر از نوع «تأمین» ساخته و به سند وصل می‌شود.',
      'موجودی تنخواه به اندازه‌ی مبلغ درخواست زیاد می‌شود.',
      'پیش‌نیاز: حداقل یک سال مالی باز و جاری باید وجود داشته باشد.',
    ],
    onReject: [
      'درخواست در وضعیت «ردشده» قرار می‌گیرد و دلیل رد نمایش داده می‌شود.',
      'تنخواه‌دار می‌تواند درخواست را ویرایش و دوباره ارسال کند.',
      'اگر در مرحله‌ی پرداخت خطای «هیچ سال مالی جاری فعالی وجود ندارد» دیدی، اول یک سال مالی باز را جاری کن.',
    ],
  },
  {
    key: 'journal',
    title: 'سند حسابداری دستی',
    description: 'ثبت سند دوبل با کنترل خودکار تراز، مدیریت وضعیت پیش‌نویس/نهایی و امکان ابطال.',
    icon: FileText,
    color: 'emerald',
    route: '/accounting/journals',
    steps: [
      { actor: 'حسابدار', action: 'یک سند پیش‌نویس با تاریخ، شرح و ردیف‌ها ثبت کن', icon: User, color: 'slate', target: 'سند پیش‌نویس' },
      { actor: 'حسابدار', action: 'سند را بازبینی کن', icon: CheckCircle2, color: 'emerald', target: 'پیش‌نمایش' },
      { actor: 'حسابدار', action: 'سند را نهایی کن', icon: CheckCircle2, color: 'emerald', target: 'سند نهایی' },
      { actor: 'مدیر مالی', action: 'اگر لازم شد، سند را ابطال کن', icon: Ban, color: 'red', target: 'سند معکوس' },
    ],
    onApprove: [
      'تاریخ سند باید داخل بازه‌ی سال مالی انتخاب‌شده باشد.',
      'برای نهایی کردن سند، از دکمه‌ی «ثبت نهایی» استفاده کن — نه از راه دیگری.',
      'سند نهایی قابل حذف نیست؛ فقط می‌شود آن را ابطال کرد.',
      'برای بستن سال مالی، هیچ سند پیش‌نویسی نباید در آن سال باقی مانده باشد.',
      'لیست پیش‌نویس‌های هر سال را می‌توانی با فیلتر «سال مالی» و «وضعیت = پیش‌نویس» ببینی.',
    ],
    onReject: [
      'وقتی سند را ابطال می‌کنی، یک سند معکوس خودکار ثبت می‌شود.',
      'دلیل ابطال روی سند اصلی نمایش داده می‌شود.',
      'در فهرست اسناد مشخص است که سند دستی است یا خودکار (مثلاً از تأیید فاکتور یا تنخواه).',
    ],
  },
  {
    key: 'admin-hard-delete',
    title: 'حذف و بازیابی',
    description: 'حذف پیش‌فرض به شکل آرشیو (قابل بازیابی)، دیدن سوابق حذف‌شده، و حذف همیشگی توسط مدیر ارشد.',
    icon: Trash2,
    color: 'red',
    route: '/recycle-bin',
    steps: [
      { actor: 'کاربر', action: 'رکورد را حذف کن (به‌طور پیش‌فرض آرشیو می‌شود)', icon: Trash2, color: 'slate', target: 'آرشیو' },
      { actor: 'سیستم', action: 'تاریخ و کاربر حذف‌کننده را ثبت می‌کند و رکورد از لیست عادی پنهان می‌شود', icon: ClipboardList, color: 'amber', target: 'پنهان از لیست' },
      { actor: 'کاربر', action: 'از صفحه‌ی «سوابق حذف» رکورد را بازیابی کن', icon: CheckCircle2, color: 'emerald', target: 'بازگشت به لیست' },
      { actor: 'مدیر ارشد', action: 'در موارد استثنایی، رکورد را برای همیشه حذف کن', icon: Ban, color: 'red', target: 'حذف دائمی' },
    ],
    onApprove: [
      'حذف پیش‌فرض «آرشیو» است. رکورد از لیست پنهان می‌شود ولی باقی می‌ماند.',
      'رکوردهای آرشیوشده در صفحه‌ی «سوابق حذف» دیده می‌شوند و قابل بازیابی‌اند.',
      'تا وقتی یک رکورد آرشیو نشده و بازیابی نشده، اگر بخواهی رکورد جدیدی با همان کد بسازی، خطای تکراری می‌گیری.',
      'این قابلیت روی اسناد، اشخاص، پروژه، قرارداد، کالا، انبار، مشتری، قرارداد فروش، پرسنل و تنخواه فعال است.',
    ],
    onReject: [
      'حذف همیشگی فقط در موارد استثنایی و توسط مدیر ارشد انجام می‌شود.',
      'اگر رکورد در جای دیگری ارجاع داشته باشد، حذف همیشگی خطا می‌دهد.',
      'بازگرداندن رکورد حذف‌شده‌ی همیشگی فقط با بازیابی پایگاه داده ممکن است.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های فروش و دریافت
  // ═══════════════════════════════════════════════════════
  {
    key: 'sales-unit-flow',
    title: 'چرخه فروش واحد',
    description: 'از تعریف واحد و مشتری تا قرارداد، فعال‌سازی، فاکتور و دریافت — با ثبت خودکار سند حسابداری.',
    icon: ShoppingBag,
    color: 'violet',
    route: '/sales/units',
    steps: [
      { actor: 'کارشناس فروش', action: 'یک واحد قابل فروش تعریف کن (پروژه + شماره واحد)', icon: User, color: 'slate', target: 'واحد قابل فروش' },
      { actor: 'کارشناس فروش', action: 'مشتری را تعریف کن (نام + کد ملی)', icon: User, color: 'slate', target: 'مشتری + ریزحساب مشتری' },
      { actor: 'کارشناس فروش', action: 'یک قرارداد فروش پیش‌نویس با اقساط ثبت کن', icon: FileText, color: 'indigo', target: 'واحد رزرو' },
      { actor: 'مدیر فروش', action: 'قرارداد را فعال کن', icon: CheckCircle2, color: 'emerald', target: 'قرارداد فعال + واحد فروخته‌شده' },
      { actor: 'کارشناس فروش', action: 'فاکتور فروش پیش‌نویس صادر کن', icon: FileText, color: 'blue', target: 'فاکتور فروش' },
      { actor: 'مدیر مالی', action: 'فاکتور را تأیید کن', icon: CheckCircle2, color: 'emerald', target: 'سند فروش' },
      { actor: 'حسابدار', action: 'دریافت را ثبت کن (نقدی یا بانکی)', icon: Wallet, color: 'blue', target: 'سند دریافت' },
    ],
    onApprove: [
      'شماره‌ی واحد در هر پروژه و بلوک یکتاست.',
      'چرخه‌ی قرارداد: پیش‌نویس ← فعال ← بسته/لغو.',
      'وقتی قرارداد ثبت می‌شود، وضعیت واحد «رزرو» می‌شود.',
      'وقتی قرارداد فعال می‌شود، وضعیت واحد «فروخته‌شده» می‌شود.',
      'اگر قرارداد لغو شود، وضعیت واحد به «قابل فروش» برمی‌گردد.',
      'در فاکتور فروش، مالیات ارزش افزوده به‌طور پیش‌فرض ۱۰٪ است.',
      'سند تأیید فاکتور: مشتری بدهکار می‌شود، حساب درآمد (معمولاً ۴.۱.۱) و مالیات فروش بستانکار.',
      'سند دریافت: صندوق یا بانک بدهکار می‌شود، حساب مشتری بستانکار.',
      'تأیید فاکتور و ثبت دریافت به قفل دوره مالی احترام می‌گذارند.',
      'روش‌های پرداخت پشتیبانی‌شده: نقدی و انتقال بانکی.',
    ],
    onReject: [
      'حذف قرارداد بدون اجبار فقط در وضعیت پیش‌نویس یا لغو‌شده ممکن است.',
      'بعد از فعال‌سازی، اگر پرداختی ثبت شده باشد، حذف قرارداد رد می‌شود.',
      'حذف مشتری فقط با اجبار و بعد از پاک‌کردن ارجاعات ممکن است.',
      'فاکتور فقط در وضعیت پیش‌نویس قابل ویرایش یا حذف است.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های تنخواه و حقوق
  // ═══════════════════════════════════════════════════════
  {
    key: 'petty-expense',
    title: 'هزینه از تنخواه',
    description: 'ثبت هزینه توسط تنخواه‌دار، تأیید حسابدار و ثبت خودکار سند با کاهش موجودی تنخواه.',
    icon: Wallet,
    color: 'orange',
    route: '/petty-cash/transactions',
    steps: [
      { actor: 'تنخواه‌دار', action: 'تراکنش هزینه را ثبت کن (مبلغ، دریافت‌کننده، دسته)', icon: User, color: 'slate', target: 'پیش‌نویس' },
      { actor: 'تنخواه‌دار', action: 'درخواست را برای تأیید ارسال کن', icon: Send, color: 'amber', target: 'ارسال‌شده' },
      { actor: 'حسابدار', action: 'تأیید کن', icon: CheckCircle2, color: 'emerald', target: 'تأییدشده + سند' },
      { actor: 'سیستم', action: 'سند حسابداری خودکار ثبت و موجودی تنخواه کم می‌شود', icon: FileText, color: 'emerald', target: 'سند خودکار هزینه تنخواه' },
    ],
    onApprove: [
      'سند خودکار: حساب هزینه (بر اساس دسته) بدهکار و حساب تنخواه‌گردان‌ها (۱.۱.۵) بستانکار می‌شود.',
      'موجودی تنخواه به اندازه‌ی مبلغ هزینه کم می‌شود.',
      'فیلدهای اختیاری: طرف حساب، پروژه، ردیف WBS، شماره فاکتور، تصویر فاکتور.',
      'ارسال برای تأیید و تأیید نهایی هر دو از طریق ویرایش وضعیت انجام می‌شوند.',
      'بعد از تأیید، سند در فهرست اسناد حسابداری با کد «JV» نمایش داده می‌شود.',
    ],
    onReject: [
      'تراکنش در وضعیت «ردشده» قرار می‌گیرد و موجودی تنخواه تغییری نمی‌کند.',
      'دلیل رد ثبت می‌شود.',
      'تنخواه‌دار می‌تواند تراکنش را اصلاح و دوباره ارسال کند.',
    ],
  },
  {
    key: 'payroll',
    title: 'دوره حقوق و دستمزد',
    description: 'محاسبه حقوق از حضور و غیاب، تأیید و پرداخت — با ثبت خودکار سند تعهد حقوق.',
    icon: Calendar,
    color: 'cyan',
    route: '/payroll/periods',
    steps: [
      { actor: 'مدیر مالی', action: 'یک دوره‌ی حقوق جدید بساز (سال، ماه، تاریخ شروع و پایان)', icon: User, color: 'slate', target: 'دوره‌ی پیش‌نویس' },
      { actor: 'مدیر مالی', action: 'از حضور و غیاب محاسبه کن', icon: ClipboardList, color: 'amber', target: 'فیش‌های حقوق' },
      { actor: 'مدیر مالی', action: 'دوره را تأیید کن', icon: CheckCircle2, color: 'emerald', target: 'تأییدشده + سند' },
      { actor: 'مدیر مالی', action: 'پرداخت را ثبت کن', icon: Wallet, color: 'blue', target: 'پرداخت‌شده' },
    ],
    onApprove: [
      'قبل از محاسبه، حضور و غیاب ماه باید ثبت شده باشد (کارت «حضور و غیاب گروهی»).',
      'سند تعهد حقوق در مرحله‌ی تأیید دوره ساخته می‌شود، نه قبل.',
      'باگ شناخته‌شده: سند فعلی فقط مبلغ خالص را ثبت می‌کند — سهم بیمه‌ی کارمند در سند دیده نمی‌شود.',
      'برای گزارش مالیات حقوق، از صفحه‌ی «گزارش‌های مالیاتی» استفاده کن.',
    ],
    onReject: [
      'حذف دوره فقط در وضعیت پیش‌نویس ممکن است.',
      'اگر دوره پرداخت شده باشد، حذف مجاز نیست.',
    ],
  },
  {
    key: 'attendance',
    title: 'حضور و غیاب گروهی',
    description: 'ثبت حضور روزانه‌ی پرسنل — پایه‌ی محاسبه‌ی دوره‌ی حقوق.',
    icon: ClipboardList,
    color: 'indigo',
    route: '/payroll/attendance',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'حضور گروهی را ثبت کن', icon: ClipboardList, color: 'indigo', target: 'جدول حضور و غیاب' },
      { actor: 'سیستم', action: 'اگر برای همان کارمند و تاریخ رکوردی باشد، به‌روزرسانی می‌کند', icon: CheckCircle2, color: 'emerald', target: 'ثبت یا به‌روزرسانی' },
      { actor: 'مدیر مالی', action: 'در محاسبه‌ی دوره‌ی حقوق از این داده استفاده می‌کند', icon: Wallet, color: 'blue', target: 'فیش حقوق' },
    ],
    onApprove: [
      'نکته‌ی مهم: در این فرم، «کارمند» همان «طرف حساب» است، نه پروفایل پرسنلی.',
      'وضعیت‌های ممکن: حاضر، غایب، مرخصی، استعلاجی، مأموریت، تعطیل.',
      'ترکیب «کارمند + تاریخ» یکتاست. اگر دوباره برای همان روز ثبت کنی، رکورد قبلی به‌روزرسانی می‌شود.',
      'برای بازبینی، می‌توانی حضور یک کارمند را در بازه‌ی تاریخ ببینی.',
    ],
    onReject: [
      'تاریخ‌های آینده معمولاً مجاز نیستند.',
      'اگر کارمندی طرف حساب ندارد، اول پروفایل پرسنلی با طرف حساب مرتبط بساز.',
      'برای بازبینی گزارش یک کارمند، از صفحه‌ی گرید ماهانه استفاده کن.',
    ],
  },
  {
    key: 'leave-advance',
    title: 'مرخصی و مساعده',
    description: 'درخواست مرخصی یا مساعده‌ی پرسنل و گردش تأیید تا پرداخت.',
    icon: Calendar,
    color: 'cyan',
    route: '/payroll/leave-requests',
    steps: [
      { actor: 'پرسنل', action: 'درخواست ثبت کن', icon: User, color: 'slate', target: 'کارتابل سرپرست' },
      { actor: 'سرپرست کارگاه', action: 'تأیید اول کن', icon: CheckCircle2, color: 'amber', target: 'کارتابل منابع انسانی' },
      { actor: 'منابع انسانی', action: 'تأیید نهایی کن', icon: CheckCircle2, color: 'cyan', target: 'کارتابل حسابداری' },
      { actor: 'حسابدار', action: 'پرداخت را ثبت کن', icon: Wallet, color: 'blue', target: 'پرداخت‌شده' },
    ],
    onApprove: [
      'درخواست به مرحله‌ی بعد منتقل می‌شود.',
      'در محاسبه‌ی حقوق ماهانه لحاظ می‌شود.',
    ],
    onReject: [
      'وضعیت درخواست «ردشده» می‌شود.',
      'به درخواست‌کننده اطلاع داده می‌شود.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های تعدیل و انبار
  // ═══════════════════════════════════════════════════════
  {
    key: 'adjustment',
    title: 'تعدیل صورت‌وضعیت پیمانکار',
    description: 'محاسبه‌ی تعدیل بر اساس شاخص‌های تعدیل (مصالح یا دستمزد) و ثبت سند خودکار.',
    icon: FileCheck2,
    color: 'amber',
    route: '/accounting/adjustments',
    steps: [
      { actor: 'مدیر پروژه', action: 'شاخص تعدیل (مصالح یا دستمزد) هر ماه را ثبت کن', icon: ClipboardList, color: 'amber', target: 'شاخص تعدیل' },
      { actor: 'حسابدار', action: 'تعدیل را روی صورت‌وضعیت محاسبه کن', icon: FileCheck2, color: 'slate', target: 'پیش‌نویس' },
      { actor: 'مدیر مالی', action: 'محاسبه را تأیید کن', icon: CheckCircle2, color: 'emerald', target: 'تأییدشده' },
      { actor: 'حسابدار', action: 'سند تعدیل را ثبت کن', icon: FileText, color: 'blue', target: 'سند تعدیل' },
    ],
    onApprove: [
      'ابتدا باید شاخص تعدیل ماه‌های مورد نظر در سیستم ثبت شده باشد.',
      'دسته‌ی تعدیل یا «مصالح» است یا «دستمزد».',
      'سند تعدیل بین حساب تعدیل پرداختنی و هزینه‌ی تعدیل ثبت می‌شود.',
      'باگ شناخته‌شده: ضریب پیش‌فرض ۱ است، پس مبلغ تعدیل ممکن است برابر مبلغ پایه بماند.',
      'بین مرحله‌ی تأیید و ثبت سند، می‌توانی محاسبه را ویرایش کنی.',
    ],
    onReject: [
      'اگر شاخص ماه مقصد ثبت نشده باشد، محاسبه رد می‌شود.',
      'اگر محاسبه تأیید شده باشد، فقط با ابطال می‌توان آن را تغییر داد.',
      'محاسبه‌ی پیش‌نویس قابل حذف است.',
    ],
  },
  {
    key: 'goods-issue',
    title: 'حواله انبار',
    description: 'خروج کالا از انبار به کارگاه — کاهش موجودی و ثبت خودکار سند مصرف.',
    icon: PackagePlus,
    color: 'indigo',
    route: '/warehouse/issues',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'حواله را با ردیف‌های کالا ثبت کن', icon: User, color: 'slate', target: 'پیش‌نویس' },
      { actor: 'انباردار', action: 'حواله را تأیید و نهایی کن', icon: CheckCircle2, color: 'amber', target: 'نهایی' },
      { actor: 'سیستم', action: 'موجودی انبار کم می‌شود، حرکت انبار ثبت می‌شود و سند مصرف ساخته می‌شود', icon: FileText, color: 'emerald', target: 'سند خودکار مصرف' },
    ],
    onApprove: [
      'مراحل: پیش‌نویس ← ارسال‌شده ← تأییدشده ← نهایی.',
      'سند خودکار: حساب مصرف (بر اساس پروژه و ردیف WBS) بدهکار، حساب انبار بستانکار.',
      'کاهش موجودی بر اساس روش FIFO یا میانگین انجام می‌شود (طبق تنظیمات).',
      'برای مشاهده‌ی ریزگردش کالا، از صفحه‌ی «کاردکس» استفاده کن.',
      'باگ شناخته‌شده: بعد از نهایی‌سازی، پاسخ سرور خالی برمی‌گردد ولی سند ثبت می‌شود.',
    ],
    onReject: [
      'اگر حواله تأیید نشده باشد، موجودی کاهش نمی‌یابد.',
      'بعد از نهایی‌سازی، ابطال فقط با سند معکوس ممکن است.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های خرید و تدارکات
  // ═══════════════════════════════════════════════════════
  {
    key: 'purchase-request',
    title: 'درخواست خرید',
    description: 'درخواست خرید کالا توسط کاربر، تأیید مدیر و تبدیل خودکار به دستور خرید.',
    icon: ShoppingCart,
    color: 'blue',
    route: '/procurement/requests',
    steps: [
      { actor: 'کاربر', action: 'درخواست خرید ثبت کن', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر', action: 'تأیید یا رد کن', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'به‌طور خودکار یک دستور خرید می‌سازد و به کارپرداز اختصاص می‌دهد', icon: FileText, color: 'emerald', target: 'کارتابل کارپرداز' },
      { actor: 'کارپرداز', action: 'تأمین‌کننده و قیمت‌ها را وارد کن', icon: ShoppingBag, color: 'indigo', target: 'دستور خرید نهایی' },
    ],
    onApprove: [
      'وضعیت درخواست بعد از تأیید «سفارش‌شده» می‌شود.',
      'سیستم به‌طور خودکار یک دستور خرید با کد «PO» می‌سازد.',
      'دستور خرید بر اساس نقش، به یک کارپرداز اختصاص می‌یابد.',
      'تأمین‌کننده خالی است و باید توسط کارپرداز پر شود.',
    ],
    onReject: [
      'وضعیت درخواست «ردشده» می‌شود.',
      'دلیل رد برای درخواست‌کننده ارسال می‌شود.',
      'حذف درخواست فقط در وضعیت پیش‌نویس ممکن است.',
    ],
  },
  {
    key: 'purchase-order',
    title: 'دستور خرید',
    description: 'دستور خرید پس از تأیید درخواست خرید خودکار ساخته می‌شود و نیازی به تأیید مجدد ندارد.',
    icon: ShoppingBag,
    color: 'orange',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'دستور خرید خودکار از درخواست تأییدشده بساز', icon: FileText, color: 'emerald' },
      { actor: 'کارپرداز', action: 'تأمین‌کننده و قیمت‌ها را کامل کن', icon: ShoppingBag, color: 'indigo', target: 'دستور خرید نهایی' },
      { actor: 'کارپرداز', action: 'دستور را به تأمین‌کننده بفرست', icon: Send, color: 'amber', target: 'ثبت رسید انبار' },
      { actor: 'انباردار', action: 'پس از دریافت کالا، رسید انبار ثبت کن', icon: PackagePlus, color: 'violet' },
    ],
    onApprove: [
      'بعد از ارسال، وضعیت دستور «ارسال‌شده» می‌شود.',
      'پس از دریافت کالا، انباردار رسید ثبت می‌کند.',
      'موجودی انبار خودکار زیاد می‌شود.',
    ],
    onReject: [
      'حذف دستور خرید فقط در وضعیت پیش‌نویس ممکن است.',
      'پس از ثبت رسید انبار، دستور خرید قابل ابطال نیست.',
    ],
  },
  {
    key: 'goods-receipt',
    title: 'رسید انبار',
    description: 'ثبت دریافت کالا از تأمین‌کننده یا کارگاه.',
    icon: PackagePlus,
    color: 'violet',
    route: '/warehouse/receipts',
    steps: [
      { actor: 'انباردار', action: 'رسید را ثبت کن', icon: User, color: 'slate', target: 'کارتابل سرپرست کارگاه' },
      { actor: 'سرپرست کارگاه', action: 'دریافت را تأیید کن', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'رسید را نهایی کن، موجودی انبار زیاد شود و سند خودکار ثبت شود', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'بعد از تأیید، وضعیت رسید «نهایی» می‌شود.',
      'موجودی انبار به اندازه‌ی ردیف‌ها زیاد می‌شود.',
      'یک حرکت انبار برای هر ردیف ثبت می‌شود.',
      'سند خودکار رسید انبار ساخته می‌شود.',
    ],
    onReject: [
      'وضعیت رسید «لغوشده» می‌شود.',
      'ثبت نهایی انجام نمی‌شود.',
      'باگ شناخته‌شده: بعد از حذف نرم رسید، حرکات انبار ممکن است یتیم بمانند.',
    ],
  },
  {
    key: 'subcontractor-statement',
    title: 'صورت‌وضعیت پیمانکار',
    description: 'ثبت صورت‌وضعیت پیمانکاران جزء توسط سرپرست کارگاه و تأیید مدیر پروژه و مدیر ارشد.',
    icon: FileText,
    color: 'indigo',
    route: '/payroll/subcontractor-statements',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'صورت‌وضعیت را با ردیف‌های WBS ثبت کن', icon: User, color: 'slate', target: 'کارتابل مدیر پروژه' },
      { actor: 'مدیر پروژه', action: 'پیوست نقشه و تأیید کن', icon: CheckCircle2, color: 'indigo', target: 'کارتابل مدیر ارشد' },
      { actor: 'مدیر ارشد', action: 'تأیید نهایی کن', icon: CheckCircle2, color: 'emerald', target: 'کارتابل حسابداری' },
      { actor: 'حسابدار', action: 'پرداخت را ثبت کن', icon: Wallet, color: 'blue', target: 'پرداخت‌شده' },
    ],
    onApprove: [
      'مراحل: پیش‌نویس ← ارسال‌شده ← تأییدشده ← پرداخت‌شده.',
      'در هر مرحله، تأییدکننده می‌تواند فایل پیوست اضافه کند.',
      'بعد از تأیید نهایی، صورت‌وضعیت به کارتابل حسابداری می‌رود.',
      'نکته‌ی مهم: فیلد «شناسه قرارداد» را نفرست؛ این فیلد به قرارداد حقوقی وصل می‌شود نه قرارداد پروژه.',
      'سند خودکار: هزینه‌ی پیمانکاری بدهکار، حساب پرداختنی پیمانکار بستانکار.',
    ],
    onReject: [
      'وضعیت صورت‌وضعیت «ردشده» می‌شود.',
      'دلیل رد برای سرپرست کارگاه نمایش داده می‌شود.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های کارگاه و بودجه
  // ═══════════════════════════════════════════════════════
  {
    key: 'daily-report',
    title: 'گزارش روزانه کارگاه',
    description: 'ثبت وقایع روزانه‌ی کارگاه و دریافت تأیید سرپرست.',
    icon: ClipboardList,
    color: 'amber',
    route: '/site-ops/daily-reports',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'گزارش روزانه را ثبت کن', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر پروژه', action: 'گزارش را تأیید کن', icon: CheckCircle2, color: 'indigo', target: 'تأییدشده' },
      { actor: 'سیستم', action: 'گزارش به‌عنوان سابقه‌ی رسمی کارگاه ثبت می‌شود', icon: FileText, color: 'emerald', target: 'سابقه‌ی کارگاه' },
    ],
    onApprove: [
      'بعد از تأیید، وضعیت گزارش «تأییدشده» می‌شود.',
      'از این گزارش برای تحلیل‌های کارگاهی استفاده می‌شود.',
    ],
    onReject: [
      'وضعیت گزارش «ردشده» می‌شود.',
      'سرپرست باید دلایل را اصلاح کند و دوباره بفرستد.',
      'باگ شناخته‌شده: پیام تأیید ممکن است گمراه‌کننده باشد.',
    ],
  },
  {
    key: 'budget-check',
    title: 'کنترل بودجه در تأیید دستور خرید',
    description: 'هنگام تأیید دستور خرید، مجموع تعهدات و مبالغ واقعی با بودجه‌ی ردیف WBS مقایسه می‌شود.',
    icon: ClipboardList,
    color: 'amber',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'بودجه، تعهدات و مبالغ واقعی را جمع می‌زند', icon: ClipboardList, color: 'slate', target: 'بررسی آستانه' },
      { actor: 'سیستم', action: 'مجموع را با بودجه (به‌علاوه‌ی آستانه) مقایسه می‌کند', icon: FileCheck2, color: 'amber', target: 'هشدار یا تأیید' },
      { actor: 'مدیر', action: 'با وجود هشدار، دستور خرید را تأیید می‌کند', icon: CheckCircle2, color: 'emerald', target: 'دستور خرید تأییدشده' },
    ],
    onApprove: [
      'بودجه از ردیف WBS خوانده می‌شود.',
      'تعهدات = مجموع دستورهای خرید تأییدشده روی همان ردیف WBS.',
      'مبالغ واقعی = مجموع فاکتورهای خرید روی همان ردیف WBS.',
      'آستانه‌ی پیش‌فرض ۱۰٪ است.',
      'اگر مجموع از آستانه بگذرد، هشدار نمایش داده می‌شود.',
    ],
    onReject: [
      'اگر تأیید نکنی، دستور خرید در وضعیت پیش‌نویس باقی می‌ماند.',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // گردش‌های دارایی، خطا و ابزارها
  // ═══════════════════════════════════════════════════════
  {
    key: 'fixed-asset',
    title: 'دارایی ثابت از فاکتور خرید',
    description: 'در فاکتور خرید، اقلامی که «دارایی ثابت» علامت خورده‌اند به‌طور خودکار به دارایی ثابت تبدیل می‌شوند.',
    icon: Package,
    color: 'violet',
    route: '/procurement/invoices',
    steps: [
      { actor: 'کاربر', action: 'فاکتور را با تیک «دارایی ثابت» روی اقلام ثبت کن', icon: User, color: 'slate', target: 'پیش‌نویس' },
      { actor: 'حسابدار', action: 'فاکتور را تأیید کن', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'دارایی ثابت و سند خودکار بساز', icon: FileText, color: 'emerald', target: 'دارایی ثابت جدید' },
    ],
    onApprove: [
      'برای هر قلمی که «دارایی ثابت» علامت خورده، یک دارایی ثابت ساخته می‌شود.',
      'عمر مفید پیش‌فرض ۱۲۰ ماه است و روی هر ردیف قابل تغییر است.',
      'حساب‌های دارایی و استهلاک از نگاشت حساب‌ها خوانده می‌شوند.',
      'کد دارایی ثابت با پیشوند «FA» تولید می‌شود.',
      'سند خرید به حساب دارایی بدهکار می‌شود، نه هزینه.',
    ],
  },
  {
    key: 'failed-forwardings',
    title: 'صندوق خطای ارسال گزارش روزانه',
    description: 'ردیف‌هایی که در ارسال به واحد مقصد خطا خورده‌اند و باید دوباره تلاش شوند.',
    icon: FileWarning,
    color: 'red',
    route: '/site-ops/failed-forwardings',
    steps: [
      { actor: 'سیستم', action: 'برای ارسال ردیف‌ها تلاش می‌کند', icon: Send, color: 'slate', target: 'ثبت نتیجه' },
      { actor: 'سیستم', action: 'در صورت خطا، ردیف با پیام خطا در صندوق ذخیره می‌شود', icon: XCircle, color: 'red', target: 'صندوق خطا' },
      { actor: 'کاربر', action: 'از صندوق، دکمه‌ی «تلاش مجدد» را می‌زند', icon: CheckCircle2, color: 'emerald', target: 'تلاش مجدد' },
    ],
    onApprove: [
      'ردیف‌ها به چند بخش مختلف ارسال می‌شوند: کارکرد روزانه، رسید انبار، حواله انبار، گزارش روزانه‌ی ماشین‌آلات، درخواست خرید، درخواست تنخواه.',
      'هر ردیف با یک کلید یکتا ذخیره می‌شود.',
      'در صورت موفقیت مجدد، ردیف از صندوق حذف می‌شود.',
    ],
  },
  {
    key: 'telegram-alerts',
    title: 'هشدار تلگرام در مانیتورینگ',
    description: 'ارسال پیام تلگرام در صورت خطا یا راه‌اندازی مجدد سرویس‌ها.',
    icon: Send,
    color: 'cyan',
    steps: [
      { actor: 'سیستم', action: 'هر ۵ دقیقه سرویس‌ها را بررسی می‌کند', icon: ClipboardList, color: 'slate', target: 'لاگ' },
      { actor: 'سیستم', action: 'در صورت خطا یا راه‌اندازی مجدد، پیام تلگرام می‌فرستد', icon: Send, color: 'amber' },
    ],
    onApprove: [
      'سطوح هشدار: خطا، هشدار، راه‌اندازی مجدد.',
      'هر پیام شامل نام کامپیوتر، سطح و متن خطاست.',
      'فاصله‌ی حداقل بین پیام‌های هم‌سطح رعایت می‌شود.',
    ],
  },
  {
    key: 'custom-units',
    title: 'واحدهای قابل تعریف',
    description: 'تعریف واحد جدید در تنظیمات و استفاده‌ی فوری از آن در همه‌ی فرم‌ها.',
    icon: Ruler,
    color: 'blue',
    route: '/settings/units',
    steps: [
      { actor: 'مدیر سیستم', action: 'واحد جدید را در تنظیمات بساز', icon: User, color: 'slate', target: 'ذخیره در سیستم' },
      { actor: 'سیستم', action: 'واحد جدید به‌طور خودکار در فرم‌ها بارگذاری می‌شود', icon: ClipboardList, color: 'amber' },
      { actor: 'کاربر', action: 'در فرم کالا، ردیف WBS، درخواست خرید، دستور خرید و فاکتور خرید از آن استفاده کن', icon: CheckCircle2, color: 'emerald' },
    ],
    onApprove: [
      'واحدهای سیستمی (عدد، کیلوگرم، تن، متر و ...) قابل حذف نیستند — فقط می‌توان غیرفعالشان کرد.',
      'واحدهای کاربری اگر در اسناد استفاده نشده باشند، قابل حذف هستند.',
      'کش واحدها مشترک است و یک بار از سرور خوانده می‌شود.',
    ],
  },
];

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
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand-600" />
            راهنمای گردش کارها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            راهنمای گام‌به‌گام کارهای اصلی سیستم — از ثبت تا تأیید و اقدام نهایی
          </p>
        </div>
        <PrintButton contentRef={printRef} documentTitle="راهنمای گردش کارها" />
      </div>

      <div ref={printRef} className="space-y-6">
        <PrintHeader title="راهنمای گردش کارها" subtitle="Epsay Accounting — راهنمای کارها" />

        <div className="card p-5 bg-gradient-to-bl from-blue-50 to-white border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-1">چطور از این راهنما استفاده کنید</h3>
              <p className="text-sm text-blue-700 leading-6">
                برای هر کار، مراحل به ترتیب شماره آمده است. در پایان هر کارت، دو بخش می‌بینی:
                «نکات و پس از تأیید» برای چیزهایی که بعد از تأیید باید بدانی،
                و «محدودیت‌ها و پس از رد» برای چیزهایی که بعد از رد باید انجام دهی.
                برای رفتن به صفحه‌ی هر کار، دکمه‌ی «مشاهده» را بزن.
                موارد علامت‌گذاری‌شده با نشان هشدار، نکته‌ی مهم یا باگ شناخته‌شده هستند.
              </p>
            </div>
          </div>
        </div>

        {WORKFLOWS.map((wf) => {
          const Icon = wf.icon;
          const colors = COLOR_MAP[wf.color] || COLOR_MAP.slate;
          return (
            <div key={wf.key} className="card overflow-hidden">
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

              <div className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">مراحل کار</h3>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t">
                  {wf.onApprove && wf.onApprove.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">نکات و پس از تأیید</span>
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
                        <span className="text-xs font-bold text-red-800">محدودیت‌ها و پس از رد</span>
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

        <div className="card p-4 bg-slate-50 text-center">
          <p className="text-xs text-slate-500">
            این راهنما برای درک بهتر کارهای سیستم ساخته شده است.
            موارد علامت‌گذاری‌شده با نشان هشدار، نکته‌ی مهم یا باگ شناخته‌شده‌ای هستند که در جلسه‌های قبل کشف شدند.
          </p>
        </div>
      </div>
    </div>
  );
}