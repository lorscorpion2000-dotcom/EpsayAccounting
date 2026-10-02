import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'ali' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'Ali@1404' })
  @IsString()
  @MinLength(4)
  password!: string;

  @ApiProperty({ example: 'Ø¹Ù„ÛŒ Ø±Ø¶Ø§ÛŒÛŒ' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'ali@epsay.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '09120000000' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  nationalCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Ø¢Ø±Ø§ÛŒÙ‡ Ø´Ù†Ø§Ø³Ù‡ Ù†Ù‚Ø´â€ŒÙ‡Ø§' })
  @IsOptional()
  @IsArray()
  roleIds?: string[];
}