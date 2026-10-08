import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { validatePassword } from '../../common/validators/password.validator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}
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
}
