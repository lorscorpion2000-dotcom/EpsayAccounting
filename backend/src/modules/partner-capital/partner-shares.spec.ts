describe('Partner Capital & Dilution Calculation', () => {
  it('should calculate correct share dilution when new partner joins with USD contribution', () => {
    const existingProjectValuationUsd = 100000; // ۱۰۰ هزار دلار ارزش فعلی
    const newPartnerContributionUsd = 25000;    // ۲۵ هزار دلار آورده شریک جدید

    const newTotalValuation = existingProjectValuationUsd + newPartnerContributionUsd;
    const newPartnerSharePercent = (newPartnerContributionUsd / newTotalValuation) * 100; // ۲۰٪

    expect(newPartnerSharePercent).toBe(20);

    const existingPartnersShare = 100 - newPartnerSharePercent;
    expect(existingPartnersShare).toBe(80);
  });
});
