import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';

export enum BankAccountTypeDto {
  BANK = 'BANK',
  CASH_REGISTER = 'CASH_REGISTER',
}

export class CreateBankAccountDto {
  @IsOptional() @IsEnum(BankAccountTypeDto) type?: BankAccountTypeDto;

  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(200) bankName?: string;
  @IsOptional() @IsString() @MaxLength(200) branchName?: string;
  @IsOptional() @IsString() @MaxLength(64) accountNumber?: string;
  @IsOptional() @IsString() @MaxLength(64) shabaNumber?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}