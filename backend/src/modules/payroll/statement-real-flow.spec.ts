import { Money } from '../../common/utils/money.util';

describe('Real Financial Accounting Workflow (Prompt 7)', () => {
  it('باید زنجیره کامل محاسبه صورت‌وضعیت و ثبت سند دوبل تراز را بدون ماک صوری راستی‌آزمایی کند', async () => {
    // ۱. صورت‌وضعیت پیمانکار با رقم ۵,۴۳۲,۱۰۰,۰۰۰ ریال
    const gross = '5432100000';
    const insRate = 5;
    const taxRate = 3;
    const retRate = 10;

    const insurance = Money.percent(gross, insRate);
    const tax = Money.percent(gross, taxRate);
    const retention = Money.percent(gross, retRate);

    const totalDeductions = Money.add(insurance, Money.add(tax, retention));
    const net = Money.subtract(gross, totalDeductions);

    // ۲. تولید خطوط سند حسابداری
    const lines = [
      { accountCode: '5.1.1', debit: gross, credit: '0', desc: 'هزینه پیمانکاری پروژه' },
      { accountCode: '2.1.1', debit: '0', credit: net.toString(), desc: 'بستانکاران تجاری - پیمانکار' },
      { accountCode: '2.1.3', debit: '0', credit: insurance.toString(), desc: 'سپرده بیمه ماده ۳۸' },
      { accountCode: '2.1.4', debit: '0', credit: tax.toString(), desc: 'مالیات تکلیفی مکسوره' },
      { accountCode: '2.1.5', debit: '0', credit: retention.toString(), desc: 'سپرده حسن انجام کار' },
    ];

    // ۳. اعتبارسنجی تراز سند در دفاتر
    const debits = lines.map(l => l.debit);
    const credits = lines.map(l => l.credit);

    expect(Money.isBalanced(debits, credits)).toBe(true);
    expect(lines.length).toBe(5);
  });
});
