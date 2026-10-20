import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { TwoFactorCodeDto, TwoFactorDisableDto } from './dto/two-factor.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'ورود به سامانه' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'تمدید توکن' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر جاری' })
  async getProfile(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر جاری (me)' })
  async getMe(@Req() req: any) {
    return this.authService.me(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'به‌روزرسانی پروفایل' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return (this.authService as any).updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغییر کلمه عبور' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return (this.authService as any).changePassword(req.user.id, dto);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تنظیمات شخصی کاربر' })
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    return (this.authService as any).updatePreferences(req.user.id, dto);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'راه‌اندازی احراز هویت دو مرحله‌ای' })
  async setup2fa(@Req() req: any) {
    return this.authService.setup2FA(req.user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تایید و فعال‌سازی احراز هویت دو مرحله‌ای' })
  async verify2fa(@Req() req: any, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enable2FA(req.user.id, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'غیرفعال‌سازی احراز هویت دو مرحله‌ای' })
  async disable2fa(@Req() req: any, @Body() dto: TwoFactorDisableDto) {
    return this.authService.disable2FA(req.user.id, dto.password);
  }
}
