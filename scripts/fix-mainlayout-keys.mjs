// E:\EpsayAccounting\scripts\fix-mainlayout-keys.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';
const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');

if (!fs.existsSync(layoutPath)) {
  console.error('❌ MainLayout.tsx پیدا نشد:', layoutPath);
  process.exit(1);
}

let src = fs.readFileSync(layoutPath, 'utf8');
const original = src;
let changes = [];

// ─────────────────────────────────────────────────────────────
// 1) Backup
// ─────────────────────────────────────────────────────────────
const backupPath = layoutPath + '.bak-' + Date.now();
fs.writeFileSync(backupPath, src, 'utf8');
console.log('  💾 بکاپ گرفته شد:', path.basename(backupPath));

// ─────────────────────────────────────────────────────────────
// 2) اصلاح همه <NavLink ...> که key ندارند
//    الگو: <NavLink  (بدون key= در ادامه تا >)
// ─────────────────────────────────────────────────────────────
const navLinkRegex = /<NavLink(\s+)(?!.*?\bkey=)([^>]*?)>/gs;

let navLinkPatched = 0;
src = src.replace(navLinkRegex, (match, ws, rest) => {
  // فقط NavLinkهایی که داخل map هستند را هدف می‌گیریم — با heuristic:
  // اگر to={item.to} یا to={item.to} یا مشابه دارد، یعنی داخل map است
  if (!/\bto=\{/.test(rest)) return match;
  // اگر قبلاً key دارد، رد کن
  if (/\bkey=/.test(rest)) return match;

  navLinkPatched++;
  return `<NavLink${ws}key={item.key ?? item.to ?? item.label}${ws}${rest}>`;
});

if (navLinkPatched > 0) {
  changes.push(`${navLinkPatched} مورد <NavLink> با key پچ شد`);
  console.log(`  ✓ ${navLinkPatched} مورد <NavLink> اصلاح شد`);
}

// ─────────────────────────────────────────────────────────────
// 3) اگر key روی NavLink بود ولی item.key مقدار نداشت،
//    fallback روی to → با تغییر key={item.key} به key={item.key ?? item.to}
// ─────────────────────────────────────────────────────────────
if (/key=\{item\.key\}/.test(src)) {
  src = src.replace(/key=\{item\.key\}/g, 'key={item.key ?? item.to ?? item.label}');
  changes.push('key={item.key} به key={item.key ?? item.to} تغییر کرد');
  console.log('  ✓ key={item.key} → key={item.key ?? item.to}');
}

// ─────────────────────────────────────────────────────────────
// 4) افزودن key به آیتم‌های بخش timeline در صورت نبود
// ─────────────────────────────────────────────────────────────
if (src.includes("key: 'timeline'") && !src.includes("'timeline-permits'") && !src.includes("'tl-permits'")) {
  const timelineBlockRegex = /(\{\s*key:\s*['"]timeline['"][\s\S]*?items:\s*\[)([\s\S]*?)(\]\s*,?\s*\},)/;
  const m = src.match(timelineBlockRegex);
  if (m) {
    const newItems = `
      { key: 'tl-permits',    to: '/timeline/permits',    label: 'مجوزها و پروانه‌ها', icon: FileCheck2  },
      { key: 'tl-insurances', to: '/timeline/insurances', label: 'بیمه‌نامه‌ها',       icon: ShieldCheck },
      { key: 'tl-guarantees', to: '/timeline/guarantees', label: 'تضامین',             icon: Lock        },
      { key: 'tl-documents',  to: '/timeline/documents',  label: 'اسناد فنی',          icon: FileImage   },
      { key: 'tl-checklists', to: '/timeline/checklists', label: 'چک‌لیست‌های مهندسی', icon: CheckSquare },
    `;
    src = src.replace(timelineBlockRegex, m[1] + newItems + m[3]);
    changes.push('key به آیتم‌های timeline اضافه شد');
    console.log('  ✓ آیتم‌های timeline keyدار شدند');
  } else {
    console.log('  ⚠ بلوک timeline پیدا نشد (regex match نشد)');
  }
} else if (src.includes("'tl-permits'") || src.includes("'timeline-permits'")) {
  console.log('  ℹ آیتم‌های timeline از قبل key دارند');
}

// ─────────────────────────────────────────────────────────────
// 5) اگر بخش timeline با آیکون‌ها نبود، هشدار بده
// ─────────────────────────────────────────────────────────────
const iconImportsNeeded = ['FileCheck2', 'ShieldCheck', 'Lock', 'FileImage', 'CheckSquare'];
const missingIcons = iconImportsNeeded.filter((ic) => !new RegExp(`\\b${ic}\\b`).test(src));
if (missingIcons.length > 0 && src.includes("key: 'timeline'")) {
  console.log(`  ⚠ این آیکون‌ها در فایل ایمپورت نشده‌اند: ${missingIcons.join(', ')}`);
  console.log('    → به‌صورت دستی از lucide-react ایمپورت کنید');
}

// ─────────────────────────────────────────────────────────────
// 6) ذخیره
// ─────────────────────────────────────────────────────────────
if (src !== original) {
  fs.writeFileSync(layoutPath, src, 'utf8');
  console.log('');
  console.log('  ✅ MainLayout.tsx ذخیره شد');
  console.log('  📝 تغییرات:');
  changes.forEach((c) => console.log('     • ' + c));
} else {
  console.log('');
  console.log('  ℹ تغییری لازم نبود — فایل دست‌نخورده ماند');
  // بکاپ بی‌مصرف را پاک کن
  fs.unlinkSync(backupPath);
}

console.log('');
console.log('─────────────────────────────────────────');
console.log('گام بعدی:');
console.log('  1. Ctrl+Shift+P → TypeScript: Restart TS Server');
console.log('  2. در مرورگر: Ctrl+Shift+R');
console.log('─────────────────────────────────────────');