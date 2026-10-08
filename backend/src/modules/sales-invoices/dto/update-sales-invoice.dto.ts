import { IsString, IsOptional, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';

export class UpdateSalesInvoiceDto {
  @IsOptional() @IsString() @MaxLength(64) invoiceNumber?: string;
  @IsOptional() @IsDateString() invoiceDate?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}