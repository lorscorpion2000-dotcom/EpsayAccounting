// E:\EpsayAccounting\scripts\diagnose-db-credentials.mjs
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:/EpsayAccounting/backend';

function maskUrl(url) {
  if (!url) return '(empty)';
  // postgresql://user:pass@host:port/db → postgresql://us**:****@host:port/db
  return url.replace(/:\/\/([^:]+):([^@]+)@/, (_, u, p) =>
    '://' + u.slice(0, 3) + '***:' + '*'.repeat(Math.min(p.length, 8)) + '@',
  );
}

function extractFromContent(content, key) {
  if (!content) return null;
  const m = content.match(new RegExp('^\\s*' + key + '\\s*=\\s*"([^"]+)"', 'm'));
  return m ? m[1] : null;
}

console.log('=== Diagnostic: DB Credentials ===\n');

const envPath = path.join(BACKEND, '.env');
const envLocalPath = path.join(BACKEND, '.env.local');
const envExamplePath = path.join(BACKEND, '.env.example');

const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : null;
const envLocalContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : null;
const envExampleContent = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : null;

console.log('[1] فایل‌های env:');
console.log('  .env         →', envContent ? 'موجود (' + envContent.length + ' بایت)' : '❌ موجود نیست');
console.log('  .env.local   →', envLocalContent ? 'موجود (' + envLocalContent.length + ' بایت)' : '(موجود نیست)');
console.log('  .env.example →', envExampleContent ? 'موجود' : '(موجود نیست)');

console.log('\n[2] مقدار DATABASE_URL در هر فایل:');
const envUrl = extractFromContent(envContent, 'DATABASE_URL');
const envLocalUrl = extractFromContent(envLocalContent, 'DATABASE_URL');
const envExampleUrl = extractFromContent(envExampleContent, 'DATABASE_URL');

console.log('  .env         →', maskUrl(envUrl));
console.log('  .env.local   →', maskUrl(envLocalUrl));
console.log('  .env.example →', maskUrl(envExampleUrl));

console.log('\n[3] تحلیل:');

if (!envContent && !envLocalContent) {
  console.log('  ❌ هیچ فایل .env یا .env.local وجود ندارد');
  console.log('  → راه‌حل: از .env.example کپی کنید و مقادیر واقعی وارد کنید');
  process.exit(1);
}

// Prisma فقط .env را می‌خواند، نه .env.local
if (!envContent || !envUrl) {
  console.log('  ⚠ .env وجود ندارد یا DATABASE_URL در آن تعریف نشده');
  if (envLocalUrl) {
    console.log('  ⚠ اما .env.local مقدار دارد — Prisma آن را نمی‌خواند!');
    console.log('  → راه‌حل: DATABASE_URL را از .env.local به .env منتقل کنید');
  }
  process.exit(1);
}

// بررسی اینکه placeholder باشد
if (envUrl.includes('USER:PASSWORD') || envUrl.includes('USER:') || envUrl.match(/\/\/USER[@:]/)) {
  console.log('  ❌ DATABASE_URL در .env هنوز همان placeholder است!');
  console.log('     مقدار فعلی:', maskUrl(envUrl));
  console.log('  → راه‌حل: مقادیر واقعی PostgreSQL خود را وارد کنید');
  console.log('');
  console.log('     ساختار مورد نیاز:');
  console.log('     DATABASE_URL="postgresql://USERNAME:PASSWORD@127.0.0.1:5432/epsay_accounting?schema=public"');
  console.log('');
  console.log('     مثال: اگر نام کاربری postgres و رمز شما 123456789 باشد:');
  console.log('     DATABASE_URL="postgresql://postgres:123456789@127.0.0.1:5432/epsay_accounting?schema=public"');
  process.exit(1);
}

console.log('  ✓ DATABASE_URL مقدار واقعی دارد (نه placeholder)');
console.log('  → اگر باز هم خطا داد، رمز عبور یا نام کاربری اشتباه است');
console.log('  → راه‌حل: مقدار واقعی را از pgAdmin یا psql چک کنید');