import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 'modern-saas' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  themePreference?: string;
}
