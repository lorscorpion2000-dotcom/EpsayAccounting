// E:\EpsayAccounting\scripts\fix-encoding-and-chart.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';

// ============================================================
// 1) رفع Mojibake — تبدیل بایت‌های Latin-1 به UTF-8 معتبر
// ============================================================
function fixMojibake(str) {
  return str.replace(
    /[\u0080-\u00FF][\u0080-\u00FF]+/g,
    (match) => {
      try {
        const bytes = [];
        for (const ch of match) {
          const code = ch.charCodeAt(0);
          if (code > 255) return match;
          bytes.push(code);
        }
        const decoded = Buffer.from(bytes).toString('utf8');
        // باید حاوی حروف فارسی باشد و کاراکتر جایگزین نداشته باشد
        if (/[\u0600-\u06FF]/.test(decoded) && !decoded.includes('\uFFFD')) {
          return decoded;
        }
      } catch {}
      return match;
    },
  );
}

console.log('=== 1. Fixing mojibake in source files ===\n');

const filesToFix = [
  // Backend
  'backend/src/services/api.ts', // ممکن است نباشد
  'backend/src/modules/auth/auth.service.ts',
  'backend/src/modules/auth/auth.controller.ts',
  'backend/src/common/guards/permissions.guard.ts',
  'backend/src/modules/roles/roles.service.ts',
  'backend/src/modules/users/users.service.ts',
  'backend/src/main.ts',
  // Frontend
  'frontend/src/services/api.ts',
];

let fixedCount = 0;
for (const rel of filesToFix) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`  (skip) ${rel} — موجود نیست`);
    continue;
  }
  const original = fs.readFileSync(full, 'utf8');
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(full, fixed, 'utf8');
    console.log(`  ✓ ${rel} — اصلاح شد`);
    fixedCount++;
  } else {
    console.log(`  ℹ ${rel} — نیاز به اصلاح نداشت`);
  }
}

console.log(`\n  → ${fixedCount} فایل اصلاح شد\n`);

// ============================================================
// 2) Fix Profit/Loss Chart — قرار دادن برچسب‌ها در سمت چپ
// ============================================================
console.log('=== 2. Fixing profit/loss chart layout ===\n');

const dashPath = path.join(ROOT, 'frontend/src/modules/dashboard/pages/DashboardPage.tsx');
let dashboard = fs.readFileSync(dashPath, 'utf8');

// تغییر ۱: افزودن dir="ltr" به کانتینر و اصلاح margin
const oldDiv = `<div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={profitLossData} 
                  layout="vertical" 
                  margin={{ right: 30, left: 5, top: 10, bottom: 10 }}
                >`;

const newDiv = `<div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={profitLossData} 
                  layout="vertical" 
                  margin={{ left: 130, right: 30, top: 10, bottom: 10 }}
                >`;

if (dashboard.includes(oldDiv)) {
  dashboard = dashboard.replace(oldDiv, newDiv);
  console.log('  ✓ کانتینر نمودار به LTR تبدیل شد و margin اصلاح شد');
} else {
  // تلاش با الگوهای جایگزین
  const alt1 = `<div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={profitLossData}`;
  if (dashboard.includes(alt1)) {
    dashboard = dashboard
      .replace(
        `<div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={profitLossData}`,
        `<div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={profitLossData}`,
      )
      .replace(
        `layout="vertical" 
                  margin={{ right: 30, left: 5, top: 10, bottom: 10 }}`,
        `layout="vertical" 
                  margin={{ left: 130, right: 30, top: 10, bottom: 10 }}`,
      );
    console.log('  ✓ (روش جایگزین) کانتینر و margin اصلاح شد');
  } else {
    console.log('  ⚠ الگوی نمودار پیدا نشد — بررسی دستی');
  }
}

// تغییر ۲: اصلاح tick YAxis
const oldTick = `tick={{ 
                    fontSize: 14, 
                    fill: '#334155', 
                    fontWeight: 600,
                    textAnchor: 'end',
                  }}`;

const newTick = `tick={{ 
                    fontSize: 14, 
                    fill: '#334155', 
                    fontWeight: 600,
                    textAnchor: 'end',
                  }}
                  orientation="left"`;

if (dashboard.includes(oldTick) && !dashboard.includes('orientation="left"')) {
  dashboard = dashboard.replace(oldTick, newTick);
  console.log('  ✓ YAxis orientation="left" اضافه شد');
}

fs.writeFileSync(dashPath, dashboard, 'utf8');
console.log('  ✓ DashboardPage.tsx به‌روزرسانی شد');

// ============================================================
// 3) نتیجه
// ============================================================
console.log('');
console.log('=============================================');
console.log('  ✅ اصلاحات اعمال شد');
console.log('=============================================');
console.log('');
console.log('Next:');
console.log('  1. Restart backend (اگر در حال اجرا): Ctrl+C و دوباره npm run start:dev');
console.log('  2. Restart frontend (اگر در حال اجرا): در ترمینال frontend دوباره npm run dev');
console.log('  3. مرورگر: Ctrl+Shift+R (Hard Refresh)');
console.log('');