import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePIItemDto } from './create-purchase-invoice.dto';

export class UpdatePurchaseInvoiceDto {
  @IsOptional() @IsString() @MaxLength(64) invoiceNumber?: string;
  @IsOptional() @IsDateString() invoiceDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePIItemDto)
  items?: CreatePIItemDto[];
}