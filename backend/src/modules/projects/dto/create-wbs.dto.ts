import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsNumber, IsInt, IsUUID,
} from 'class-validator';

export enum WbsUnitDto {
  SQUARE_METER = 'SQUARE_METER',
  CUBIC_METER = 'CUBIC_METER',
  LINEAR_METER = 'LINEAR_METER',
  TON = 'TON',
  KILOGRAM = 'KILOGRAM',
  NUMBER = 'NUMBER',
  SERVICE = 'SERVICE',
  LUMP = 'LUMP',
}

export enum WbsLevelDto {
  PHASE = 'PHASE',
  WORK_PACKAGE = 'WORK_PACKAGE',
  ACTIVITY = 'ACTIVITY',
  SUB_ACTIVITY = 'SUB_ACTIVITY',
}

export class CreateWbsDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: WbsLevelDto })
  @IsEnum(WbsLevelDto)
  level!: WbsLevelDto;

  @ApiPropertyOptional({ enum: WbsUnitDto })
  @IsOptional()
  @IsEnum(WbsUnitDto)
  unit?: WbsUnitDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
