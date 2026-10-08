// ۳.۳: sanitize سراسری برای لاگ‌ها
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(full) {
  fs.copyFileSync(full, `${full}.bak-${STAMP}`);
  console.log(`  ✅ backup: ${path.basename(full)}`);
}

// ═══════════════════════════════════════════════════════════════
// 1) ساخت sanitize.util.ts مشترک
// ═══════════════════════════════════════════════════════════════
console.log('\n--- sanitize.util.ts (جدید) ---');
const utilDir = path.join(BACKEND, 'src', 'common', 'utils');
if (!fs.existsSync(utilDir)) fs.mkdirSync(utilDir, { recursive: true });

const utilPath = path.join(utilDir, 'sanitize.util.ts');
const utilCode = `// src/common/utils/sanitize.util.ts
// پاک‌سازی داده‌های حساس از payload ها — برای audit log, error log, telegram

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'secret',
  'bottoken',
  'authorization',
  'apikey',
  'api_key',
];

const REDACTED = '***REDACTED***';

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.indexOf(s) !== -1);
}

/**
 * پاک‌سازی بازگشتی یک آبجکت — هر کلید حساس به REDACTED تبدیل می‌شود
 */
export function sanitize<T = any>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return input as any; // رشته‌ها رو دست نمی‌زنیم

  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item)) as any;
  }

  if (typeof input === 'object') {
    const copy: any = {};
    for (const key of Object.keys(input as any)) {
      if (isSensitiveKey(key)) {
        copy[key] = REDACTED;
      } else {
        copy[key] = sanitize((input as any)[key]);
      }
    }
    return copy;
  }

  return input;
}

/**
 * پاک‌سازی رشته — الگوهای حساس رایج رو REDACTED می‌کنه
 * مثل: botToken، password=...
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  // JSON web tokens (eyJ...)
  let out = str.replace(/eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/g, '***JWT***');

  // Telegram bot tokens (digits:letters)
  out = out.replace(/\\b\\d{8,12}:[A-Za-z0-9_-]{30,}\\b/g, '***TELEGRAM_TOKEN***');

  // password=..., password: ...
  out = out.replace(/(password|passwd|pwd|secret|token|api[_-]?key)\\s*[:=]\\s*[^\\s,;"']+/gi, '$1=***REDACTED***');

  return out;
}
`;
fs.writeFileSync(utilPath, utilCode, 'utf8');
console.log('  ✅ sanitize.util.ts نوشته شد');

// ═══════════════════════════════════════════════════════════════
// 2) audit.service.ts — sanitize payload در log()
// ═══════════════════════════════════════════════════════════════
console.log('\n--- audit.service.ts ---');
const svcPath = path.join(BACKEND, 'src', 'modules', 'audit', 'audit.service.ts');
backup(svcPath);
let svc = fs.readFileSync(svcPath, 'utf8');

// import
if (!svc.includes('sanitize') || !svc.includes("from '../../common/utils/sanitize.util'")) {
  svc = svc.replace(
    `import { TelegramService } from '../../common/services/telegram.service';`,
    `import { TelegramService } from '../../common/services/telegram.service';\nimport { sanitize } from '../../common/utils/sanitize.util';`
  );
  console.log('  ✅ import sanitize');
}

// در log(): sanitize payload
const oldLog = `      const created = await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          payload: data.payload || undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });`;

const newLog = `      const safePayload = data.payload ? sanitize(data.payload) : undefined;

      const created = await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          payload: safePayload,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });`;

if (svc.includes(oldLog)) {
  svc = svc.replace(oldLog, newLog);
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('  ✅ sanitize در log() اضافه شد');
} else if (svc.includes('const created = await this.prisma.auditLog.create')) {
  console.log('  ⚠️ بلوک create با sanitize از قبل هست یا متفاوته');
} else {
  console.log('  ❌ الگو پیدا نشد — دستی چک کن');
}

// ═══════════════════════════════════════════════════════════════
// 3) all-exceptions.filter.ts — sanitize قبل از log + telegram
// ═══════════════════════════════════════════════════════════════
console.log('\n--- all-exceptions.filter.ts ---');
const filterPath = path.join(BACKEND, 'src', 'common', 'filters', 'all-exceptions.filter.ts');
backup(filterPath);
let filter = fs.readFileSync(filterPath, 'utf8');

// import
if (!filter.includes('sanitizeString') || !filter.includes("from '../utils/sanitize.util'")) {
  filter = filter.replace(
    `import { TelegramService } from '../services/telegram.service';`,
    `import { TelegramService } from '../services/telegram.service';\nimport { sanitizeString } from '../utils/sanitize.util';`
  );
  console.log('  ✅ import sanitizeString');
}

// sanitize errMsg قبل از log و telegram
const oldFilter = `    // لاگ
    const errMsg = typeof message === 'string' ? message : JSON.stringify(message);`;
const newFilter = `    // لاگ (sanitize شده — بدون رمز/توکن)
    const rawMsg = typeof message === 'string' ? message : JSON.stringify(message);
    const errMsg = sanitizeString(rawMsg);`;

if (filter.includes(oldFilter)) {
  filter = filter.replace(oldFilter, newFilter);
  fs.writeFileSync(filterPath, filter, 'utf8');
  console.log('  ✅ sanitizeString قبل از log');
} else if (filter.includes('const errMsg = sanitizeString')) {
  console.log('  ℹ️ از قبل هست');
} else {
  console.log('  ❌ الگو پیدا نشد — دستی چک کن');
}

// ═══════════════════════════════════════════════════════════════
// 4) audit.interceptor.ts — استفاده از util مشترک به‌جای sanitize محلی
// ═══════════════════════════════════════════════════════════════
console.log('\n--- audit.interceptor.ts ---');
const intPath = path.join(BACKEND, 'src', 'modules', 'audit', 'audit.interceptor.ts');
backup(intPath);
let inter = fs.readFileSync(intPath, 'utf8');

if (!inter.includes("from '../../common/utils/sanitize.util'")) {
  inter = inter.replace(
    `import { AuditService } from './audit.service';`,
    `import { AuditService } from './audit.service';\nimport { sanitize as sanitizeUtil } from '../../common/utils/sanitize.util';`
  );

  // استفاده از util به‌جای متد محلی (نگه‌داشتن متد محلی برای سازگاری)
  inter = inter.replace(
    `payload: { url: req.url, body: this.sanitize(req.body), responseId: response ? response.id : null },`,
    `payload: { url: req.url, body: sanitizeUtil(req.body), responseId: response ? response.id : null },`
  );

  fs.writeFileSync(intPath, inter, 'utf8');
  console.log('  ✅ از util مشترک استفاده می‌کنه');
} else {
  console.log('  ℹ️ از قبل هست');
}

console.log('\n══════════════════════════════════');
console.log('=== DONE ✅ ===');
console.log('\nمرحله بعد:');
console.log('  1) cd backend && npm run build');
console.log('  2) Restart-Service Epsay-Backend -Force (admin)');