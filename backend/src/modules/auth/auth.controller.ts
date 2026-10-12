import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorVerifyLoginDto } from './dto/two-factor.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth - احراز هویت')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.auth.login(dto, { ip, ua });
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

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
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.auth.updatePreferences(userId, dto.themePreference);
  }

  @Patch('change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, body.oldPassword, body.newPassword);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(userId, body);
  }
}