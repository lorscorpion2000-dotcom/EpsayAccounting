import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum InsuranceTypeDto {
  THIRD_PARTY = 'THIRD_PARTY',
  ACCIDENT = 'ACCIDENT',
  FIRE = 'FIRE',
  EQUIPMENT = 'EQUIPMENT',
  OTHER = 'OTHER',
}

export class CreateInsuranceDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ enum: InsuranceTypeDto }) @IsEnum(InsuranceTypeDto) type!: InsuranceTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insurer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() policyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) premiumAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateInsuranceDto extends CreateInsuranceDto {}
