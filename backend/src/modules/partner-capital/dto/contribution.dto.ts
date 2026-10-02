import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum ContributionTypeDto { CASH = 'CASH', NON_CASH = 'NON_CASH' }
export enum ContributionCategoryDto {
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PETTY_CASH = 'PETTY_CASH',
  LAND = 'LAND',
  MATERIALS = 'MATERIALS',
  SERVICES = 'SERVICES',
  EQUIPMENT = 'EQUIPMENT',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export class CreateContributionDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;

  @ApiProperty({ enum: ContributionTypeDto })
  @IsEnum(ContributionTypeDto)
  type!: ContributionTypeDto;

  @ApiProperty({ enum: ContributionCategoryDto })
  @IsEnum(ContributionCategoryDto)
  category!: ContributionCategoryDto;

  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty() @IsDateString() contributionDate!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() valuationNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceCode?: string;
}

export class UpdateContributionDto extends CreateContributionDto {}
