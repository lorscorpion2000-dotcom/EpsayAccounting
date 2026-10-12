import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export enum PRPriorityDto { LOW='LOW', NORMAL='NORMAL', HIGH='HIGH', URGENT='URGENT' }
export enum PRItemUnitDto {
  NUMBER='NUMBER', KILOGRAM='KILOGRAM', TON='TON', METER='METER',
  SQUARE_METER='SQUARE_METER', CUBIC_METER='CUBIC_METER', LITER='LITER',
  PACKAGE='PACKAGE', SERVICE='SERVICE', LUMP_SUM='LUMP_SUM',
}

export class PRItemDto {
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

  @ApiPropertyOptional({ enum: PRPriorityDto })
  @IsOptional()
  @IsEnum(PRPriorityDto)
  priority?: PRPriorityDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePRDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wbsItemId?: string;

  @ApiProperty()
  @IsDateString()
  requestDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ type: [PRItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PRItemDto)
  items!: PRItemDto[];
}
