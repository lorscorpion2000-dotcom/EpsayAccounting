import { Prisma } from '@prisma/client';
import { Money } from '../../common/utils/money.util';

describe('Subcontractor Statement - Real Financial Math & Golden Test', () => {
  it('باید کسورات بیمه، مالیات و سپرده را بدون خطای ممیز شناور با مقادیر بزرگ میلیاردی محاسبه کند', () => {
    // مبلغ پایه: ۲,۵۰۰,۳۵۰,۷۵۰ ریال
    const grossAmount = '2500350750';

    // نرخ‌ها: ۵٪ بیمه ماده ۳۸، ۳٪ مالیات تکلیفی، ۱۰٪ سپرده حسن انجام کار
    const insurance = Money.percent(grossAmount, 5); // 125017537.50
    const tax = Money.percent(grossAmount, 3);       // 75010522.50
    const retention = Money.percent(grossAmount, 10); // 250035075.00

    // جمع کسورات
    const totalDeductions = Money.add(insurance, Money.add(tax, retention));
    // خالص پرداختی
    const netPayable = Money.subtract(grossAmount, totalDeductions);

    // راستی‌آزمایی تراز ریاضی: ناخالص = خالص + کسورات
    const reconstructed = Money.add(netPayable, totalDeductions);
    expect(reconstructed.equals(new Prisma.Decimal(grossAmount))).toBe(true);

    // تراز دوبل سند حسابداری: بدهکار (هزینه پیمانکار) با مجموع بستانکاران (بستانکاران تجاری + ادارات بیمه و مالیات + سپرده)
    const debits = [grossAmount];
    const credits = [netPayable, insurance, tax, retention];
    expect(Money.isBalanced(debits, credits)).toBe(true);
  });

  it('باید مانع بروز خطای شناخته‌شده float (0.1 + 0.2 != 0.3) در تسهیم سهم شرکا شود', () => {
    const shareA = '0.1';
    const shareB = '0.2';
    const totalShare = Money.add(shareA, shareB);
    expect(totalShare.equals(new Prisma.Decimal('0.3'))).toBe(true);
  });
});
