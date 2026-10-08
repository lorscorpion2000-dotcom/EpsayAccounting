import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'accountant' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ example: 'حسابدار' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'آرایه شناسه مجوزها' })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}