import fs from 'node:fs';
import path from 'node:path';

const AUTH = 'E:\\EpsayAccounting\\backend\\src\\modules\\auth';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(p) { fs.copyFileSync(p, `${p}.bak-${STAMP}`); console.log(`OK backup ${path.basename(p)}`); }

// ═══════════════════════════════════════
// 1) auth.module.ts — add TwoFactorService
// ═══════════════════════════════════════
const modulePath = path.join(AUTH, 'auth.module.ts');
backup(modulePath);
let mod = fs.readFileSync(modulePath, 'utf8');
if (!mod.includes('TwoFactorService')) {
  mod = mod.replace(
    "import { JwtStrategy } from './strategies/jwt.strategy';",
    "import { JwtStrategy } from './strategies/jwt.strategy';\nimport { TwoFactorService } from './two-factor.service';"
  );
  mod = mod.replace(
    "providers: [AuthService, JwtStrategy],",
    "providers: [AuthService, JwtStrategy, TwoFactorService],"
  );
  fs.writeFileSync(modulePath, mod, 'utf8');
  console.log('OK auth.module.ts updated');
}

// ═══════════════════════════════════════
// 2) auth.service.ts — inject + 2FA login + methods
// ═══════════════════════════════════════
const svcPath = path.join(AUTH, 'auth.service.ts');
backup(svcPath);
let svc = fs.readFileSync(svcPath, 'utf8');

// import
if (!svc.includes('TwoFactorService')) {
  svc = svc.replace(
    "import { AuditService } from '../audit/audit.service';",
    "import { AuditService } from '../audit/audit.service';\nimport { TwoFactorService } from './two-factor.service';"
  );
  console.log('OK import TwoFactorService');
}

// constructor
if (!svc.includes('private twoFactor')) {
  svc = svc.replace(
    /constructor\(\s*private prisma: PrismaService,\s*private jwt: JwtService,\s*private config: ConfigService,\s*private audit: AuditService,\s*\)/,
    `constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
    private twoFactor: TwoFactorService,
  )`
  );
  console.log('OK constructor');
}

// login — 2FA branch: قبل از signAccessToken
const beforeSign = `    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',`;

const newBranch = `    // اگه 2FA فعاله، challenge بده و ادامه نده
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const totpToken = this.twoFactor.signTotpPendingToken(user.id);

      await this.audit.log({
        userId: user.id,
        action: 'LOGIN_2FA_REQUIRED',
        entity: 'Auth',
        entityId: user.username,
        payload: { username: user.username },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});

      return {
        requiresTwoFactor: true,
        totpToken,
      };
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',`;

if (svc.includes(beforeSign)) {
  svc = svc.replace(beforeSign, newBranch);
  console.log('OK login 2FA branch');
} else {
  console.log('WARN: login marker not found');
}

// افزودن متدها قبل از آخرین }
const methods = `
  // ─── 2FA: verify login (public) ───
  async verify2FALogin(
    totpToken: string,
    code: string,
    meta?: { ip?: string; ua?: string },
  ) {
    const { sub } = this.twoFactor.verifyTotpPendingToken(totpToken);

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('کاربر یافت نشد یا غیرفعال است');
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA برای این کاربر فعال نیست');
    }

    let ok = this.twoFactor.verifyCode(user.twoFactorSecret, code);
    let usedRecovery = false;

    if (!ok && user.twoFactorRecoveryCodes) {
      const res = await this.twoFactor.verifyAndConsumeRecoveryCode(
        user.twoFactorRecoveryCodes as any[],
        code,
      );
      if (res.ok && res.newCodes) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { twoFactorRecoveryCodes: res.newCodes as any },
        });
        ok = true;
        usedRecovery = true;
      }
    }

    if (!ok) {
      await this.audit.log({
        userId: user.id,
        action: 'LOGIN_2FA_FAILED',
        entity: 'Auth',
        entityId: user.username,
        payload: { username: user.username },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});
      throw new UnauthorizedException('کد تأیید نامعتبر است');
    }

    // reset counters + last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const permissions = new Set<string>();
    user.roles.forEach((ur) =>
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.code)),
    );

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user.id);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS_2FA',
      entity: 'Auth',
      entityId: user.username,
      payload: { username: user.username, usedRecovery },
      ipAddress: meta?.ip,
      userAgent: meta?.ua,
    }).catch(() => {});

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        roles: user.roles.map((r) => r.role.code),
        permissions: Array.from(permissions),
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // ─── 2FA: setup (protected) ───
  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('کاربر یافت نشد');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA قبلاً فعال است');
    }

    const secret = this.twoFactor.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const { otpauth, qrDataUrl } = await this.twoFactor.generateQRCode(
      user.username,
      secret,
    );

    return { otpauth, qrDataUrl, secret };
  }

  // ─── 2FA: enable (protected) ───
  async enable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('کاربر یافت نشد');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA قبلاً فعال است');
    }
    if (!user.twoFactorSecret) {
      throw new BadRequestException('ابتدا setup را اجرا کنید');
    }

    const ok = this.twoFactor.verifyCode(user.twoFactorSecret, code);
    if (!ok) throw new BadRequestException('کد نامعتبر است');

    const recoveryCodes = this.twoFactor.generateRecoveryCodes(8);
    const hashed = await this.twoFactor.hashRecoveryCodes(recoveryCodes);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
        twoFactorRecoveryCodes: hashed as any,
      },
    });

    await this.audit.log({
      userId,
      action: '2FA_ENABLED',
      entity: 'Auth',
      entityId: user.username,
    }).catch(() => {});

    return { success: true, recoveryCodes };
  }

  // ─── 2FA: disable (protected) ───
  async disable2FA(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('کاربر یافت نشد');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('رمز عبور اشتباه است');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: null,
        twoFactorEnabledAt: null,
      },
    });

    await this.audit.log({
      userId,
      action: '2FA_DISABLED',
      entity: 'Auth',
      entityId: user.username,
    }).catch(() => {});

    return { success: true };
  }

  // ─── 2FA: status (protected) ───
  async status2FA(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorEnabledAt: true },
    });
    return {
      enabled: user?.twoFactorEnabled || false,
      enabledAt: user?.twoFactorEnabledAt || null,
    };
  }
}
`;

const lastBrace = svc.lastIndexOf('\n}');
svc = svc.slice(0, lastBrace) + '\n' + methods;
fs.writeFileSync(svcPath, svc, 'utf8');
console.log('OK auth.service.ts methods');

// ═══════════════════════════════════════
// 3) auth.controller.ts — endpoints
// ═══════════════════════════════════════
const ctrlPath = path.join(AUTH, 'auth.controller.ts');
backup(ctrlPath);
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

if (!ctrl.includes('TwoFactorCodeDto')) {
  ctrl = ctrl.replace(
    "import { RefreshTokenDto } from './dto/refresh-token.dto';",
    "import { RefreshTokenDto } from './dto/refresh-token.dto';\nimport { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorVerifyLoginDto } from './dto/two-factor.dto';"
  );
  console.log('OK controller imports');
}

// public verify endpoint — بعد از refresh
const refreshBlock = `  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }`;

const newEndpoints = `${refreshBlock}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('2fa/verify')
  verify2FA(@Body() dto: TwoFactorVerifyLoginDto, @Req() req: any) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.auth.verify2FALogin(dto.totpToken, dto.code, { ip, ua });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  status2FA(@CurrentUser('id') userId: string) {
    return this.auth.status2FA(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2FA(@CurrentUser('id') userId: string) {
    return this.auth.setup2FA(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enable2FA(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    return this.auth.enable2FA(userId, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable2FA(@CurrentUser('id') userId: string, @Body() dto: TwoFactorDisableDto) {
    return this.auth.disable2FA(userId, dto.password);
  }`;

if (ctrl.includes(refreshBlock) && !ctrl.includes("'2fa/verify'")) {
  ctrl = ctrl.replace(refreshBlock, newEndpoints);
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('OK controller 2FA endpoints');
} else if (ctrl.includes("'2fa/verify'")) {
  console.log('INFO: endpoints already exist');
} else {
  console.log('WARN: refresh block not found in controller');
}

console.log('=== DONE 6.2b ===');