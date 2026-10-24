// backend/src/modules/auth/auth.controller.ts
import {
  Controller, Post, Get, Patch, Body, UseGuards, Req, Ip,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorVerifyLoginDto } from './dto/two-factor.dto';

export interface AuthUserPayload {
  id: string;
  username?: string;
  fullName?: string;
  roles?: string[];
  permissions?: string[];
}

export type AuthenticatedRequest = Request & {
  user?: AuthUserPayload;
  id?: string;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'ورود به سامانه' })
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest, @Ip() ip?: string) {
    return this.authService.login(dto, { ip, ua: req.headers?.['user-agent'] });
  }

  // ⚠️ NEW: endpoint تأیید کد 2FA بعد از login اولیه (public — قبل از صدور توکن کامل)
  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'تأیید کد دومرحله‌ای (پس از login)' })
  async verify2FALogin(
    @Body() dto: TwoFactorVerifyLoginDto,
    @Req() req: AuthenticatedRequest,
    @Ip() ip?: string,
  ) {
    return this.authService.verify2FALogin(dto.totpToken, dto.code, {
      ip, ua: req.headers?.['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'تمدید توکن' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.me((req.user?.id || req.id) as string);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user!.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user!.id, dto);
  }

  // ⚠️ CRITICAL FIX: pass strings to service (not DTO object)
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر کلمه عبور' })
  async changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user!.id,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  // ⚠️ FIX: pass themePreference string (not DTO)
  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تنظیمات شخصی کاربر' })
  async updatePreferences(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePreferencesDto) {
    return this.authService.updatePreferences(req.user!.id, dto.themePreference);
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async status2fa(@Req() req: AuthenticatedRequest) {
    return this.authService.status2FA(req.user!.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async setup2fa(@Req() req: AuthenticatedRequest) {
    return this.authService.setup2FA(req.user!.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async enable2fa(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enable2FA(req.user!.id, dto.code);
  }

  @Post('2fa/verify-authenticated')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تأیید کد در حالت احراز هویت‌شده' })
  async verify2faAuthenticated(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enable2FA(req.user!.id, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async disable2fa(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorDisableDto) {
    return this.authService.disable2FA(req.user!.id, dto.password);
  }
}
