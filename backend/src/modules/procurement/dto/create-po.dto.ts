import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID,
  Min, ValidateNested,
} from 'class-validator';
import { PRItemUnitDto } from './create-pr.dto';

export enum POStatusDto {
  DRAFT='DRAFT', APPROVED='APPROVED', SENT='SENT',
  PARTIALLY_RECEIVED='PARTIALLY_RECEIVED', RECEIVED='RECEIVED', CANCELLED='CANCELLED',
}

export class POItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ enum: PRItemUnitDto })
  @IsEnum(PRItemUnitDto)
  unit!: PRItemUnitDto;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePODto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  prId?: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty()
    @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsDateString()
  poDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [POItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemDto)
  items!: POItemDto[];
}
