import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, IsIn, MaxLength, Min } from 'class-validator';

export class PaySupplierDto {
  @IsUUID() invoiceId!: string;

  @IsIn(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']) method!: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

  @IsOptional() @IsUUID() bankAccountId?: string | null;

  @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() paymentDate!: string;
  @IsOptional() @IsString() @MaxLength(128) reference?: string | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
}