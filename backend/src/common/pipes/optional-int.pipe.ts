import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Optional integer pipe that tolerates:
 *  - undefined, null, '' (empty query string)
 *  - NaN (from enableImplicitConversion turning missing values into NaN)
 *  - only rejects real non-numeric strings
 */
@Injectable()
export class OptionalIntPipe implements PipeTransform<unknown, number | undefined> {
  constructor(private readonly opts: { min?: number; max?: number } = {}) {}

  transform(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return undefined;
      this.validateRange(value);
      return value;
    }
    if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
      throw new BadRequestException('Validation failed (numeric string is expected)');
    }
    const n = parseInt(value, 10);
    this.validateRange(n);
    return n;
  }

  private validateRange(n: number): void {
    if (this.opts.min !== undefined && n < this.opts.min) {
      throw new BadRequestException('Validation failed (must be >= ' + this.opts.min + ')');
    }
    if (this.opts.max !== undefined && n > this.opts.max) {
      throw new BadRequestException('Validation failed (must be <= ' + this.opts.max + ')');
    }
  }
}
