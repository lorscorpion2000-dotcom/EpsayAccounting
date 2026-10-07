import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
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
    if (!user || !user.isActive) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = new Set<string>();
    user.roles.forEach((ur) =>
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.code)),
    );

    const token = this.jwt.sign(
      { sub: user.id, username: user.username },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      },
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        roles: user.roles.map((r) => r.role.code),
        permissions: Array.from(permissions),
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

    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('رمز جدید باید حداقل ۶ کاراکتر باشد');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
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
}