import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum WarehouseTypeDto { MAIN = 'MAIN', SITE = 'SITE', TEMPORARY = 'TEMPORARY' }

export class CreateWarehouseDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional({ enum: WarehouseTypeDto }) @IsOptional() @IsEnum(WarehouseTypeDto) type?: WarehouseTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
