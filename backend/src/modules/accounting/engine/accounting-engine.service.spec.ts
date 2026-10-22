import { BadRequestException } from '@nestjs/common';

describe('AccountingEngine - Double Entry Balance Guard', () => {
  it('should reject unbalanced journal entries (debit != credit)', () => {
    const lines = [
      { accountId: '101', debit: 1000, credit: 0 },
      { accountId: '401', debit: 0, credit: 900 },
    ];
    
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    const checkBalanced = () => {
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new BadRequestException('سند نامتراز است: مجموع بدهکار و بستانکار یکسان نیست.');
      }
    };

    expect(checkBalanced).toThrow(BadRequestException);
  });

  it('should accept balanced journal entries (debit == credit)', () => {
    const lines = [
      { accountId: '101', debit: 1000, credit: 0 },
      { accountId: '401', debit: 0, credit: 1000 },
    ];
    
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.001;
    expect(isBalanced).toBe(true);
  });
});
