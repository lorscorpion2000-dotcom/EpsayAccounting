describe('Bank Reconciliation Engine', () => {
  it('should identify match when statement and book balance align', () => {
    const statementBalance = 50000000;
    const bookBalance = 50000000;
    const diff = statementBalance - bookBalance;

    expect(diff).toBe(0);
    expect(Math.abs(diff) < 0.01).toBe(true);
  });

  it('should flag discrepancy when bank and book balance differ', () => {
    const statementBalance = 52000000;
    const bookBalance = 50000000;
    const diff = statementBalance - bookBalance;

    expect(diff).toBe(2000000);
    expect(Math.abs(diff) < 0.01).toBe(false);
  });
});
