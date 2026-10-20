import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsNumber, IsInt, IsBoolean, IsDateString, IsUUID,
} from 'class-validator';

export enum ProjectTypeDto {
  MAIN_CONTRACTOR = 'MAIN_CONTRACTOR',
  SELF_OWNER = 'SELF_OWNER',
  PARTNERSHIP = 'PARTNERSHIP',
}

export enum ProjectStatusDto {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectUsageDto {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  OFFICE = 'OFFICE',
  HOSPITAL = 'HOSPITAL',
  INDUSTRIAL = 'INDUSTRIAL',
  CIVIL = 'CIVIL',
  OTHER = 'OTHER',
}

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ProjectTypeDto })
  @IsOptional()
  @IsEnum(ProjectTypeDto)
  type?: ProjectTypeDto;

  @ApiPropertyOptional({ enum: ProjectStatusDto })
  @IsOptional()
  @IsEnum(ProjectStatusDto)
  status?: ProjectStatusDto;

  @ApiPropertyOptional({ enum: ProjectUsageDto })
  @IsOptional()
  @IsEnum(ProjectUsageDto)
  usage?: ProjectUsageDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  consultantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchasingOfficerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressFull?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floorsCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}