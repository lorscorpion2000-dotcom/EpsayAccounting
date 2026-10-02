import {
  IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentInputDto {
  @IsNumber() @Type(() => Number) sequence!: number;
  @IsDateString() dueDate!: string;
  @IsNumber() @Type(() => Number) amount!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateSalesContractDto {
  @IsString() unitId!: string;
  @IsString() customerId!: string;

  @IsNumber() @Type(() => Number) totalPrice!: number;
  @IsOptional() @IsNumber() @Type(() => Number) discountAmount?: number;
  @IsNumber() @Type(() => Number) finalPrice!: number;
  @IsOptional() @IsNumber() @Type(() => Number) downPayment?: number;

  @IsDateString() contractDate!: string;
  @IsOptional() @IsDateString() deliveryDate?: string;

  @IsOptional() @IsString() bodyHtml?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentInputDto)
  installments?: InstallmentInputDto[];
}

export class UpdateSalesContractDto extends CreateSalesContractDto {}

export class CancelSalesContractDto {
  @IsString() reason!: string;
}
