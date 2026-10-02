import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateFiscalYearDto {
  @ApiProperty({ example: '1404' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'سال مالی ۱۴۰۴' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2025-03-21' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-03-20' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
