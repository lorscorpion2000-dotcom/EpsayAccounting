import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateShareDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) sharePercent!: number;
  @ApiProperty() @IsDateString() effectiveFrom!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() usdRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valuationAmountUsd?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valuationAmountRial?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateShareDto extends CreateShareDto {}

export class AddPartnerWithDilutionDto {
  @ApiProperty({ description: 'شناسه پروژه' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'شناسه شریک جدید' })
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ description: 'مبلغ آورده ارزی شریک (دلار)' })
  @IsNumber()
  @Min(0.01)
  contributionUsd!: number;

  @ApiProperty({ description: 'نرخ روز دلار (ریال)' })
  @IsNumber()
  @Min(1)
  usdRate!: number;

  @ApiProperty({ description: 'ارزش ارزی فعلی پروژه قبل از ورود شریک (دلار)' })
  @IsNumber()
  @Min(0)
  currentProjectValuationUsd!: number;

  @ApiProperty({ description: 'تاریخ اعمال سهم جدید' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsOptional()
  @IsString()
  notes?: string;
}
