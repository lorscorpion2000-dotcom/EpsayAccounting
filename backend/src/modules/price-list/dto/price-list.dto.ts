import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PriceListStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum WbsUnitEnum {
  SQUARE_METER = 'SQUARE_METER',
  CUBIC_METER = 'CUBIC_METER',
  LINEAR_METER = 'LINEAR_METER',
  TON = 'TON',
  KILOGRAM = 'KILOGRAM',
  NUMBER = 'NUMBER',
  SERVICE = 'SERVICE',
  LUMP = 'LUMP',
}

export class CreatePriceListDto {
  @ApiProperty({ example: 'ÙÙ‡Ø±Ø³Øª Ø¨Ù‡Ø§ÛŒ Ø§Ø¨Ù†ÛŒÙ‡ Û±Û´Û°Û´' })
  @IsString() @MaxLength(200)
  title: string;

  @ApiProperty({ example: 1404 })
  @IsInt() @Min(1300)
  year: number;

  @ApiProperty({ example: '2025-03-21' })
  @IsString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2026-03-20' })
  @IsOptional() @IsString()
  effectiveTo?: string;

  @ApiPropertyOptional({ enum: PriceListStatusEnum })
  @IsOptional() @IsEnum(PriceListStatusEnum)
  status?: PriceListStatusEnum;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

export class UpdatePriceListDto extends PartialType(CreatePriceListDto) {}

export class CreatePriceListItemDto {
  @ApiProperty({ example: '321' })
  @IsString() @MaxLength(64)
  code: string;

  @ApiProperty({ example: 'ØªÙ‡ÛŒÙ‡ Ùˆ Ø§Ø¬Ø±Ø§ÛŒ Ø¨ØªÙ†' })
  @IsString() @MaxLength(500)
  description: string;

  @ApiProperty({ enum: WbsUnitEnum })
  @IsEnum(WbsUnitEnum)
  unit: WbsUnitEnum;

  @ApiProperty({ example: 17471160000 })
  @IsNumber() @Min(0)
  basePrice: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  chapter?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class UpdatePriceListItemDto extends PartialType(CreatePriceListItemDto) {}

export class ImportItemsDto {
  @ApiProperty({ type: [CreatePriceListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceListItemDto)
  items: CreatePriceListItemDto[];
}

export class LinkWbsDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  priceListItemId: string | null;
}