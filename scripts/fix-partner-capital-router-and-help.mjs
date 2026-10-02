// E:\EpsayAccounting\scripts\fix-partner-capital-router-and-help.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

console.log('=== 1. Fix Router — Move Partner Capital inside MainLayout ===\n');

const routerPath = path.join(FRONTEND, 'src/app/router.tsx');
let router = fs.readFileSync(routerPath, 'utf8');

// 1) حذف بلوک Partner Capital که در انتهای فایل خارج از MainLayout است
const badBlockRegex = /\n\s*\{\/\*\s*Partner Capital\s*\*\/\}\s*\n(\s*<Route path="partner-capital[\s\S]*?\/>\s*\n)+/;
if (badBlockRegex.test(router)) {
  router = router.replace(badBlockRegex, '\n');
  console.log('  ✓ حذف بلوک اشتباه Partner Capital از انتهای فایل');
} else {
  console.log('  ℹ بلوک اشتباه پیدا نشد (شاید قبلاً حذف شده)');
}

// 2) اضافه کردن Partner Capital داخل MainLayout — قبل از </Route> که MainLayout را می‌بندد
if (!router.includes('partner-capital/accounts" element={<CapitalAccountsPage')) {
  // پیدا کردن بخش Settings که آخرین گروه داخل MainLayout است
  const settingsEndRegex = /(<Route path="\/settings\/roles" element=\{<RolesPage \/>\} \/>)/;
  const partnerCapitalBlock = `$1

        {/* Partner Capital */}
        <Route path="/partner-capital/accounts" element={<CapitalAccountsPage />} />
        <Route path="/partner-capital/contributions" element={<ContributionsPage />} />
        <Route path="/partner-capital/withdrawals" element={<WithdrawalsPage />} />
        <Route path="/partner-capital/shares" element={<SharesPage />} />
        <Route path="/partner-capital/balance-sheet" element={<BalanceSheetPage />} />`;

  if (settingsEndRegex.test(router)) {
    router = router.replace(settingsEndRegex, partnerCapitalBlock);
    console.log('  ✓ Partner Capital به داخل MainLayout اضافه شد (بعد از Settings)');
  } else {
    console.log('  ⚠ بخش Settings پیدا نشد — لطفاً دستی اضافه کنید');
  }
} else {
  console.log('  ℹ Partner Capital از قبل داخل MainLayout است');
}

fs.writeFileSync(routerPath, router, 'utf8');
console.log('  ✓ router.tsx به‌روزرسانی شد');

console.log('\n=== 2. Add Help Content for Partner Capital ===\n');

const helpPath = path.join(FRONTEND, 'src/modules/help/helpContent.ts');
let help = fs.readFileSync(helpPath, 'utf8');

if (!help.includes("'/partner-capital/accounts'")) {
  const partnerCapitalHelp = `
  // ============================================================
  // سرمایه شرکا
  // ============================================================
  '/partner-capital/accounts': {
    title: 'حساب‌های سرمایه شرکا',
    description: 'مدیریت حساب‌های سرمایه هر شریک در هر پروژه یا در سطح شرکت.',
    quickStart: [
      'روی «حساب جدید» کلیک کنید',
      'شریک و پروژه (اختیاری) را انتخاب کنید',
      'پس از ذخیره، حساب در لیست نمایش داده می‌شود',
      'برای ثبت آورده یا برداشت، به تب‌های مربوطه بروید',
    ],
    sections: [
      {
        title: 'انواع حساب',
        items: [
          'حساب عمومی شرکت: بدون انتخاب پروژه — برای هزینه‌های مشترک',
          'حساب پروژه‌ای: مخصوص یک پروژه خاص',
          'هر شریک می‌تواند در چند پروژه حساب جداگانه داشته باشد',
        ],
      },
      {
        title: 'اطلاعات هر حساب',
        items: [
          'کد حساب (اتوماتیک: PCA یا PCC)',
          'شریک صاحب حساب',
          'پروژه مرتبط (اختیاری)',
          'موجودی فعلی',
        ],
        tips: [
          'حساب‌های دارای گردش قابل حذف نیستند',
        ],
      },
    ],
    faqs: [
      {
        q: 'تفاوت PCA و PCC چیست؟',
        a: 'PCA = حساب سرمایه پروژه‌ای، PCC = حساب سرمایه عمومی شرکت.',
      },
    ],
  },

  '/partner-capital/contributions': {
    title: 'آورده‌های شرکا',
    description: 'ثبت آورده نقدی و غیرنقدی شرکا با چرخه تایید.',
    quickStart: [
      'روی «آورده جدید» کلیک کنید',
      'حساب، نوع (نقدی/غیرنقدی)، دسته و مبلغ را وارد کنید',
      'پس از ذخیره، روی «ارسال به کارتابل» بزنید',
      'پس از تایید مدیر، موجودی حساب شریک افزایش می‌یابد',
    ],
    sections: [
      {
        title: 'انواع آورده',
        items: [
          'نقدی (CASH): واریز نقدی، حواله بانکی، تنخواه',
          'غیرنقدی (NON_CASH): زمین، مصالح، خدمات، تجهیزات، خودرو',
        ],
      },
      {
        title: 'چرخه تایید',
        items: [
          'پیش‌نویس → ارسال → تایید مدیر → موجودی حساب افزایش می‌یابد',
          'رد شده: با ذکر دلیل — قابل ویرایش و ارسال مجدد',
        ],
        tips: [
          'تنها آورده‌های تاییدشده در گزارش تراز تسویه لحاظ می‌شوند',
        ],
      },
    ],
    faqs: [
      {
        q: 'چرا نمی‌توانم آورده را ویرایش کنم؟',
        a: 'فقط آورده‌های پیش‌نویس قابل ویرایش هستند. پس از ارسال، فقط با رد کردن قابل تغییر است.',
      },
    ],
  },

  '/partner-capital/withdrawals': {
    title: 'برداشت‌های شرکا',
    description: 'ثبت برداشت از حساب سرمایه، با امکان انتقال به پروژه دیگر.',
    quickStart: [
      'روی «برداشت جدید» کلیک کنید',
      'حساب، مبلغ و تاریخ را وارد کنید',
      'در صورت انتقال به پروژه دیگر، تیک مربوطه را بزنید',
      'پس از تایید، موجودی حساب کاهش می‌یابد',
    ],
    sections: [
      {
        title: 'حالت‌های برداشت',
        items: [
          'برداشت ساده: کاهش موجودی حساب شریک',
          'انتقال به پروژه دیگر: مبلغ از این حساب کسر و به‌عنوان آورده در پروژه مقصد ثبت می‌شود',
        ],
      },
      {
        title: 'چرخه تایید',
        items: [
          'پیش‌نویس → ارسال → تایید مدیر → موجودی کاهش می‌یابد',
          'کنترل خودکار: مبلغ نمی‌تواند از موجودی حساب بیشتر باشد',
        ],
        tips: [
          'در حالت انتقال، یک آورده خودکار در پروژه مقصد ایجاد می‌شود',
        ],
      },
    ],
  },

  '/partner-capital/shares': {
    title: 'سهم‌الشرکه پروژه‌ها',
    description: 'درصد مالکیت هر شریک در هر پروژه با اعتبار از/تا.',
    quickStart: [
      'روی «سهم جدید» کلیک کنید',
      'پروژه، شریک و درصد سهم را وارد کنید',
      'تاریخ اعتبار از و (اختیاری) تا را وارد کنید',
      'سیستم به‌طور خودکار مجموع سهم‌ها را کنترل می‌کند',
    ],
    sections: [
      {
        title: 'نسخه‌بندی سهم',
        items: [
          'هر سهم یک بازه اعتبار دارد (از تاریخ تا تاریخ)',
          'با تغییر درصد سهم در طول زمان، سهم قبلی «تا تاریخ» می‌گیرد و سهم جدید «از تاریخ»',
          'مجموع سهم‌ها در هر تاریخ نباید از ۱۰۰٪ بیشتر شود',
        ],
      },
      {
        title: 'نمایش گروهی',
        items: [
          'سهم‌ها بر اساس پروژه گروه‌بندی می‌شوند',
          'مجموع درصد هر پروژه در بالای گروه نشان داده می‌شود',
          'اگر مجموع بیشتر از ۱۰۰٪ باشد، قرمز نمایش داده می‌شود',
        ],
      },
    ],
  },

  '/partner-capital/balance-sheet': {
    title: 'تراز تسویه شرکا',
    description: 'گزارش جامع آورده‌ها، برداشت‌ها و مانده هر شریک.',
    quickStart: [
      'این صفحه به‌طور خودکار آخرین وضعیت را نشان می‌دهد',
      'برای به‌روزرسانی، دکمه رفرش را بزنید',
      'برای خروجی Excel یا چاپ، از دکمه‌های بالا استفاده کنید',
    ],
    sections: [
      {
        title: 'اطلاعات گزارش',
        items: [
          'مجموع آورده‌های تاییدشده',
          'مجموع برداشت‌های تاییدشده',
          'مانده خالص (آورده - برداشت)',
          'ریز مانده هر شریک در هر پروژه',
        ],
      },
      {
        title: 'کاربرد',
        items: [
          'پایه‌ی محاسبه سهم سود و زیان شرکا',
          'کنترل تطابق مجموع سرمایه با دفاتر حسابداری',
        ],
        tips: [
          'این گزارش فقط داده‌های تاییدشده را نشان می‌دهد',
        ],
      },
    ],
  },
`;

  // اضافه کردن قبل از انتهای HELP_CONTENT
  const insertRegex = /(\n\};\n\n\/\*\*\n \* دریافت راهنما بر اساس مسیر فعلی)/;
  if (insertRegex.test(help)) {
    help = help.replace(insertRegex, partnerCapitalHelp + '$1');
    console.log('  ✓ راهنمای ۵ صفحه Partner Capital اضافه شد');
  } else {
    // روش جایگزین: قبل از آخرین `};`
    const lastBraceIdx = help.lastIndexOf('\n};');
    if (lastBraceIdx > 0) {
      help = help.slice(0, lastBraceIdx) + '\n' + partnerCapitalHelp + help.slice(lastBraceIdx);
      console.log('  ✓ راهنمای ۵ صفحه Partner Capital اضافه شد (روش جایگزین)');
    } else {
      console.log('  ⚠ نتوانستم در helpContent.ts جای مناسب پیدا کنم');
    }
  }

  // 3) اضافه کردن pattern matching برای partner-capital در getHelpForPath
  // این کار با match خودکار انجام می‌شود چون یک لیست با پایه مشترک است

  fs.writeFileSync(helpPath, help, 'utf8');
  console.log('  ✓ helpContent.ts به‌روزرسانی شد');
} else {
  console.log('  ℹ راهنمای Partner Capital از قبل موجود است');
}

console.log('');
console.log('=============================================');
console.log('  ✅ اصلاحات اعمال شد');
console.log('=============================================');
console.log('');
console.log('Next steps:');
console.log('  1. در VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
console.log('  2. در ترمینال frontend: npm run dev (اگر اجرا نیست)');
console.log('  3. مرورگر: Ctrl+Shift+R (Hard Refresh)');
console.log('');