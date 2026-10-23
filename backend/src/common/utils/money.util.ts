import { Prisma } from '@prisma/client';

export type DecimalValue = Prisma.Decimal | number | string;

export class Money {
  /**
   * تبدیل مقدار ورودی به Decimal امن
   */
  static toDecimal(val: DecimalValue | null | undefined): Prisma.Decimal {
    if (val === null || val === undefined || val === '') {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(val);
  }

  /**
   * جمع مبالغ
   */
  static add(a: DecimalValue, b: DecimalValue): Prisma.Decimal {
    return this.toDecimal(a).plus(this.toDecimal(b));
  }

  /**
   * تفریق مبالغ (a - b)
   */
  static subtract(a: DecimalValue, b: DecimalValue): Prisma.Decimal {
    return this.toDecimal(a).minus(this.toDecimal(b));
  }

  /**
   * ضرب دو مقدار
   */
  static multiply(a: DecimalValue, b: DecimalValue): Prisma.Decimal {
    return this.toDecimal(a).times(this.toDecimal(b));
  }

  /**
   * محاسبه درصد از یک مبلغ: (amount * percent) / 100
   */
  static percent(amount: DecimalValue, percentRate: DecimalValue): Prisma.Decimal {
    return this.toDecimal(amount)
      .times(this.toDecimal(percentRate))
      .dividedBy(100)
      .toDP(2);
  }

  /**
   * مقایسه برابری دقیق دو مبلغ
   */
  static equals(a: DecimalValue, b: DecimalValue): boolean {
    return this.toDecimal(a).equals(this.toDecimal(b));
  }

  /**
   * بررسی تراز بودن مجموعه بدهکار و بستانکار
   */
  static isBalanced(debits: DecimalValue[], credits: DecimalValue[]): boolean {
    const totalDr = debits.reduce((sum: Prisma.Decimal, d) => sum.plus(this.toDecimal(d)), new Prisma.Decimal(0));
    const totalCr = credits.reduce((sum: Prisma.Decimal, c) => sum.plus(this.toDecimal(c)), new Prisma.Decimal(0));
    return totalDr.toDP(2).equals(totalCr.toDP(2));
  }
}
