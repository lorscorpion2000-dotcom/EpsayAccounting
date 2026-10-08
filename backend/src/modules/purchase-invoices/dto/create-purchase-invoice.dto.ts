import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, IsIn, MaxLength, Min, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class CreatePIItemDto {
  @IsOptional() @IsNumber() rowNumber?: number;
  @IsString() @MaxLength(500) description!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsNumber() @Min(0) totalPrice?: number;
  @IsOptional() @IsUUID() accountId?: string | null;
  @IsOptional() @IsUUID() wbsItemId?: string | null;
  @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsNumber() @Min(0) additionAmount?: number;
  @IsOptional() @IsNumber() @Min(0) deductionAmount?: number;
  @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @IsOptional() @IsNumber() @Min(0) shippingCost?: number;
  @IsOptional() @IsNumber() @Min(0) loadingCost?: number;
  @IsOptional() @IsBoolean() isCapital?: boolean;
  @IsOptional() @IsNumber() @Min(1) usefulLifeMonths?: number | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}

export class CreatePurchaseInvoiceDto {
  @IsString() @MaxLength(64) invoiceNumber!: string;
  @IsDateString() invoiceDate!: string;
  @IsOptional() @IsDateString() dueDate?: string | null;

  @IsUUID() supplierId!: string;
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() poId?: string | null;
  @IsOptional() @IsUUID() grId?: string | null;

  @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePIItemDto)
  items!: CreatePIItemDto[];
}

export { CreatePIItemDto };