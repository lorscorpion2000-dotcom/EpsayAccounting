import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesPaymentDto {
  @IsString() contractId!: string;
  @IsNumber() @Type(() => Number) amount!: number;
  @IsDateString() paidAt!: string;

  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() notes?: string;
}
