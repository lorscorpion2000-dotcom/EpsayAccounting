import { BookOpen, Table, ShieldCheck, Wallet, HardHat } from 'lucide-react';

export default function WorkflowsGuidePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6 animate-fade-in" dir="rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-600" />
          راهنمای جامع گردش‌کارهای سیستم حسابداری اپسای
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          راهنمای سریع استفاده از قابلیت‌های جدید و سیستم‌های هوشمند
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ۱. جدول اکسلی ثبت اسناد */}
        <div className="card p-5 space-y-3 border-r-4 border-r-blue-500">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <Table className="w-5 h-5" />
            <h2>ثبت سریع اسناد با جدول اکسلی</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            در صفحه ثبت اسناد حسابداری می‌توانید با دکمه «نمایش جدول اکسلی» ورودی داده‌ها را به حالت اکسل تغییر دهید. امکان کلیدهای `Enter` و `Tab` برای رفتن به خانه بعدی، سرچ درجا با تایپ کد حساب و Paste مستقیم داده‌ها از نرم‌افزار Excel فراهم است.
          </p>
        </div>

        {/* ۲. گزارش روزانه و فوروارد خودکار */}
        <div className="card p-5 space-y-3 border-r-4 border-r-amber-500">
          <div className="flex items-center gap-2 text-amber-700 font-bold">
            <HardHat className="w-5 h-5" />
            <h2>گزارش روزانه کارگاه و فوروارد خودکار</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            سرپرست کارگاه گزارش روزانه را ثبت می‌کند. پس از تأیید گزارش توسط مدیر، سیستم به طور خودکار درخواست‌های خرید (PR) و رکوردهای کارکرد پرسنل و ماشین‌آلات را صادر و به ماژول‌های مربوطه فوروارد می‌کند.
          </p>
        </div>

        {/* ۳. هزینه‌های قابل مطالبه تنخواه */}
        <div className="card p-5 space-y-3 border-r-4 border-r-emerald-500">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <Wallet className="w-5 h-5" />
            <h2>تنخواه‌گردان و هزینه‌های قابل مطالبه</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            هنگام ثبت هزینه‌های تنخواه، در صورت علامت‌گذاری گزینه «قابل مطالبه از کارفرما»، می‌توانید درصد مدیریت پیمان را تعیین کنید تا مبلغ نهایی صورت‌حساب کارفرما به صورت خودکار محاسبه شود.
          </p>
        </div>

        {/* ۴. ماتریس دسترسی پروژه‌ای */}
        <div className="card p-5 space-y-3 border-r-4 border-r-violet-500">
          <div className="flex items-center gap-2 text-violet-700 font-bold">
            <ShieldCheck className="w-5 h-5" />
            <h2>محدودیت دسترسی پروژه‌ای (RBAC)</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            هر کاربر تنها اطلاعات و اسناد مربوط به پروژه‌های تخصیص داده شده به خود را مشاهده می‌کند. مدیران ارشد (`super_admin`) به تمام پروژه‌ها دسترسی کامل دارند.
          </p>
        </div>
      </div>
    </div>
  );
}