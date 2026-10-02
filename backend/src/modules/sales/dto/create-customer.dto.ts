import { IsString, IsOptional } from 'class-validator';

export class CreateSalesCustomerDto {
  @IsString() fullName!: string;

  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() mobilePhone?: string;
  @IsOptional() @IsString() landlinePhone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() bankSheba?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSalesCustomerDto extends CreateSalesCustomerDto {}
