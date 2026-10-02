import { IsString, IsOptional, IsInt, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SalesUnitStatusDto {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class CreateSalesUnitDto {
  @IsString() projectId!: string;
  @IsString() unitNumber!: string;

  @IsOptional() @IsString() block?: string;
  @IsOptional() @IsInt() @Type(() => Number) floor?: number;
  @IsOptional() @IsNumber() @Type(() => Number) area?: number;
  @IsOptional() @IsInt() @Type(() => Number) bedrooms?: number;
  @IsOptional() @IsInt() @Type(() => Number) parkingCount?: number;
  @IsOptional() @IsInt() @Type(() => Number) storageCount?: number;
  @IsOptional() @IsNumber() @Type(() => Number) listPrice?: number;
  @IsOptional() @IsEnum(SalesUnitStatusDto) status?: SalesUnitStatusDto;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSalesUnitDto extends CreateSalesUnitDto {}
