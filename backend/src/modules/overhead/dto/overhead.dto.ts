import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OverheadMethodEnum {
  PERCENT_CONTRACT = 'PERCENT_CONTRACT',
  PERCENT_REVENUE = 'PERCENT_REVENUE',
  MANUAL = 'MANUAL',
}

export class OverheadItemDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiProperty({ example: 25.5 }) @IsNumber() @Min(0)
  percent: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class CreateOverheadDto {
  @ApiProperty() @IsString()
  fiscalYearId: string;

  @ApiProperty({ example: '2026-10' }) @IsString()
  periodMonth: string;

  @ApiProperty({ enum: OverheadMethodEnum })
  @IsEnum(OverheadMethodEnum)
  method: OverheadMethodEnum;

  @ApiProperty({ example: 500000000 }) @IsNumber() @Min(0)
  totalAmount: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  sourceAccountId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  destAccountId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [OverheadItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OverheadItemDto)
  items?: OverheadItemDto[];
}

export class UpdateOverheadDto extends PartialType(CreateOverheadDto) {}

export class PreviewDto {
  @ApiProperty() @IsString()
  fiscalYearId: string;

  @ApiProperty({ example: '2026-10' }) @IsString()
  periodMonth: string;

  @ApiProperty({ enum: OverheadMethodEnum })
  @IsEnum(OverheadMethodEnum)
  method: OverheadMethodEnum;

  @ApiProperty({ example: 500000000 }) @IsNumber() @Min(0)
  totalAmount: number;
}
