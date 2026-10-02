import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class SupplierSelectionDto {
  @ApiProperty()
  @IsUUID()
  supplierId!: string;
}

export class CreateRFQDto {
  @ApiProperty()
  @IsUUID()
  prId!: string;

  @ApiProperty()
  @IsDateString()
  rfqDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minSuppliers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [SupplierSelectionDto], description: 'لیست تأمین‌کنندگان برای ارسال استعلام' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierSelectionDto)
  suppliers!: SupplierSelectionDto[];
}
