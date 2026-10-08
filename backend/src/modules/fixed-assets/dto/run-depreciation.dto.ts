import { IsInt, Min, Max } from 'class-validator';

/**
 * دوره‌ی استهلاک — بر اساس تقویم شمسی.
 * مثلاً: { year: 1404, month: 7 } برای مهر ۱۴۰۴
 */
export class RunDepreciationDto {
  @IsInt() @Min(1390) @Max(1450) year!: number;
  @IsInt() @Min(1) @Max(12) month!: number;
}