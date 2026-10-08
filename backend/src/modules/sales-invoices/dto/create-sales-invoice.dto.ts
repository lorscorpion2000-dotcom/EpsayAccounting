import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateSIItemDto {
  @IsOptional() @IsNumber() rowNumber?: number;
  @IsString() @MaxLength(500) description!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsString() @MaxLength(32) unit?: string | null;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsNumber() @Min(0) totalPrice?: number;
  @IsOptional() @IsUUID() accountId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}

export class CreateSalesInvoiceDto {
  @IsString() @MaxLength(64) invoiceNumber!: string;
  @IsDateString() invoiceDate!: string;
  @IsOptional() @IsDateString() dueDate?: string | null;

  @IsString() customerId!: string;   // cuid — SalesCustomer.id

  @IsOptional() @IsString() contractId?: string | null;  // cuid — SalesContract.id
  @IsOptional() @IsUUID() projectId?: string | null;

  @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateSIItemDto)
  items!: CreateSIItemDto[];
}

export { CreateSIItemDto };