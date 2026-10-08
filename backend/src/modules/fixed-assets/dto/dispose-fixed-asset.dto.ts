import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class DisposeFixedAssetDto {
  @IsDateString() disposalDate!: string;
  @IsNumber() @Min(0) disposalProceeds!: number;
  /** حساب دریافت وجه (بانک/نقد) — اگر null باشد، فقط JE داخلی ثبت نمی‌شود. */
  @IsOptional() @IsUUID() proceedsAccountId?: string | null;
  /** حساب برای ثبت سود/زیان انباشته — معمولاً یک حساب سود و زیان. */
  @IsOptional() @IsUUID() gainLossAccountId?: string | null;
}