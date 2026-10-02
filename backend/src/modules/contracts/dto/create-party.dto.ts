import {
  IsString, IsOptional, IsEnum, IsInt, IsDateString, Min,
} from 'class-validator';

export enum LegalContractPartyKindDto {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export class CreateLegalPartyDto {
  @IsEnum(LegalContractPartyKindDto)
  kind!: LegalContractPartyKindDto;

  @IsString() fullName!: string;

  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() economicCode?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() mobilePhone?: string;
  @IsOptional() @IsString() landlinePhone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsInt() @Min(0) childrenCount?: number;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() job?: string;
  @IsOptional() @IsString() insuranceNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankSheba?: string;
  @IsOptional() @IsString() notes?: string;
}
