import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CSStatusEnum {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum CSCategoryEnum {
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR',
  MISC = 'MISC',
  TRANSPORT = 'TRANSPORT',
  EQUIPMENT = 'EQUIPMENT',
}

export class CSItemDto {
  @ApiProperty({ enum: CSCategoryEnum })
  @IsEnum(CSCategoryEnum)
  category: CSCategoryEnum;

  @ApiPropertyOptional({ example: '321' })
  @IsOptional() @IsString() @MaxLength(64)
  priceListCode?: string;

  @ApiProperty({ example: 'خرید بتن' })
  @IsString() @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'مترمکعب' })
  @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiProperty({ example: 7683539850 })
  @IsNumber() @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional() @IsString()
  itemDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class UpdateCSItemDto {
  @ApiPropertyOptional({ enum: CSCategoryEnum })
  @IsOptional() @IsEnum(CSCategoryEnum)
  category?: CSCategoryEnum;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(64)
  priceListCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  itemDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class CreateCSDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contractId?: string;

  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() @Min(1)
  statementNumber?: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  periodStart: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsString()
  periodEnd: string;

  @ApiPropertyOptional({ example: 1.07, default: 1.07 })
  @IsOptional() @IsNumber() @Min(0)
  coefficient?: number;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional() @IsNumber() @Min(0)
  contractorSharePercent?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @IsNumber() @Min(0)
  prepaymentDeductionPercent?: number;

  @ApiPropertyOptional({ description: 'Override computed contractor share amount' })
  @IsOptional() @IsNumber() @Min(0)
  contractorShareAmount?: number;

  @ApiPropertyOptional({ description: 'Override computed net payable' })
  @IsOptional() @IsNumber() @Min(0)
  netPayable?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [CSItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CSItemDto)
  items?: CSItemDto[];
}

export class UpdateCSDto extends PartialType(CreateCSDto) {}

export class ImportCSItemsDto {
  @ApiProperty({ enum: CSCategoryEnum })
  @IsEnum(CSCategoryEnum)
  category: CSCategoryEnum;

  @ApiProperty({ type: [CSItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CSItemDto)
  items: CSItemDto[];
}

export class RejectCSDto {
  @ApiProperty() @IsString() @MaxLength(500)
  reason: string;
}
