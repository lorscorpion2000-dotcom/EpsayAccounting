import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
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
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(userId, body.oldPassword, body.newPassword);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { fullName?: string; email?: string; mobile?: string },
  ) {
    return this.auth.updateProfile(userId, body);
  }
}