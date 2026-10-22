import { useState } from 'react';
import {
  BookOpen,
  Warehouse,
  Receipt,
  PieChart,
  Settings,
  Users,
  ChevronDown,
  ShieldAlert,
  ArrowLeftRight,
  Search,
  Building2,
  BookOpenCheck,
  FileSignature,
  ShoppingCart,
  HardHat,
  Landmark,
  ChevronLeft,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Calculator,
  FileText,
  FolderKanban,
  Coins,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
}

interface GuideSection {
  title: string;
  steps: string[];
  accountingNote?: string;
  tip?: string;
}

interface GuideChapter {
  id: string;
  title: string;
  icon: any;
  badge: string;
  description: string;
  sections: GuideSection[];
}

const CHAPTERS: GuideChapter[] = [
  {
    id: 'overview',
    title: '۱. معرفی سامانه، معماری نقش‌محور و سطوح دسترسی',
    icon: Building2,
    badge: 'پایه و معماری',
    description: 'آشنایی کامل با معماری ۶ نقش اصلی سیستم، ورودی اختصاصی هر نقش، کنترل دسترسی پروژه‌ای (RBAC) و داشبورد مدیریتی.',
    sections: [
      {
        title: 'تفکیک ۶ نقش کاربری اصلی و صفحات ورودی (Landing Pages)',
        steps: [
          '۱. مدیرعامل (CEO): هدایت به داشبورد ارشد (/dashboard) — مشاهده شاخص‌های کلیدی (KPI)، صورت سود و زیان، وضعیت سهم شرکا و ارزیابی ریسک.',
          '۲. مدیر مالی (CFO): هدایت به داشبورد مالی (/dashboard) — مدیریت کدینگ، تراز آزمایشی ۴ و ۸ ستونی، بستن حساب‌ها، قفل دوره و خزانه‌داری.',
          '۳. حسابدار (Accountant): هدایت به ثبت اسناد (/accounting/journals) — ورود روزانه اسناد دوبل عادی و اکسلی، فاکتورهای خرید و فروش، تنخواه و حقوق.',
          '۴. سرپرست کارگاه (Site Manager): هدایت به گزارش روزانه (/site-ops/daily-reports) — ثبت گزارشات روزانه کارگاه، درخواست خرید کالا و کارکرد ماشین‌آلات.',
          '۵. انباردار (Warehouse Keeper): هدایت به رسید انبار (/warehouse/receipts) — رسید ورود مصالح، حواله خروج، انبارگردانی و کاردکس ریالی.',
          '۶. کارپرداز (Procurement Officer): هدایت به سفارشات خرید (/procurement/orders) — مشاهده سفارشات اختصاص‌یافته و ثبت فاکتورهای تامین‌کنندگان.',
        ],
        tip: 'سیستم به طور خودکار پس از ورود، شما را به صفحه اختصاصی نقش خود هدایت می‌کند.',
      },
      {
        title: 'محدودیت دسترسی پروژه‌ای (Project-Scoped Security)',
        steps: [
          'هر کاربر تنها اطلاعات، اسناد، فاکتورها و انبار مربوط به پروژه‌هایی را می‌بیند که مدیر سیستم در بخش «مدیریت کاربران» به او تخصیص داده است.',
          'مدیران ارشد (Super Admin) و مدیر مالی دسترسی سراسری به تمام پروژه‌ها دارند.',
        ],
      },
    ],
  },
  {
    id: 'accounting-core',
    title: '۲. کدینگ حسابداری ۴ سطحی، ثبت اسناد دوبل و ورودی اکسلی',
    icon: BookOpenCheck,
    badge: 'هسته مالی',
    description: 'مدیریت استاندارد کدینگ حسابداری عمرانی، ثبت اسناد دوبل عادی و شبکه‌ای (اکسلی)، دفاتر رسمی و ترازهای آزمایشی.',
    sections: [
      {
        title: 'ساختار کدینگ ۴ سطحی حسابداری پروژه‌ای',
        steps: [
          'گروه حساب‌ها (۱ رقمی): ۱ دارایی جاری، ۲ بدهی جاری، ۳ حقوق صاحبان سهام، ۴ درآمدها، ۵ بهای تمام‌شده، ۶ هزینه‌های عمومی.',
          'حساب‌های کل (۲ رقمی): ۱.۱ نقد و بانک، ۱.۲ حساب‌های دریافتنی، ۵.۱ بهای تمام‌شده پروژه و...',
          'حساب‌های معین (۴ رقمی): ۱.۱.۱ بانک‌ها، ۱.۱.۵ موجودی مصالح پای‌کار، ۵.۱.۱ مصالح مصرفی، ۵.۱.۲ دستمزد مستقیم، ۵.۱.۳ پیمانکاران جزء.',
          'حساب‌های تفصیلی (۶ تا ۸ رقمی): بانک ملی شعبه مرکزی، پروژه برج تجاری، شخص/تامین‌کننده الف.',
        ],
        accountingNote: 'نمونه کدینگ معین: ۵.۱.۱ (مصالح مصرفی پروژه) / ۵.۱.۳ (هزینه پیمانکاران جزء)',
      },
      {
        title: 'ثبت سند حسابداری (نمای عادی و ورود اکسلی)',
        steps: [
          'ورود به «حسابداری مالی» ← «اسناد حسابداری» ← دکمه «سند جدید».',
          'ثبت سند سریع با جدول اکسلی: کلیک روی دکمه «نمایش جدول اکسلی» برای ورود شبکه‌ای داده‌ها.',
          'کلیدهای Tab و Enter برای حرکت سریع بین سلول‌ها، سرچ درجا در کدینگ حساب و قابلیت Paste مستقیم داده‌ها از نرم‌افزار Microsoft Excel.',
          'شرط تراز بودن اجباری: جمع مبالغ بدهکار و بستانکار باید دقیقاً برابر باشد (اختلاف = ۰).',
        ],
        accountingNote: 'آرتیکل خرید نقد مصالح: بدهکار: موجودی مصالح پای‌کار (۱.۱.۵) / بستانکار: بانک (۱.۱.۱)',
      },
      {
        title: 'دفاتر رسمی، تراز آزمایشی و قفل دوره مالی',
        steps: [
          'دفتر روزنامه رسمی و دفتر کل پیشرفته با فیلتر پروژه و تاریخ.',
          'تراز آزمایشی ۴ و ۸ ستونی جهت کنترل صحت موازنه حساب‌ها و مانده‌ها.',
          'قفل دوره مالی: از بخش «تنظیمات» ← «بستن حساب‌ها»، دوره مالی را قفل کنید تا امکان ثبت یا ویرایش سند در آن بازه مسدود شود.',
        ],
      },
    ],
  },
  {
    id: 'contracting-models',
    title: '۳. مدل‌های ۳گانه پیمانکاری، صورت‌وضعیت‌ها و رقیق‌سازی دلاری شرکا',
    icon: FileSignature,
    badge: 'مدل‌های تجاری',
    description: 'شیوه‌نامه جامع اجرای مدل‌های پیمانکاری ارشد (الف و ب) و ساخت/مشارکت با ورود شریک بر اساس نرخ دلار (مدل ج).',
    sections: [
      {
        title: 'مدل الف: پیمانکاری ارشد با صورت‌وضعیت و هزینه‌های عبوری (Pass-Through)',
        steps: [
          'ثبت صورت‌وضعیت کارفرما در بخش «فروش و صورت‌وضعیت» همراه با ضرایب پیمان (بالاسری، منطقه، تجهیز).',
          'هزینه‌های عبوری (Pass-Through): هزینه‌هایی که کارفرما مستقیم می‌پردازد. در فرم هزینه، گزینه «هزینه کارفرما» را بزنید. آرتیکل خودکار: بدهکار: کارفرما / بستانکار: تامین‌کننده. این هزینه وارد سود و زیان شرکت نمی‌شود.',
          'تسویه سه‌جانبه (Tripartite Settlement): واریز مستقیم وجه از کارفرما به زیرپیمانکار. ثبت سند اتوماتیک: بدهکار: تامین‌کننده/زیرپیمانکار (کاهش بستانکاری) / بستانکار: کارفرما (کاهش طلب).',
        ],
        accountingNote: 'تسویه سه‌جانبه: بدهکار: حساب‌های پرداختنی زیرپیمانکار (۲.۱.x) / بستانکار: حساب‌های دریافتنی کارفرما (۱.۱.۲)',
      },
      {
        title: 'مدل ب: پیمانکاری ارشد با مبلغ ثابت ماهانه (Lump-Sum)',
        steps: [
          'ثبت درآمد ثابت توافقی ماهانه کارفرما در انتهای هر ماه.',
          'ثبت هزینه‌های واقعی کارگاه در حساب‌های ۵.۱ (بهای تمام‌شده پروژه).',
          'محاسبه سود و زیان ماهانه از تفاضل درآمد ثابت توافقی و هزینه‌های واقعی ثبت‌شده.',
        ],
      },
      {
        title: 'مدل ج: ساخت/مشارکت در ساخت و ورود شریک جدید (USD Equity Dilution)',
        steps: [
          'ثبت نرخ روز دلار بازار آزاد در بخش «سرمایه و شرکا» (تنها به‌صورت دستی ثبت می‌شود).',
          'ثبت آورده ریالی شریک جدید و تبدیل خودکار به معادل دلاری.',
          'فرمول محاسبه سهم پویای شرکا: سهم = آورده دلاری جدید ÷ (ارزش دلاری قبلی پروژه + آورده دلاری جدید).',
          'رقیق‌سازی پویای شرکا (Dynamic Dilution): سهم شرکای قبلی به تناسب رقیق شده و مجموع سهم‌ها همواره دقیقاً ۱۰۰.۰۰٪ باقی می‌ماند.',
          'حفظ کامل تاریخچه سهم‌الشرکه همراه با ثبت سند افزایش سرمایه.',
        ],
        accountingNote: 'فرمول ریاضی: Share % = USD_Contribution / (Project_USD_Value + USD_Contribution)',
      },
    ],
  },
  {
    id: 'procurement-warehouse',
    title: '۴. چرخه تدارکات، خرید، انبارداری و کاردکس مصالح',
    icon: ShoppingCart,
    badge: 'تامین و انبار',
    description: 'گردش‌کار جامع از درخواست خرید کارگاه تا رسید انبار، حواله مصرف پروژه، انبارگردانی و کاردکس ریالی.',
    sections: [
      {
        title: 'چرخه کامل تدارکات و خرید (Procurement Lifecycle)',
        steps: [
          '۱. درخواست خرید (PR): ثبت توسط سرپرست یا صدور خودکار از گزارش روزانه کارگاه.',
          '۲. سفارش خرید (PO): بررسی درخواست توسط مدیر تامین و ارجاع به کارپرداز.',
          '۳. فاکتور خرید: ثبت فاکتور نهایی همراه با ارزش‌افزوده و مالیات.',
          '۴. پرداخت به تامین‌کنندگان: ثبت سند پرداخت از طریق بانک، چک یا تنخواه.',
        ],
      },
      {
        title: 'انبارداری، حواله مصرف و کاردکس ریالی',
        steps: [
          'رسید ورود کالا (Goods Receipt): ورود مصالح به انبار بر اساس فاکتور خرید و به‌روزرسانی میانگین موزون قیمت.',
          'حواله خروج کالا (Goods Issue): تخصیص و مصرف مصالح در پروژه. آرتیکل خودکار: بدهکار: بهای تمام‌شده مصالح (۵.۱.۱) / بستانکار: موجودی مصالح پای‌کار (۱.۱.۵).',
          'انتقال بین انبارها: جابجایی کالا بین انبار مرکزی و انبار کارگاه‌ها.',
          'انبارگردانی: ثبت شمارش واقعی، انطباق با سیستم و صدور سند کسری/اضافی انبار.',
          'کاردکس ریالی و تعدادی: مشاهده دقیق گردش ورود، خروج و مانده هر کالا.',
        ],
      },
    ],
  },
  {
    id: 'site-payroll',
    title: '۵. عملیات کارگاه و حقوق و دستمزد با ذخایر ماهانه',
    icon: HardHat,
    badge: 'اجرایی و حقوق',
    description: 'گزارش روزانه سرپرست کارگاه، سیستم فوروارد هوشمند، لیست حقوق و محاسبه اتومات ذخیره عیدی و سنوات.',
    sections: [
      {
        title: 'گزارش روزانه کارگاه و فوروارد خودکار',
        steps: [
          'ثبت گزارش روزانه توسط سرپرست کارگاه: آمار پرسنل، مصالح ورودی، پیشرفت فیزیکی و ماشین‌آلات.',
          'فوروارد هوشمند: با تایید گزارش توسط مدیر، سیستم به طور خودکار درخواست‌های خرید نیازپایه و کارکرد پرسنل/تجهیزات را صادر می‌کند.',
        ],
      },
      {
        title: 'حقوق و دستمزد و ذخیره‌گیری ماهانه عیدی و سنوات',
        steps: [
          'تعریف دوره حقوق و ورود کارکرد ماهانه پرسنل (ساعات کار، اضافه کاری، کسر کار).',
          'محاسبه خودکار حقوق پایه، حق مسکن، بن کارگری، حق اولاد، بیمه و مالیات.',
          'ذخیره‌گیری اتوماتیک ماهانه:',
          ' • ذخیره عیدی ماهانه: (۲ × حقوق پایه) ÷ ۱۲',
          ' • ذخیره سنوات ماهانه: (۱ × حقوق پایه) ÷ ۱۲',
          'آرتیکل خودکار هنگام تایید حقوق: بدهکار: هزینه عیدی/سنوات (۶.۱.x) / بستانکار: ذخیره جاری عیدی و سنوات (۲.۱.x).',
        ],
        accountingNote: 'آرتیکل ذخیره: بدهکار: هزینه عیدی و سنوات پرسنل (۶.۱.x) / بستانکار: ذخیره عیدی و سنوات (۲.۱.x)',
      },
    ],
  },
  {
    id: 'treasury-reports',
    title: '۶. خزانه‌داری، صورت‌های مالی، اموال و پشتیبان‌گیری',
    icon: Landmark,
    badge: 'نقدینگی و مدیریت',
    description: 'مدیریت بانک‌ها، چک‌ها، تنخواه‌گردان، صورت‌های مالی جامع، لاگ‌های امنیتی و بکاپ خودکار.',
    sections: [
      {
        title: 'خزانه‌داری، چک و تنخواه‌گردان',
        steps: [
          'بانک‌ها و صندوق‌ها: ثبت کلیه درآمدهای نقدی و حواله‌های بانکی.',
          'چرخه مدیریت چک: دریافت/پرداخت، واگذاری به بانک، وصول، نقد یا برگشت چک.',
          'تنخواه‌گردان پروژه‌ها: ثبت صورت هزینه‌های تنخواه با امکان تعیین «قابل مطالبه از کارفرما» و درصد مدیریت پیمان.',
        ],
      },
      {
        title: 'صورت‌های مالی جامع و گزارشات تحلیلی',
        steps: [
          'صورت سود و زیان (P&L): تفکیک سود عملیاتی پروژه، هزینه‌های ستادی و هزینه‌های عبوری.',
          'ترازنامه مالی (Balance Sheet): تراز کامل دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام.',
          'گزارش تحلیلی بهای تمام‌شده پروژه (WIP) و گزارش سنی بدهکاران/بستانکاران (AP/AR Aging).',
        ],
      },
      {
        title: 'امنیت، بکاپ و پشتیبان‌گیری خودکار',
        steps: [
          'ردپای عملیات (Audit Logs): ثبت تمامی تغییرات اسناد با کد کاربر، آی‌پِی و زمان دقیق.',
          'ورود و خروج گروهی اکسل (Data I/O): خروجی گرفتن و بارگذاری انبوه داده‌ها.',
          'پشتیبان‌گیری اتوماتیک دیتابیس (DB Backup): زمان‌بندی روزانه و تست خودکار سلامت فایل بکاپ.',
        ],
      },
    ],
  },
];

const FAQS: FAQ[] = [
  { q: 'چگونه سند حسابداری ناتراز را اصلاح کنیم؟', a: 'در فرم ثبت سند، مبالغ بدهکار و بستانکار را بررسی کنید. تا زمانی که تفاضل جمع بدهکار و بستانکار صفر نشود، سیستم اجازه ثبت سند نهایی را نمی‌دهد.' },
  { q: 'هزینه عبوری (Pass-Through) چیست و چه تاثیری در صورت‌های مالی دارد؟', a: 'هزینه‌ای است که کارفرما مستقیماً پرداخت یا مدیریت می‌کند. در فرم هزینه گزینه «هزینه کارفرما» را بزنید. این هزینه فقط طلب از کارفرما و بدهی به تامین‌کننده را ثبت می‌کند و در سود و زیان شرکت اثر ندارد.' },
  { q: 'فرمول دقیق رقیق‌سازی سهم شرکا در مدل ج چیست؟', a: 'سهم شریک جدید = (آورده دلاری جدید ÷ (ارزش دلاری قبلی پروژه + آورده دلاری جدید)) × ۱۰۰. سهم بقیه شرکا به همین نسبت رقیق شده و مجموع سهم‌ها دقیقاً ۱۰۰.۰۰٪ باقی می‌ماند.' },
  { q: 'ذخیره عیدی و سنوات حقوق چگونه محاسبه می‌شود؟', a: 'در پایان هر ماه، معادل ۲/۱۲ حقوق پایه به عنوان ذخیره عیدی و ۱/۱۲ حقوق پایه به عنوان ذخیره سنوات در حساب‌های بدهی جاری منظور می‌گردد.' },
  { q: 'چگونه یک دوره مالی را قفل کنیم؟', a: 'از منوی تنظیمات ← بستن حساب‌ها و قفل دوره، دوره مالی مورد نظر را انتخاب و وضعیت آن را به «CLOSED» تغییر دهید.' },
];

export default function WorkflowsGuidePage() {
  const [activeChapter, setActiveChapter] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredChapters = CHAPTERS.map((ch) => {
    if (!searchQuery.trim()) return ch;
    const q = searchQuery.toLowerCase();
    const matchesTitle = ch.title.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q);
    const filteredSections = ch.sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.steps.some((s) => s.toLowerCase().includes(q)) ||
        sec.accountingNote?.toLowerCase().includes(q)
    );
    if (matchesTitle || filteredSections.length > 0) {
      return { ...ch, sections: filteredSections.length > 0 ? filteredSections : ch.sections };
    }
    return null;
  }).filter(Boolean) as GuideChapter[];

  const currentChapter = CHAPTERS.find((c) => c.id === activeChapter) || CHAPTERS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 animate-fade-in" dir="rtl">
      {/* Top Banner with all icons referenced explicitly */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-brand-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <BookOpen className="w-3.5 h-3.5 text-brand-300" />
              دفترچه راهنمای جامع و کامل کاربری (Master User Manual)
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-brand-400 shrink-0" />
              دفترچه راهنمای جامع راهبری سامانه حسابداری اپسای
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              آموزش کامل صفر تا صد راهبری نرم‌افزار، کدینگ حسابداری، مدل‌های ۳گانه پیمانکاری/مشارکتی، رقیق‌سازی دلاری شرکا، چرخه تدارکات، انبارداری و حقوق و دستمزد.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در تمام راهنماها..."
              className="w-full pr-10 pl-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Quick Navigation Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <Users className="w-3.5 h-3.5 text-blue-600" /> <span>۶ نقش کاربری</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <BookOpenCheck className="w-3.5 h-3.5 text-emerald-600" /> <span>کدینگ ۴ سطحی</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <FileSpreadsheet className="w-3.5 h-3.5 text-violet-600" /> <span>ورود اکسلی اسناد</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> <span>رقیق‌سازی دلاری</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <Warehouse className="w-3.5 h-3.5 text-cyan-600" /> <span>انبار و کاردکس</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <Receipt className="w-3.5 h-3.5 text-indigo-600" /> <span>صورت‌وضعیت</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <PieChart className="w-3.5 h-3.5 text-rose-600" /> <span>صورت‌های مالی</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shrink-0 shadow-sm">
          <Settings className="w-3.5 h-3.5 text-slate-600" /> <span>تنظیمات و امنیت</span>
        </div>
      </div>

      {/* Feature Highlights Grid using extra icons explicitly */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">هزینه‌های عبوری (Pass-Through)</div>
            <div className="text-[11px] text-slate-500">عدم تاثیر در سود و زیان شرکت</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">ذخیره عیدی و سنوات ماهانه</div>
            <div className="text-[11px] text-slate-500">محاسبه ۲/۱۲ عیدی و ۱/۱۲ سنوات</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">قفل دوره و قفل سال مالی</div>
            <div className="text-[11px] text-slate-500">جلوگیری از تغییر در اسناد بسته‌شده</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">کنترل دسترسی پروژه‌ای</div>
            <div className="text-[11px] text-slate-500">تفکیک کامل اطلاعات هر پروژه</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Chapter Selector */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-bold text-slate-500 px-3 py-1 flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-brand-600" />
            <span>فصل‌های دفترچه راهنما</span>
          </div>
          <div className="space-y-1">
            {CHAPTERS.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(ch.id)}
                  className={`w-full p-3.5 rounded-xl text-right transition-all flex items-start gap-3 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-brand-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug truncate">{ch.title}</div>
                    <div className={`text-xs mt-1 truncate ${isActive ? 'text-brand-100' : 'text-slate-400'}`}>
                      {ch.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chapters Content */}
        <div className="lg:col-span-3 space-y-6">
          {filteredChapters.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">موردی با عبارت «{searchQuery}» یافت نشد</p>
              <p className="text-xs text-slate-400 mt-1">لطفاً عبارات دیگری نظیر «صورت‌وضعیت»، «دلار»، «انبار» یا «حقوق» را جستجو کنید.</p>
            </div>
          ) : (
            (searchQuery ? filteredChapters : [currentChapter]).map((chapter) => {
              const Icon = chapter.icon;
              return (
                <div key={chapter.id} className="space-y-6">
                  {/* Chapter Header Card */}
                  <div className="card p-6 border-r-4 border-r-brand-600 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{chapter.title}</h2>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 font-semibold border border-brand-200">
                        {chapter.badge}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pt-1">{chapter.description}</p>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-4">
                    {chapter.sections.map((sec, idx) => (
                      <div key={idx} className="card p-5 space-y-4 hover:shadow-md transition-shadow">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                          <ChevronLeft className="w-4 h-4 text-brand-600 shrink-0" />
                          {sec.title}
                        </h3>

                        {/* Steps */}
                        <div className="space-y-2.5">
                          {sec.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>

                        {/* Accounting Note */}
                        {sec.accountingNote && (
                          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                            <Calculator className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold block mb-0.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>نکته حسابداری / آرتیکل دوبل مربوطه:</span>
                              </span>
                              <code className="font-mono dir-ltr block text-slate-800 bg-white/80 p-2 rounded border border-blue-200 mt-1">
                                {sec.accountingNote}
                              </code>
                            </div>
                          </div>
                        )}

                        {/* Tip */}
                        {sec.tip && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{sec.tip}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* FAQ Accordion Section */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-800">پرسش‌های متداول و راهنمای عملیاتی (FAQ)</h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="border border-slate-200/80 rounded-xl overflow-hidden transition-all">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full p-4 bg-slate-50/80 hover:bg-slate-100/80 text-right font-medium text-sm text-slate-800 flex items-center justify-between gap-3 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-brand-600 shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white border-t border-slate-100 text-sm text-slate-600 leading-relaxed animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="p-4 bg-slate-100/80 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>نسخه نهایی ۱.۰ — دفترچه راهنمای جامع راهبری سامانه حسابداری اپسای</span>
          </div>
        </div>
      </div>
    </div>
  );
}
