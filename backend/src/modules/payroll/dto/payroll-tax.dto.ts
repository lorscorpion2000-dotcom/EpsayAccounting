import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TaxBracketDto {
  @ApiProperty() @IsInt() @Type(() => Number) order!: number;
  @ApiProperty() @IsNumber() @Type(() => Number) fromAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) toAmount?: number;
  @ApiProperty() @IsNumber() @Type(() => Number) ratePercent!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class CreateTaxSettingDto {
  @ApiProperty() @IsInt() @Type(() => Number) year!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsNumber() @Type(() => Number) monthlyExemption!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) insuranceEmployeePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) insuranceEmployerPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [TaxBracketDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => TaxBracketDto)
  brackets!: TaxBracketDto[];
}

export class UpdateTaxSettingDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsNumber() @Type(() => Number) monthlyExemption?: number;
  @IsOptional() @IsNumber() @Type(() => Number) insuranceEmployeePercent?: number;
  @IsOptional() @IsNumber() @Type(() => Number) insuranceEmployerPercent?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TaxBracketDto)
  brackets?: TaxBracketDto[];
}
