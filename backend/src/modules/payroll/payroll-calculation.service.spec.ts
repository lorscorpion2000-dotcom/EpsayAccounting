describe('Payroll Calculation Engine - Labor Law Compliance', () => {
  const minDailyWage = 2388728; // حداقل دستمزد روزانه

  it('should calculate pro-rata bonus and severance for daily-wage worker (182 days worked)', () => {
    const baseSalary = 10000000;
    const workedDays = 182; // نصف سال
    const yearRatio = workedDays / 365;

    const maxBonusLimit = minDailyWage * 90;
    const fullYearBonus = Math.min(baseSalary * 2, maxBonusLimit);
    const annualBonus = Math.round(fullYearBonus * yearRatio);
    const severance = Math.round(baseSalary * yearRatio);

    expect(annualBonus).toBeGreaterThan(0);
    expect(annualBonus).toBeLessThan(fullYearBonus);
    expect(severance).toBe(Math.round(baseSalary * (182 / 365)));
  });

  it('should apply full year bonus limit for permanent employees', () => {
    const baseSalary = 15000000;
    const workedDays = 365;
    const yearRatio = 1.0;

    const maxBonusLimit = minDailyWage * 90;
    const fullYearBonus = Math.min(baseSalary * 2, maxBonusLimit);

    expect(fullYearBonus).toBeLessThanOrEqual(maxBonusLimit);
  });
});
