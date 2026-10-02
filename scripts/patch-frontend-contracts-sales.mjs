// E:\EpsayAccounting\scripts\patch-frontend-contracts-sales.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';
const TS = new Date().toISOString().replace(/[:.]/g, '-');

function backup(p) {
  const b = p + '.bak-' + TS;
  fs.copyFileSync(p, b);
  console.log('  💾 بکاپ: ' + path.basename(b));
}

// ═══════════════════════════════════════════════════════════════
// 1) MainLayout.tsx
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 1. Patch MainLayout.tsx ===\n');
const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');
let layout = fs.readFileSync(layoutPath, 'utf8');
backup(layoutPath);

// 1.a) حذف بلوک خراب timeline که داخل partner-capital چپیده بود
const brokenRegex = /\s*\{\s*\r?\n\s*\r?\n\s*title:\s*'گاه‌شمار و مجوزها'[\s\S]*?items:\s*\[[\s\S]*?\],\s*\r?\n\s*\},\r?\n/g;
if (brokenRegex.test(layout)) {
  layout = layout.replace(brokenRegex, '\n');
  console.log('  ✓ بلوک خراب timeline حذف شد');
} else {
  console.log('  ℹ بلوک خراب پیدا نشد (شاید قبلاً حذف شده)');
}

// 1.b) افزودن آیکون Building2 اگر نیست
if (!layout.includes('Building2')) {
  layout = layout.replace(
    /(\n\s+TrendingDown, PieChart,)/,
    '$1\n  Building2,'
  );
  console.log('  ✓ آیکون Building2 اضافه شد');
}

// 1.c) افزودن سکشن contracts + sales قبل از approvals
const newSections = `  {
    key: 'contracts',
    title: 'قراردادها',
    icon: FileText,
    items: [
      { to: '/contracts', label: 'همه قراردادها', icon: FileText },
    ],
  },
  {
    key: 'sales',
    title: 'فروش و پیش‌فروش',
    icon: ShoppingBag,
    items: [
      { to: '/sales/units',     label: 'واحدهای قابل فروش', icon: Building2 },
      { to: '/sales/contracts', label: 'قراردادهای فروش',   icon: ShoppingBag },
    ],
  },
`;

if (!layout.includes("key: 'contracts'")) {
  const anchorRegex = /(\n\s*\{\s*\r?\n\s*key: 'approvals',)/;
  if (anchorRegex.test(layout)) {
    layout = layout.replace(anchorRegex, '\n' + newSections + '$1');
    console.log('  ✓ سکشن‌های contracts و sales اضافه شدند');
  } else {
    console.log('  ⚠ anchor `key: \'approvals\'` پیدا نشد');
  }
} else {
  console.log('  ℹ سکشن contracts از قبل موجود است');
}

fs.writeFileSync(layoutPath, layout, 'utf8');

// ═══════════════════════════════════════════════════════════════
// 2) router.tsx
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 2. Patch router.tsx ===\n');
const routerPath = path.join(FRONTEND, 'src/app/router.tsx');
let router = fs.readFileSync(routerPath, 'utf8');
backup(routerPath);

if (!router.includes('modules/contracts/pages')) {
  // imports
  const imports = `
import ContractsListPage from '@/modules/contracts/pages/ContractsListPage';
import ContractViewPage from '@/modules/contracts/pages/ContractViewPage';
import SalesUnitsPage from '@/modules/sales/pages/SalesUnitsPage';
import SalesContractsListPage from '@/modules/sales/pages/SalesContractsListPage';
import SalesContractFormPage from '@/modules/sales/pages/SalesContractFormPage';
import SalesContractDetailPage from '@/modules/sales/pages/SalesContractDetailPage';
`;
  const lastImportRegex = /^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
  const matches = router.match(lastImportRegex);
  if (matches) {
    const lastImport = matches[matches.length - 1];
    router = router.replace(lastImport, lastImport + '\n' + imports);
    console.log('  ✓ imports اضافه شدند');
  }

  // routes — قبل از <Route path="*"
  const routes = `
        {/* Contracts */}
        <Route path="/contracts" element={<ContractsListPage />} />
        <Route path="/contracts/:id" element={<ContractViewPage />} />

        {/* Sales */}
        <Route path="/sales/units" element={<SalesUnitsPage />} />
        <Route path="/sales/contracts" element={<SalesContractsListPage />} />
        <Route path="/sales/contracts/new" element={<SalesContractFormPage />} />
        <Route path="/sales/contracts/:id/edit" element={<SalesContractFormPage />} />
        <Route path="/sales/contracts/:id" element={<SalesContractDetailPage />} />
`;

  if (router.includes('<Route path="*"')) {
    router = router.replace(/(\s*<Route path="\*")/, routes + '\n$1');
    console.log('  ✓ 7 روت اضافه شد');
  } else {
    console.log('  ⚠ anchor <Route path="*" پیدا نشد');
  }
} else {
  console.log('  ℹ router از قبل پچ شده');
}

fs.writeFileSync(routerPath, router, 'utf8');

// ═══════════════════════════════════════════════════════════════
// 3) helpContent.ts
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 3. Patch helpContent.ts ===\n');
const helpPath = path.join(FRONTEND, 'src/modules/help/helpContent.ts');
let help = fs.readFileSync(helpPath, 'utf8');
backup(helpPath);

if (!help.includes("'/contracts'")) {
  const helpBlocks = `
  // ============================================================
  // قراردادها
  // ============================================================
  '/contracts': {
    title: 'قراردادها',
    description: 'مدیریت قراردادهای کارگری، پیمانکاری، کارفرمایی و پیمانکار جزء با متن کامل و امکان چاپ.',
    quickStart: [
      'روی «قرارداد جدید» کلیک کنید',
      'نوع قرارداد (کارگری/پیمانکاری/کارفرمایی/پیمانکار جزء) را انتخاب کنید',
      'عنوان و طرف قرارداد را مشخص کنید',
      'اگر طرف قرارداد جدید است، «طرف جدید» را بزنید',
      'مبالغ، تاریخ‌ها و تضامین را وارد کنید',
      'متن کامل قرارداد را در قسمت «متن کامل قرارداد (HTML)» جای‌گذاری کنید',
    ],
    sections: [
      {
        title: 'انواع قرارداد',
        items: [
          'قرارداد کارگری: مطابق قانون کار و تأمین اجتماعی',
          'قرارداد پیمانکاری: پیمانکار ارشد یا جزء',
          'قرارداد کارفرمایی: بین شرکت و کارفرمای پروژه',
          'پیمانکار جزء: قرارداد با پیمانکار خرد فرعی',
        ],
      },
      {
        title: 'چرخه عمر قرارداد',
        items: [
          'پیش‌نویس: در حال تنظیم',
          'فعال: پس از تأیید طرفین',
          'خاتمه‌یافته: پس از انجام تعهدات',
          'ابطال‌شده: با ذکر دلیل، بدون حذف سابقه',
        ],
        tips: [
          'شماره قرارداد به‌صورت خودکار ثبت می‌شود (فرمت LC-YYYY-####)',
          'امکان حذف وجود ندارد، فقط ابطال با دلیل',
          'پس از فعال‌سازی، متن قابل ویرایش نیست',
        ],
      },
    ],
    faqs: [
      { q: 'تفاوت «طرف قرارداد» با «شخص» در دایرکتوری چیست؟',
        a: '«طرف قرارداد» مختص قراردادها است و اطلاعات تخصصی‌تری مثل شماره بیمه و اطلاعات بانکی دارد.' },
    ],
  },

  // ============================================================
  // فروش
  // ============================================================
  '/sales/units': {
    title: 'واحدهای قابل فروش',
    description: 'تعریف و مدیریت واحدهای مسکونی/تجاری هر پروژه با مشخصات کامل (متراژ، خواب، پارکینگ، انبار).',
    quickStart: [
      'روی «واحد جدید» کلیک کنید',
      'پروژه، بلوک و شماره واحد را وارد کنید',
      'متراژ، تعداد خواب، پارکینگ و انبار را ثبت کنید',
      'قیمت لیست را وارد کنید',
    ],
    sections: [
      {
        title: 'وضعیت واحدها',
        items: [
          'قابل فروش: هنوز فروخته نشده',
          'رزرو: در فرآیند قرارداد',
          'فروخته‌شده: قرارداد فعال دارد',
          'تحویل‌شده: تحویل مشتری شده',
        ],
      },
    ],
  },

  '/sales/contracts': {
    title: 'قراردادهای فروش',
    description: 'قرارداد فروش واحد با تقسیط، پرداخت و پیگیری وضعیت.',
    quickStart: [
      'روی «قرارداد جدید» کلیک کنید',
      'واحد و مشتری را انتخاب کنید (اگر مشتری جدید است، در صفحه مستقل اضافه شود)',
      'مبلغ کل، تخفیف و پیش‌پرداخت را وارد کنید',
      'اقساط را یکی‌یکی با سررسید و مبلغ اضافه کنید',
      'پس از ذخیره، «فعال‌سازی» بزنید',
      'برای ثبت پرداخت، در صفحه جزئیات «پرداخت» بزنید',
    ],
    sections: [
      {
        title: 'چرخه فروش',
        items: [
          'پیش‌نویس: قرارداد آماده امضا، واحد رزرو',
          'فعال: پس از امضا، واحد فروخته‌شده',
          'خاتمه: پس از تسویه کامل و تحویل',
          'ابطال: واحد آزاد می‌شود',
        ],
      },
      {
        title: 'مدیریت پرداخت',
        items: [
          'هر پرداخت به‌صورت خودکار روی اقساط FIFO اعمال می‌شود',
          'باقیمانده در بالای صفحه نمایش داده می‌شود',
          'قرارداد به‌همراه تمام اقساط و پرداخت‌ها قابل چاپ است',
        ],
        tips: [
          'شماره قرارداد خودکار ثبت می‌شود (SC-YYYY-####)',
        ],
      },
    ],
    faqs: [
      { q: 'اگر واحد قبلاً رزرو شده باشد چه اتفاقی می‌افتد؟',
        a: 'در لیست واحدهای قابل انتخاب فقط واحدهای AVAILABLE نمایش داده می‌شوند.' },
    ],
  },
`;

  const insertRegex = /(\n\};\n\n\/\*\*\n \* دریافت راهنما بر اساس مسیر فعلی)/;
  if (insertRegex.test(help)) {
    help = help.replace(insertRegex, helpBlocks + '$1');
    console.log('  ✓ 3 راهنمای جدید اضافه شد');
  } else {
    console.log('  ⚠ anchor در helpContent پیدا نشد');
  }
} else {
  console.log('  ℹ help از قبل پچ شده');
}

fs.writeFileSync(helpPath, help, 'utf8');

console.log('\n════════════════════════════════════════════════');
console.log('  ✅ Step 4 Complete!');
console.log('════════════════════════════════════════════════');
console.log('');
console.log('Changes:');
console.log('  • MainLayout.tsx  → سکشن contracts + sales اضافه شد');
console.log('  • router.tsx      → 7 روت جدید');
console.log('  • helpContent.ts  → 3 راهنما');
console.log('');
console.log('Next:');
console.log('  1. Ctrl+Shift+P → TypeScript: Restart TS Server');
console.log('  2. cd E:\\EpsayAccounting\\frontend');
console.log('  3. npm run build');
console.log('');