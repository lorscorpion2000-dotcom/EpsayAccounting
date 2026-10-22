import { useState } from 'react';
import {
  BookOpen,
  Search,
  Building2,
  BookOpenCheck,
  FileSignature,
  ShoppingCart,
  Warehouse,
  HardHat,
  Landmark,
  Receipt,
  PieChart,
  Settings,
  Users,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Calculator,
  ShieldAlert,
  ArrowLeftRight,
} from 'lucide-react';

interface GuideChapter {
  id: string;
  title: string;
  icon: any;
  badge?: string;
  description: string;
  sections: {
    title: string;
    steps: string[];
    accountingNote?: string;
    tip?: string;
  }[];
}

const CHAPTERS: GuideChapter[] = [
  {
    id: 'overview',
    title: '۱. معرفی سامانه و معماری نقش‌محور',
    icon: Building2,
    badge: 'پایه و دسترسی',
    description: 'آشنایی با ساختار ۶ نقش کاربری، ورودی نقش‌محور، داشبورد کارتابل و امنیت سطح پروژه.',
    sections: [
      {
        title: 'نقش‌های ۶گانه سیستم و صفحات ورودی اختصاصی',
        steps: [
          'مدیرعامل (CEO): دسترسی به داشبورد ارشد، شاخص‌های کلیدی (KPI)، سود و زیان پروژه‌ها و سهم شرکا.',
          'مدیر مالی (CFO): کنترل کامل دفاتر حسابداری، ترازها، خزانه‌داری، گزارش سنی مطالبات و قفل دوره‌ها.',
          'حسابدار (Accountant): ورود روزانه اسناد حسابداری، فاکتورها، دفتر روزنامه، تنخواه و حقوق دستمزد.',
          'سرپرست کارگاه (Site Manager): ورود به صفحه گزارش روزانه، درخواست خرید کارگاه و ماشین‌آلات.',
          'انباردار (Warehouse Keeper): ثبت رسید ورود کالا، حواله مصرف پروژه، کاردکس و انبارگردانی.',
          'کارپرداز (Procurement Officer): مشاهده سفارشات خرید اختصاص داده شده و ثبت فاکتورهای تامین.',
        ],
        tip: 'سیستم به صورت خودکار پس از ورود، شما را به صفحه اختصاصی نقش خود هدایت می‌کند.',
      },
      {
        title: 'کنترل دسترسی سطح پروژه (Project-Scoped Access)',
        steps: [
          'هر کاربر تنها اطلاعات و اسناد پروژه‌هایی را می‌بیند که مدیر سیستم در بخش «مدیریت کاربران» به او تخصیص داده است.',
          'مدیران ارشد (Super Admin) و مدیر مالی به تمام پروژه‌ها دسترسی جامع دارند.',
        ],
      },
    ],
  },
  {
    id: 'accounting-core',
    title: '۲. کدینگ حسابداری و اسناد دوبل',
    icon: BookOpenCheck,
    badge: 'هسته مالی',
    description: 'مدیریت کدینگ ۴ سطحی (گروه، کل، معین، تفصیلی)، ثبت اسناد دوبل و دفاتر رسمی.',
    sections: [
      {
        title: 'تعریف و اصلاح کدینگ حساب‌ها',
        steps: [
          'ورود به منوی «پایه‌ها» ← «کدینگ حساب‌ها».',
          'ساختار استاندارد حسابداری عمرانی: ۱ (دارایی جاری)، ۲ (بدهی جاری)، ۳ (حقوق صاحبان سهام)، ۴ (درآمد)، ۵ (بهای تمام‌شده پروژه)، ۶ (هزینه‌های عمومی).',
          'امکان افزودن حساب معین و تفصیلی جدید همراه با تعیین نوع تفصیلی (بانک، صندوق، تنخواه، شخص، پروژه).',
        ],
      },
      {
        title: 'ثبت سند حسابداری (نمای عادی و ورودی اکسلی)',
        steps: [
          'مراجعه به «حسابداری مالی» ← «اسناد حسابداری» ← دکمه «سند جدید».',
          'انتخاب تاریخ شمسی، پروژه مرتبط و ثبت ردیف‌های بدهکار و بستانکار.',
          'قابلیت ورود اکسلی: کلیک روی دکمه «جدول اکسلی» برای ورود سریع داده‌ها با کلیدهای Tab و Enter و امکان Paste مستقیم از نرم‌افزار Microsoft Excel.',
          'تراز بودن سند: مجموع مبالغ بدهکار و بستانکار باید کاملاً برابر باشد تا دکمه ثبت فعال گردد.',
        ],
        accountingNote: 'آرتیکل نمونه خرید مصالح نقد: بدهکار: موجودی مصالح پای‌کار (۱.۱.۵) / بستانکار: بانک (۱.۱.۱)',
      },
      {
        title: 'دفاتر رسمی، تراز آزمایشی و قفل دوره',
        steps: [
          'دفتر روزنامه و کل پیشرفته با فیلتر تاریخ و پروژه.',
          'تراز آزمایشی ۴ و ۸ ستونی جهت کنترل صحت موازنه حساب‌ها.',
          'قفل دوره مالی: از بخش تنظیمات ← «بستن حساب‌ها»، دوره مالی را قفل کنید تا امکان ویرایش یا ثبت سند جدید در آن تاریخ مسدود شود.',
        ],
      },
    ],
  },
  {
    id: 'contracting-models',
    title: '۳. مدل‌های ۳گانه پروژه و صورت‌وضعیت‌ها',
    icon: FileSignature,
    badge: 'تخصصی عمرانی',
    description: 'شیوه‌نامه کامل اجرای پیمانکاری ارشد (مدل الف و ب) و ساخت/مشارکت با ورود شریک (مدل ج).',
    sections: [
      {
        title: 'مدل الف: پیمانکاری ارشد با صورت‌وضعیت و هزینه‌های عبوری (Pass-Through)',
        steps: [
          'ثبت صورت‌وضعیت کارفرما در بخش «فروش و صورت‌وضعیت» ← «فاکتورها/صورت‌وضعیت‌ها».',
          'هزینه‌های عبوری (Pass-Through): هزینه‌هایی که کارفرما مستقیم می‌پردازد یا مدیریت می‌کند. در فرم هزینه، گزینه «هزینه کارفرما» را بزنید. آرتیکل خودکار: بدهکار: بدهی کارفرما / بستانکار: تامین‌کننده. این هزینه وارد سود و زیان شرکت نمی‌شود.',
          'تسویه سه‌جانبه (Tripartite Settlement): وقتی کارفرما مستقیماً پول را به حساب زیرپیمانکار یا فروشنده واریز می‌کند، از «صورت‌حساب کارفرما» گزینه «تسویه سه‌جانبه» را ثبت کنید. آرتیکل خودکار: بدهکار: تامین‌کننده/شخص (کاهش بستانکاری) / بستانکار: کارفرما (کاهش طلب).',
        ],
        accountingNote: 'تسویه سه‌جانبه: بدهکار: حساب‌های پرداختنی زیرپیمانکار (۲.۱.x) / بستانکار: حساب‌های دریافتنی کارفرما (۱.۱.۲)',
      },
      {
        title: 'مدل ب: پیمانکاری ارشد با مبلغ ثابت ماهانه (Lump-Sum)',
        steps: [
          'ثبت درآمد ثابت ماهانه کارفرما بر اساس توافق طرفین.',
          'ثبت کلیه هزینه‌های کارگاه و مصالح در حساب‌های بهای تمام‌شده پروژه (۵.۱.x).',
          'گزارش سود و زیان پروژه: تفاضل درآمد ثابت ماهانه از هزینه‌های واقعی کارگاه.',
        ],
      },
      {
        title: 'مدل ج: ساخت/مشارکت در ساخت و ورود شریک جدید (USD Dilution Formula)',
        steps: [
          'ثبت نرخ روز دلار بازار آزاد در بخش «سرمایه و شرکا» (تنها به‌صورت دستی ثبت می‌شود).',
          'ثبت آورده شریک جدید به‌صورت ریالی و تبدیل خودکار به معادل دلاری.',
          'فرمول محاسبه سهم جدید: سهم = آورده دلاری جدید ÷ (ارزش دلاری قبلی پروژه + آورده دلاری جدید).',
          'رقیق‌سازی پویای شرکا (Dynamic Dilution): سهم شرکای قبلی به تناسب رقیق شده و مجموع سهم تمامی شرکا همواره دقیقاً ۱۰۰.۰۰٪ باقی می‌ماند.',
          'حفظ کامل تاریخچه تغییرات سهم‌الشرکه همراه با سند حسابداری افزایش سرمایه.',
        ],
        accountingNote: 'فرمول ریاضی: Share % = USD_Contribution / (Project_USD_Value + USD_Contribution)',
      },
    ],
  },
  {
    id: 'procurement-warehouse',
    title: '۴. تدارکات، خرید و انبارداری مصالح',
    icon: ShoppingCart,
    badge: 'تامین و کالا',
    description: 'گردش‌کار از درخواست خرید کارگاه تا رسید انبار، حواله مصرف و کاردکس ریالی.',
    sections: [
      {
        title: 'چرخه تدارکات و خرید (Procurement Lifecycle)',
        steps: [
          '۱. درخواست خرید (PR): ثبت توسط سرپرست کارگاه یا صدور خودکار از گزارش روزانه.',
          '۲. سفارش خرید (PO): بررسی درخواست توسط مدیر تامین و ارجاع به کارپرداز.',
          '۳. فاکتور خرید: ثبت فاکتور نهایی همراه با مشخصات تامین‌کننده، مالیات و ارزش‌افزوده.',
          '۴. پرداخت به تامین‌کنندگان: ثبت سند پرداخت از طریق بانک، چک یا تنخواه.',
        ],
      },
      {
        title: 'انبارداری، کاردکس کالا و انبارگردانی',
        steps: [
          'رسید ورود کالا (Goods Receipt): ورود مصالح به انبار بر اساس فاکتور خرید.',
          'حواله خروج کالا (Goods Issue): تخصیص و مصرف مصالح در پروژه (صادرکننده آرتیکل هزینه بهای تمام‌شده).',
          'انتقال بین انبارها: انتقال کالا بین انبار مرکزی و انبارهای اختصاصی پروژه‌ها.',
          'کاردکس ریالی و تعدادی: مشاهده دقیق ورود، خروج و مانده هر کالا با میانگین موزون.',
          'انبارگردانی: ثبت شمارش واقعی، انطباق با سیستم و صدور سند کسری/اضافی انبار.',
        ],
      },
    ],
  },
  {
    id: 'site-payroll',
    title: '۵. عملیات کارگاه و حقوق و دستمزد',
    icon: HardHat,
    badge: 'اجرایی و انسانی',
    description: 'گزارش روزانه کارگاه، کارکرد ماشین‌آلات، لیست حقوق و محاسبه اتومات ذخایر.',
    sections: [
      {
        title: 'گزارش روزانه کارگاه و فوروارد هوشمند',
        steps: [
          'تکمیل گزارش روزانه توسط سرپرست کارگاه: آمار پرسنل، مصالح ورودی، پیشرفت فیزیکی و ماشین‌آلات.',
          'فوروارد خودکار: با تایید گزارش روزانه توسط مدیر، سیستم به طور خودکار درخواست‌های خرید نیازپایه و کارکرد پرسنل/تجهیزات را صادر می‌کند.',
        ],
      },
      {
        title: 'حقوق و دستمزد و ذخیره‌گیری ماهانه عیدی و سنوات',
        steps: [
          'تعریف دوره حقوق و ورود کارکرد ماهانه پرسنل (ساعات کار، اضافه کاری، کسر کار).',
          'محاسبه خودکار حقوق پایه، حق مسکن، بن عمالی، حق اولاد و بیمه/مالیات.',
          'ذخیره‌گیری ماهانه اتوماتیک:',
          ' • ذخیره عیدی ماهانه: (۲ × حقوق پایه) ÷ ۱۲',
          ' • ذخیره سنوات ماهانه: (۱ × حقوق پایه) ÷ ۱۲',
          'صدور آرتیکل حسابداری خودکار هنگام تایید حقوق: بدهکار: هزینه عیدی/سنوات (۶.۱.x) / بستانکار: ذخیره جاری عیدی و سنوات (۲.۱.x).',
        ],
      },
    ],
  },
  {
    id: 'treasury-reports',
    title: '۶. خزانه‌داری، گزارشات جامع و امنیت',
    icon: Landmark,
    badge: 'نقدینگی و مدیریتی',
    description: 'مدیریت چک‌ها، تنخواه پروژه‌ها، صورت‌های مالی جامع، لاگ‌های امنیتی و پشتیبان‌گیری.',
    sections: [
      {
        title: 'خزانه‌داری، چک و تنخواه‌گردان',
        steps: [
          'مدیریت بانک‌ها و صندوق‌ها و وصول/واگذاری چک‌های دریافتی و پرداختی.',
          'تنخواه‌گردان پروژه‌ها: ثبت صورت هزینه‌های تنخواه با قابلیت علامت‌گذاری «قابل مطالبه از کارفرما».',
          'صورت جریان وجوه نقد (Cash Flow): تحلیل ورودی‌ها و خروجی‌های نقدی به تفکیک پروژه و ستاد.',
        ],
      },
      {
        title: 'گزارشات جامع مدیریتی و صورت‌های مالی',
        steps: [
          'صورت سود و زیان (P&L): تفکیک سود عملیاتی پروژه، هزینه‌های ستادی و هزینه‌های عبوری.',
          'ترازنامه مالی (Balance Sheet): وضعیت دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام.',
          'گزارش تحلیلی بهای تمام‌شده پروژه (WIP) و گزارش سنی بدهکاران/بستانکاران (AP/AR Aging).',
        ],
      },
      {
        title: 'امنیت، بکاپ و پشتیبان‌گیری',
        steps: [
          'ردپای عملیات (Audit Logs): ثبت تمامی تغییرات، ایجاد، ویرایش و حذف اسناد با شناسه کاربر و زمان دقیق.',
          'ورود و خروج گروهی (Data I/O): امکان خروجی گرفتن و بارگذاری داده‌ها از فایل‌های Excel.',
          'پشتیبان‌گیری خودکار دیتابیس (Backup): زمان‌بندی روزانه پشتیبان‌گیری و ذخیره در مسیر امن.',
        ],
      },
    ],
  },
];

export default function WorkflowsGuidePage() {
  const [activeChapter, setActiveChapter] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-brand-200">
              <Sparkles className="w-3.5 h-3.5" />
              دفترچه راهنمای جامع کاربری و عملیاتی (User Manual)
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
              راهنمای جامع راهبری نرم‌افزار حسابداری اپسای
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              راهنمای صفر تا صد آموزش استفاده از تمامی بخش‌ها، فرم‌ها، مدل‌های پیمانکاری/مشارکتی، کدینگ حساب‌ها، انبارداری و حقوق و دستمزد.
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Chapters Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-bold text-slate-500 px-3 py-1">فصل‌های راهنمای جامع</div>
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

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {filteredChapters.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">موردی با عبارت «{searchQuery}» یافت نشد</p>
              <p className="text-xs text-slate-400 mt-1">لطفاً کلمات دیگری را امتحان کنید.</p>
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
                            <div>
                              <span className="font-bold block mb-0.5">نکته حسابداری / آرتیکل دوبل:</span>
                              <code className="font-mono dir-ltr block text-slate-800 bg-white/80 p-1.5 rounded border border-blue-200 mt-1">
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
        </div>
      </div>
    </div>
  );
}
