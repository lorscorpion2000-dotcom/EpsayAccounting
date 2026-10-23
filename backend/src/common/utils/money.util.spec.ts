import { Money } from './money.util';
import { Prisma } from '@prisma/client';

describe('Money Utility - Decimal Financial Precision', () => {
  it('should accurately handle decimal addition without float drift (0.1 + 0.2 == 0.3)', () => {
    const sum = Money.add('0.1', '0.2');
    expect(sum.equals(new Prisma.Decimal('0.3'))).toBe(true);
  });

  it('should calculate construction deductions and net payable accurately', () => {
    const totalAmount = '1000000000'; // ۱ میلیارد ریال
    const insurance = Money.percent(totalAmount, 5); // ۵٪ بیمه = ۵۰ میلیون
    const tax = Money.percent(totalAmount, 3);       // ۳٪ مالیات = ۳۰ میلیون
    const retention = Money.percent(totalAmount, 10); // ۱۰٪ حسن انجام کار = ۱۰۰ میلیون

    const totalDeductions = Money.add(insurance, Money.add(tax, retention));
    const netPayable = Money.subtract(totalAmount, totalDeductions);

    expect(insurance.toString()).toBe('50000000');
    expect(tax.toString()).toBe('30000000');
    expect(retention.toString()).toBe('100000000');
    expect(netPayable.toString()).toBe('820000000');
  });

  it('should verify balance equality between debits and credits', () => {
    const debits = ['100.50', '200.75'];
    const credits = ['301.25'];
    expect(Money.isBalanced(debits, credits)).toBe(true);
  });
});
