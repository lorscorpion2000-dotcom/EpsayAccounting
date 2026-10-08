import { IsString, IsOptional, IsNumber, IsIn, IsUUID, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;

  @IsDateString() acquisitionDate!: string;
  @IsNumber() @Min(0) acquisitionCost!: number;
  @IsOptional() @IsNumber() @Min(0) residualValue?: number;
  @IsNumber() @Min(1) usefulLifeMonths!: number;

  @IsOptional() @IsIn(['STRAIGHT_LINE', 'DECLINING_BALANCE']) depreciationMethod?: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';

  @IsUUID() assetAccountId!: string;
  @IsUUID() depreciationAccountId!: string;
  @IsUUID() accumulatedDeprecAccountId!: string;

  /** حساب طرف مقابل هنگام تملک (بانک/پرداختنی/...) — اگر null باشد، JE تملک ثبت نمی‌شود. */
  @IsOptional() @IsUUID() counterAccountId?: string | null;

  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() costCenterId?: string | null;
}