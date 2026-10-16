import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { validatePassword } from '../../common/validators/password.validator';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from './two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
    private twoFactor: TwoFactorService,
  ) {}
  // P1 — scope پروژه‌ای کاربر
  private async buildUserScope(userId: string) {
    const links = await this.prisma.userProject.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return links.map((l) => l.projectId);
  }
  // ─── helper ها برای صدور توکن ───
  private signAccessToken(user: { id: string; username: string }): string {
    return this.jwt.sign(
      { sub: user.id, username: user.username },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      },
    );
  }

  private signRefreshToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );
  }



  async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {
    const MAX_ATTEMPTS = 5;
    const LOCK_MINUTES = 5;

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
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

    // نکته امنیتی: پیام خطا یکسان برای «کاربر نیست» و «رمز غلط» (ضد user enumeration)
    const GENERIC_ERROR = 'نام کاربری یا رمز عبور اشتباه است';

    if (!user) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: dto.username,
        payload: { reason: 'user_not_found', username: dto.username },
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
      }).catch(() => {});
      throw new UnauthorizedException(GENERIC_ERROR);
    }

    // چک قفل بودن حساب
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
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
        `حساب به‌دلیل تلاش‌های ناموفق موقتاً قفل است. ${remainingMin} دقیقه دیگر تلاش کنید`,
      );
    }

    // اگه قفل منقضی شده، پاکش کن (در ادامه هم reset می‌شه)
    const shouldResetLock = user.lockedUntil && user.lockedUntil <= new Date();

    if (!user.isActive) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);

    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : shouldResetLock
              ? null
              : user.lockedUntil,
        },
      });

      await this.audit.log({
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
          `حساب به‌دلیل ${MAX_ATTEMPTS} تلاش ناموفق، ${LOCK_MINUTES} دقیقه قفل شد`,
        );
      }
      throw new UnauthorizedException(GENERIC_ERROR);
    }

    // رمز درست — reset شمارنده + آپدیت lastLoginAt
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

    // اگه 2FA فعاله، challenge بده و ادامه نده
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
      action: 'LOGIN_SUCCESS',
      entity: 'Auth',
      entityId: user.username,
      payload: { username: user.username },
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
        isStaff: user.isStaff,
        projectIds: await this.buildUserScope(user.id),
        defaultProjectId: user.defaultProjectId,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    if (!user) throw new UnauthorizedException();

    const permissions = new Set<string>();
    user.roles.forEach((ur) =>
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.code)),
    );

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      roles: user.roles.map((r) => r.role.code),
      permissions: Array.from(permissions),
      lastLoginAt: user.lastLoginAt,
      themePreference: user.themePreference,
      isStaff: user.isStaff,
      projectIds: await this.buildUserScope(user.id),
      defaultProjectId: user.defaultProjectId,
    };
  }

  async updatePreferences(userId: string, themePreference?: string) {
    const data: any = {};
    if (themePreference !== undefined) data.themePreference = themePreference;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, themePreference: true },
    });
    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('کاربر پیدا نشد');

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('رمز عبور فعلی اشتباه است');

    const pwErrors = validatePassword(newPassword, user.username);
    if (pwErrors.length) {
      throw new BadRequestException(
        'رمز عبور ضعیف است: ' + pwErrors.join('، '),
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { success: true, message: 'رمز عبور تغییر کرد' };
  }

  async updateProfile(userId: string, data: { fullName?: string; email?: string; mobile?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        email: data.email || null,
        mobile: data.mobile || null,
      },
      select: { id: true, username: true, fullName: true, email: true, mobile: true },
    });
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      }) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر یا منقضی شده است');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('کاربر یافت نشد یا غیرفعال است');
    }

    const accessToken = this.signAccessToken(user);
    const refreshTokenNew = this.signRefreshToken(user.id);

    return { accessToken, refreshToken: refreshTokenNew };
  }

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

    let ok = await this.twoFactor.verifyCode(user.twoFactorSecret, code);
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
        isStaff: user.isStaff,
        projectIds: await this.buildUserScope(user.id),
        defaultProjectId: user.defaultProjectId,
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

    const ok = await this.twoFactor.verifyCode(user.twoFactorSecret, code);
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
        twoFactorRecoveryCodes: Prisma.JsonNull,
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
