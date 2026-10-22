import { BadRequestException } from '@nestjs/common';

describe('Project Budget Overrun Guard', () => {
  it('should allow expense within WBS budget limit', () => {
    const budgetAmount = 1000000;
    const currentSpent = 700000;
    const newExpense = 200000;

    const checkOverrun = () => {
      if (currentSpent + newExpense > budgetAmount) {
        throw new BadRequestException('تجاوز از بودجه WBS');
      }
    };

    expect(checkOverrun).not.toThrow();
  });

  it('should block expense when exceeding WBS budget limit in STRICT mode', () => {
    const budgetAmount = 1000000;
    const currentSpent = 900000;
    const newExpense = 200000;

    const checkOverrun = () => {
      if (currentSpent + newExpense > budgetAmount) {
        throw new BadRequestException('تجاوز از بودجه WBS');
      }
    };

    expect(checkOverrun).toThrow(BadRequestException);
  });
});
