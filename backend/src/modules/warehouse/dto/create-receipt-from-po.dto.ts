import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class ReceiptFromPoItemDto {
  @ApiProperty() @IsUUID() itemId!: string;
  @ApiProperty() @IsUUID() poItemId!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) unitCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) additionAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) deductionAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) shippingCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) loadingCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateReceiptFromPoDto {
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiProperty() @IsDateString() receiptDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehiclePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [ReceiptFromPoItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiptFromPoItemDto)
  items!: ReceiptFromPoItemDto[];
}
