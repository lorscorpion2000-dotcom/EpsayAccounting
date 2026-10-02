import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'accountant' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ example: 'Ø­Ø³Ø§Ø¨Ø¯Ø§Ø±' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Ø¢Ø±Ø§ÛŒÙ‡ Ø´Ù†Ø§Ø³Ù‡ Ù…Ø¬ÙˆØ²Ù‡Ø§' })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}