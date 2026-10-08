// ۲.۳: هشدار تلگرام روی login مشکوک
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const svcPath = path.join(BACKEND, 'src', 'modules', 'audit', 'audit.service.ts');
fs.copyFileSync(svcPath, `${svcPath}.bak-${STAMP}`);
console.log(`✅ backup`);

let svc = fs.readFileSync(svcPath, 'utf8');

if (svc.includes('TelegramService') && svc.includes('checkSuspiciousLogin')) {
  console.log('ℹ️ از قبل هست');
  process.exit(0);
}

// ۱) import TelegramService
if (!svc.includes("from '../../common/services/telegram.service'")) {
  svc = svc.replace(
    `import { PrismaService } from '../../shared/prisma/prisma.service';`,
    `import { PrismaService } from '../../shared/prisma/prisma.service';\nimport { TelegramService } from '../../common/services/telegram.service';`
  );
  console.log('✅ import TelegramService');
}

// ۲) constructor
const oldCtor = `  constructor(private prisma: PrismaService) {}`;
const newCtor = `  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}`;

if (svc.includes(oldCtor)) {
  svc = svc.replace(oldCtor, newCtor);
  console.log('✅ constructor');
}

// ۳) افزودن constant ها + متد بررسی مشکوک قبل از کلاس
const beforeClass = `@Injectable()
export class AuditService {`;

const insertBefore = `const FAILED_ACTIONS = new Set([
  'LOGIN_FAILED',
  'LOGIN_BLOCKED_LOCKED',
  'ACCOUNT_LOCKED',
]);

// آستانه‌ها
const SUSPICIOUS_THRESHOLD = 5; // تعداد خطا
const SUSPICIOUS_WINDOW_MIN = 10; // در ۱۰ دقیقه
const ALERT_COOLDOWN_MIN = 30; // هر IP فقط ۱ بار در ۳۰ دقیقه

@Injectable()
export class AuditService {`;

if (svc.includes(beforeClass)) {
  svc = svc.replace(beforeClass, insertBefore);
  console.log('✅ constants + comment');
}

// ۴) افزودن map برای cooldown
const fieldAnchor = `export class AuditService {
  constructor(`;
const fieldReplacement = `export class AuditService {
  private readonly alertCooldown = new Map<string, number>();

  constructor(`;

if (svc.includes(fieldAnchor)) {
  svc = svc.replace(fieldAnchor, fieldReplacement);
  console.log('✅ alertCooldown map');
}

// ۵) افزودن متد checkSuspiciousLogin قبل از آخرین }
const helperMethod = `
  /**
   * بررسی login مشکوک: اگه از یه IP بیش از حد خطا اومده، هشدار تلگرام
   */
  private async checkSuspiciousLogin(
    ip: string | undefined,
    action: string,
    username: string | undefined,
  ) {
    if (!ip || !FAILED_ACTIONS.has(action)) return;

    // cooldown
    const now = Date.now();
    const last = this.alertCooldown.get(ip) || 0;
    if ((now - last) < ALERT_COOLDOWN_MIN * 60_000) return;

    try {
      const since = new Date(now - SUSPICIOUS_WINDOW_MIN * 60_000);
      const count = await this.prisma.auditLog.count({
        where: {
          action: { in: ['LOGIN_FAILED', 'LOGIN_BLOCKED_LOCKED', 'ACCOUNT_LOCKED'] },
          ipAddress: ip,
          createdAt: { gte: since },
        },
      });

      if (count < SUSPICIOUS_THRESHOLD) return;

      // ثبت cooldown قبل از ارسال (ضد spam حتی در صورت خطا)
      this.alertCooldown.set(ip, now);

      const lines = [
        'هشدار امنیتی: تلاش‌های ورود مشکوک',
        'IP: ' + ip,
        'تعداد خطا: ' + count + ' بار در ' + SUSPICIOUS_WINDOW_MIN + ' دقیقه اخیر',
        'آخرین کاربر هدف: ' + (username || '—'),
        'آخرین رویداد: ' + action,
      ];

      await this.telegram.send('ERROR', lines.join('\\n'));
    } catch {
      // silent — نمی‌خوایم خطای audit کل درخواست رو خراب کنه
    }
  }
}
`;

const lastBrace = svc.lastIndexOf('\n}');
if (lastBrace === -1) {
  console.log('❌ محل درج پیدا نشد');
  process.exit(1);
}
svc = svc.slice(0, lastBrace) + '\n' + helperMethod;

// ۶) در متد log()، بعد از create، checkSuspiciousLogin رو صدا بزن
const logCreate = `      return await this.prisma.auditLog.create({
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

const logCreateReplaced = `      const created = await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          payload: data.payload || undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      // async — آگاهانه await نمی‌کنیم که log سریع باشه
      this.checkSuspiciousLogin(data.ipAddress, data.action, data.entityId).catch(() => {});

      return created;`;

if (svc.includes(logCreate)) {
  svc = svc.replace(logCreate, logCreateReplaced);
  console.log('✅ checkSuspiciousLogin در log');
} else {
  console.log('⚠️ الگوی create پیدا نشد — دستی چک کن');
}

fs.writeFileSync(svcPath, svc, 'utf8');
console.log('\n=== DONE ✅ ===');