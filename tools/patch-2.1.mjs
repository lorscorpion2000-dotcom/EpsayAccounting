// ۲.۱: ثبت لاگ لاگین‌های ناموفق + موفقیت‌آمیز + lockout
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(full) {
  fs.copyFileSync(full, `${full}.bak-${STAMP}`);
  console.log(`  ✅ backup: ${path.basename(full)}`);
}

// ═══════════════════════════════════════════════════════════════
// 1) auth.service.ts — inject AuditService + logs
// ═══════════════════════════════════════════════════════════════
console.log('\n--- auth.service.ts ---');
const svcPath = path.join(BACKEND, 'src', 'modules', 'auth', 'auth.service.ts');
backup(svcPath);
let svc = fs.readFileSync(svcPath, 'utf8');

// ۱.الف) import AuditService
if (!svc.includes('AuditService')) {
  svc = svc.replace(
    `import { validatePassword } from '../../common/validators/password.validator';`,
    `import { validatePassword } from '../../common/validators/password.validator';\nimport { AuditService } from '../audit/audit.service';`
  );
  console.log('  ✅ import AuditService');
}

// ۱.ب) constructor
if (!svc.includes('private audit')) {
  svc = svc.replace(
    `  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}`,
    `  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}`
  );
  console.log('  ✅ constructor با AuditService');
}

// ۱.ج) تغییر امضای login
const oldLoginSig = `async login(dto: LoginDto) {`;
const newLoginSig = `async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {`;
if (svc.includes(oldLoginSig)) {
  svc = svc.replace(oldLoginSig, newLoginSig);
  console.log('  ✅ امضای login با meta');
}

// ۱.د) log برای user not found
svc = svc.replace(
  `    if (!user) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }`,
  `    if (!user) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: dto.username,
        payload: { reason: 'user_not_found', username: dto.username },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});
      throw new UnauthorizedException(GENERIC_ERROR);
    }`
);

// ۱.ه) log برای password wrong
svc = svc.replace(
  `      if (shouldLock) {
        throw new UnauthorizedException(
          \`حساب به‌دلیل \${MAX_ATTEMPTS} تلاش ناموفق، \${LOCK_MINUTES} دقیقه قفل شد\`,
        );
      }
      throw new UnauthorizedException(GENERIC_ERROR);`,
  `      await this.audit.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: user.username,
        payload: { reason: 'wrong_password', attempts },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});

      if (shouldLock) {
        await this.audit.log({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          entity: 'Auth',
          entityId: user.username,
          payload: { attempts, lockMinutes: LOCK_MINUTES },
          ipAddress: meta?.ip,
          userAgent: meta?.ua,
        }).catch(() => {});
        throw new UnauthorizedException(
          \`حساب به‌دلیل \${MAX_ATTEMPTS} تلاش ناموفق، \${LOCK_MINUTES} دقیقه قفل شد\`,
        );
      }
      throw new UnauthorizedException(GENERIC_ERROR);`
);

// ۱.و) log برای login موفق
svc = svc.replace(
  `    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,`,
  `    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'Auth',
      entityId: user.username,
      payload: { username: user.username },
      ipAddress: meta?.ip,
      userAgent: meta?.ua,
    }).catch(() => {});

    return {
      accessToken,
      refreshToken,`
);

// ۱.ز) log برای login از حساب قفل‌شده
svc = svc.replace(
  `      const remainingMin = Math.ceil(remainingMs / 60_000);
      throw new UnauthorizedException(
        \`حساب به‌دلیل تلاش‌های ناموفق موقتاً قفل است. \${remainingMin} دقیقه دیگر تلاش کنید\`,
      );`,
  `      const remainingMin = Math.ceil(remainingMs / 60_000);
      await this.audit.log({
        userId: user.id,
        action: 'LOGIN_BLOCKED_LOCKED',
        entity: 'Auth',
        entityId: user.username,
        payload: { remainingMin },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});
      throw new UnauthorizedException(
        \`حساب به‌دلیل تلاش‌های ناموفق موقتاً قفل است. \${remainingMin} دقیقه دیگر تلاش کنید\`,
      );`
);

fs.writeFileSync(svcPath, svc, 'utf8');
console.log('  ✅ لاگ‌ها اضافه شد');

// ═══════════════════════════════════════════════════════════════
// 2) auth.controller.ts — pass ip + ua
// ═══════════════════════════════════════════════════════════════
console.log('\n--- auth.controller.ts ---');
const ctrlPath = path.join(BACKEND, 'src', 'modules', 'auth', 'auth.controller.ts');
backup(ctrlPath);
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

// import Req
if (!ctrl.includes('Req,')) {
  ctrl = ctrl.replace(
    `import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';`,
    `import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';`
  );
  console.log('  ✅ import Req');
}

// تغییر login controller
const oldLoginCtrl = `  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }`;
const newLoginCtrl = `  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.auth.login(dto, { ip, ua });
  }`;

if (ctrl.includes(oldLoginCtrl)) {
  ctrl = ctrl.replace(oldLoginCtrl, newLoginCtrl);
  console.log('  ✅ login controller با ip/ua');
}

fs.writeFileSync(ctrlPath, ctrl, 'utf8');

console.log('\n══════════════════════════════');
console.log('=== DONE ✅ ===');