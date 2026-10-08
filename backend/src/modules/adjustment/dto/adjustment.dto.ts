import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum AdjStatusEnum {
  DRAFT = 'DRAFT', CONFIRMED = 'CONFIRMED', POSTED = 'POSTED', CANCELLED = 'CANCELLED',
}

// ═══ Adjustment Index ═══
export class CreateIndexDto {
  @ApiProperty({ example: 1404 }) @IsInt() @Min(1300)
  year: number;

  @ApiProperty({ example: 7 }) @IsInt() @Min(1)
  month: number;

  @ApiProperty({ example: 'ابنیه' }) @IsString() @MaxLength(100)
  category: string;

  @ApiProperty({ example: 1234.5678 }) @IsNumber()
  indexValue: number;

  @ApiProperty({ example: 1396 }) @IsInt() @Min(1300)
  baseYear: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateIndexDto extends PartialType(CreateIndexDto) {}

// ═══ Adjustment Calculation ═══
export class CalculateAdjDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contractId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  statementId?: string;

  @ApiProperty({ example: '2026-08-01' }) @IsString()
  periodFrom: string;

  @ApiProperty({ example: '2026-08-31' }) @IsString()
  periodTo: string;

  @ApiProperty({ example: 'ابنیه' }) @IsString() @MaxLength(100)
  category: string;

  @ApiProperty({ example: 5000000000 }) @IsNumber() @Min(0)
  baseAmount: number;

  @ApiProperty({ example: 1404 }) @IsInt()
  currentYear: number;

  @ApiProperty({ example: 7 }) @IsInt()
  currentMonth: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

// ═══ Material Price Diff ═══
export class CreateMPDDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contractId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  statementId?: string;

  @ApiProperty({ example: 'میلگرد' }) @IsString() @MaxLength(100)
  materialType: string;

  @ApiPropertyOptional({ example: 'کیلوگرم' }) @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiProperty({ example: 100000 }) @IsNumber() @Min(0)
  quantity: number;

  @ApiProperty({ example: 450000 }) @IsNumber() @Min(0)
  basePrice: number;

  @ApiProperty({ example: 520000 }) @IsNumber() @Min(0)
  actualPrice: number;

  @ApiProperty({ example: '2026-08-01' }) @IsString()
  periodFrom: string;

  @ApiProperty({ example: '2026-08-31' }) @IsString()
  periodTo: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
