import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt, IsDateString, IsBoolean,
  IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LegalContractKindDto {
  WORKER_EMPLOYMENT = 'WORKER_EMPLOYMENT',
  CONTRACTOR_AGREEMENT = 'CONTRACTOR_AGREEMENT',
  CLIENT_CONTRACT = 'CLIENT_CONTRACT',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
}

export class CreateLegalContractDto {
  @IsEnum(LegalContractKindDto) kind!: LegalContractKindDto;

  @IsString() title!: string;
  @IsString() partyId!: string;

  @IsOptional() @IsString() projectId?: string;

  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsDateString() registrationDate?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() bodyHtml?: string;

  @IsOptional() @IsNumber() @Type(() => Number) totalAmount?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryMonthly?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryDaily?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryHourly?: number;
  @IsOptional() @IsInt() @Type(() => Number) workHoursPerWeek?: number;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() durationText?: string;
  @IsOptional() @IsString() workLocation?: string;

  @IsOptional() @IsString() guaranteeType?: string;
  @IsOptional() @IsString() guaranteeNumber?: string;
  @IsOptional() @IsNumber() @Type(() => Number) guaranteeAmount?: number;
  @IsOptional() @IsString() guaranteeBank?: string;

  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional() @IsString() companySignerName?: string;
  @IsOptional() @IsString() workerSignerName?: string;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LegalContractItemDto)
  items?: LegalContractItemDto[];
}

export class LegalContractItemDto {
  @IsOptional() @IsInt() @Type(() => Number) rowNumber?: number;

  @IsString() description!: string;

  @IsOptional() @IsString() unit?: string;

  @IsOptional() @IsNumber() @Type(() => Number) quantity?: number;
  @IsOptional() @IsNumber() @Type(() => Number) unitPrice?: number;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateLegalContractDto extends CreateLegalContractDto {}

export class CancelLegalContractDto {
  @IsString() reason!: string;
}
