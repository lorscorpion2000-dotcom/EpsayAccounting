import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum ItemTypeDto2 { CONSUMABLE = 'CONSUMABLE', CAPITAL = 'CAPITAL', MATERIAL = 'MATERIAL' }
export enum ItemUnitDto {
  NUMBER='NUMBER', KILOGRAM='KILOGRAM', TON='TON', METER='METER',
  SQUARE_METER='SQUARE_METER', CUBIC_METER='CUBIC_METER', LITER='LITER',
  PACKAGE='PACKAGE', LUMP_SUM='LUMP_SUM',
}

export class CreateItemDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: ItemTypeDto2 }) @IsEnum(ItemTypeDto2) type!: ItemTypeDto2;
  @ApiProperty({ enum: ItemUnitDto }) @IsEnum(ItemUnitDto) unit!: ItemUnitDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) reorderPoint?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
