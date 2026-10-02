import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ItemTypeDto { CONSUMABLE = 'CONSUMABLE', CAPITAL = 'CAPITAL', MATERIAL = 'MATERIAL' }

export class CreateCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ enum: ItemTypeDto }) @IsOptional() @IsEnum(ItemTypeDto) type?: ItemTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
