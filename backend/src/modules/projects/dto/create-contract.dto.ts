import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsNumber, IsInt, IsDateString, IsUUID, IsArray,
} from 'class-validator';

export enum ContractTypeDto {
  LUMP_SUM = 'LUMP_SUM',
  UNIT_PRICE = 'UNIT_PRICE',
  PERCENTAGE = 'PERCENTAGE',
  TRUST = 'TRUST',
}

export enum ContractStatusDto {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
}

export class CreateContractDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({ enum: ContractTypeDto })
  @IsOptional()
  @IsEnum(ContractTypeDto)
  type?: ContractTypeDto;

  @ApiPropertyOptional({ enum: ContractStatusDto })
  @IsOptional()
  @IsEnum(ContractStatusDto)
  status?: ContractStatusDto;

  @ApiProperty()
  @IsNumber()
  baseAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  coefficient?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  signDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  durationUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prepaymentPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prepaymentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  prepaymentDepreciationPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  insurancePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  retentionPercent?: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  otherDeductions?: { name: string; percent: number }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
