import 'dotenv/config';
// backend/prisma/seed-templates.mjs
// Seeds the 4 default legal contract templates with Persian legal text.
// Run: node prisma/seed-templates.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// Shared header/footer fragments
// ═══════════════════════════════════════════════════════════
const HEADER = `
<div style="text-align:center; margin-bottom:24px;">
  <div style="font-size:20px; font-weight:bold;">بسمه تعالی</div>
</div>
`;

const FOOTER = `
<div style="margin-top:40px; page-break-inside:avoid;">
  <table style="width:100%; border:none; margin-top:40px;">
    <tr>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">طرف اول (کارفرما)</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{companySignerName}}</div>
      </td>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">طرف دوم</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{party.fullName}}</div>
      </td>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">ناظر</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{supervisorName}}</div>
      </td>
    </tr>
  </table>
</div>
`;

// ═══════════════════════════════════════════════════════════
// 1) WORKER_EMPLOYMENT — قرارداد کارگری
// ═══════════════════════════════════════════════════════════
const WORKER_EMPLOYMENT = HEADER + `
<h1 style="text-align:center; font-size:18px; margin-bottom:8px;">قرارداد کار (کارگری)</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">شماره: <span style="font-family:monospace;">{{code}}</span></p>

<p>این قرارداد در تاریخ <b>{{registrationDate}}</b> فی‌مابین:</p>

<p><b>طرف اول (کارفرما):</b> شرکت حسابداری اپسای به نمایندگی <b>{{companySignerName}}</b></p>

<p><b>طرف دوم (کارگر):</b> جناب آقای/خانم <b>{{party.fullName}}</b> فرزند <b>{{party.fatherName}}</b> به شماره ملی <b>{{party.nationalId}}</b> ساکن <b>{{party.address}}</b></p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — موضوع قرارداد</h2>
<p>طرف دوم متعهد می‌گردد در پروژه <b>{{project.name}}</b> با سمت <b>{{party.job}}</b> و در محل <b>{{workLocation}}</b> فعالیت نماید.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — مدت قرارداد</h2>
<p>مدت این قرارداد <b>{{durationText}}</b> از تاریخ <b>{{startDate}}</b> لغایت <b>{{endDate}}</b> می‌باشد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — ساعات کار</h2>
<p>ساعات کار هفتگی برابر <b>{{workHoursPerWeek}}</b> ساعت می‌باشد و مطابق قانون کار جمهوری اسلامی ایران تنظیم شده است.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — حقوق و مزایا</h2>
<p>حقوق ماهیانه طرف دوم مبلغ <b>{{salaryMonthly}}</b> ریال می‌باشد که در پایان هر ماه پرداخت می‌گردد. همچنین دستمزد روزانه <b>{{salaryDaily}}</b> ریال و دستمزد ساعتی <b>{{salaryHourly}}</b> ریال تعیین می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — بیمه</h2>
<p>کارفرما مکلف است طرف دوم را از تاریخ شروع به کار نزد سازمان تأمین اجتماعی بیمه نماید. شماره بیمه طرف دوم: <b>{{party.insuranceNumber}}</b></p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — تعهدات طرفین</h2>
<p>طرفین متعهد به رعایت مفاد قانون کار، آیین‌نامه‌های حفاظت فنی و بهداشت کار و مقررات داخلی کارگاه می‌باشند.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۷ — فسخ قرارداد</h2>
<p>در صورت تخلف هر یک از طرفین از مفاد این قرارداد، طرف دیگر حق فسخ را مطابق قانون کار خواهد داشت.</p>

<p style="margin-top:20px;">این قرارداد در دو نسخه تنظیم و هر نسخه حکم واحد دارد.</p>

<p style="margin-top:16px;">اطلاعات بانکی طرف دوم: بانک <b>{{party.bankName}}</b>، حساب <b>{{party.bankAccount}}</b>، شبا <b>{{party.bankSheba}}</b></p>
` + FOOTER;

// ═══════════════════════════════════════════════════════════
// 2) CONTRACTOR_AGREEMENT — قرارداد پیمانکاری
// ═══════════════════════════════════════════════════════════
const CONTRACTOR_AGREEMENT = HEADER + `
<h1 style="text-align:center; font-size:18px; margin-bottom:8px;">قرارداد پیمانکاری</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">شماره: <span style="font-family:monospace;">{{code}}</span></p>

<p>این قرارداد در تاریخ <b>{{registrationDate}}</b> فی‌مابین:</p>

<p><b>کارفرما:</b> شرکت حسابداری اپسای به نمایندگی <b>{{companySignerName}}</b></p>

<p><b>پیمانکار:</b> <b>{{party.fullName}}</b> به شماره ثبت <b>{{party.registrationNumber}}</b> و کد اقتصادی <b>{{party.economicCode}}</b></p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — موضوع</h2>
<p>پیمانکار متعهد می‌گردد موضوع <b>{{subject}}</b> را در پروژه <b>{{project.name}}</b> اجرا نماید.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — مدت اجرا</h2>
<p>مدت اجرا <b>{{durationText}}</b> از تاریخ <b>{{startDate}}</b> تا <b>{{endDate}}</b>.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — مبلغ قرارداد</h2>
<p>مبلغ کل قرارداد <b>{{totalAmount}}</b> ریال می‌باشد که طبق صورت‌وضعیت‌های ماهانه پرداخت می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — تضامین</h2>
<p>نوع تضمین: <b>{{guaranteeType}}</b><br/>
شماره تضمین: <b>{{guaranteeNumber}}</b><br/>
مبلغ تضمین: <b>{{guaranteeAmount}}</b> ریال<br/>
بانک صادرکننده: <b>{{guaranteeBank}}</b></p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — تعهدات پیمانکار</h2>
<p>پیمانکار متعهد است کار را مطابق مشخصات فنی، نقشه‌ها و دستور کار ناظر <b>{{supervisorName}}</b> اجرا کند. کسورات قانونی شامل بیمه، مالیات و حسن انجام کار از صورت‌وضعیت‌ها کسر می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — فسخ و خاتمه</h2>
<p>در صورت تأخیر غیرموجه یا نقص کیفی، کارفرما حق فسخ یا خاتمه قرارداد را خواهد داشت.</p>

<p style="margin-top:20px;">این قرارداد در دو نسخه تنظیم شده و هر دو نسخه حکم واحد دارند.</p>
` + FOOTER;

// ═══════════════════════════════════════════════════════════
// 3) CLIENT_CONTRACT — قرارداد کارفرمایی
// ═══════════════════════════════════════════════════════════
const CLIENT_CONTRACT = HEADER + `
<h1 style="text-align:center; font-size:18px; margin-bottom:8px;">قرارداد کارفرمایی</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">شماره: <span style="font-family:monospace;">{{code}}</span></p>

<p>این قرارداد در تاریخ <b>{{registrationDate}}</b> فی‌مابین:</p>

<p><b>کارفرما:</b> <b>{{party.fullName}}</b> به شماره ملی <b>{{party.nationalId}}</b> ساکن <b>{{party.address}}</b></p>

<p><b>پیمانکار:</b> شرکت حسابداری اپسای به نمایندگی <b>{{companySignerName}}</b></p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — موضوع قرارداد</h2>
<p>اجرای موضوع <b>{{subject}}</b> در پروژه <b>{{project.name}}</b> واقع در <b>{{workLocation}}</b>.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — مدت اجرا</h2>
<p>مدت اجرا <b>{{durationText}}</b> از تاریخ <b>{{startDate}}</b> تا <b>{{endDate}}</b>.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — مبلغ قرارداد</h2>
<p>مبلغ کل قرارداد <b>{{totalAmount}}</b> ریال (بدون احتساب مالیات بر ارزش افزوده) می‌باشد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — روش پرداخت</h2>
<p>پرداخت‌ها بر اساس صورت‌وضعیت‌های تأییدشده توسط ناظر <b>{{supervisorName}}</b> و پس از کسر کسورات قانونی انجام می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — تعهدات کارفرما</h2>
<p>کارفرما متعهد است مبلغ صورت‌وضعیت‌های تأییدشده را حداکثر ظرف ۳۰ روز پرداخت نماید. در صورت تأخیر، خسارت تأخیر تأدیه مطابق قانون محاسبه می‌شود.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — تضامین</h2>
<p>نوع تضمین: <b>{{guaranteeType}}</b><br/>
شماره: <b>{{guaranteeNumber}}</b> — مبلغ: <b>{{guaranteeAmount}}</b> ریال<br/>
بانک: <b>{{guaranteeBank}}</b></p>

<p style="margin-top:20px;">این قرارداد در دو نسخه تنظیم و هر دو نسخه حکم واحد دارند.</p>
` + FOOTER;

// ═══════════════════════════════════════════════════════════
// 4) SUBCONTRACTOR — پیمانکار جزء
// ═══════════════════════════════════════════════════════════
const SUBCONTRACTOR = HEADER + `
<h1 style="text-align:center; font-size:18px; margin-bottom:8px;">قرارداد پیمانکار جزء</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">شماره: <span style="font-family:monospace;">{{code}}</span></p>

<p>این قرارداد در تاریخ <b>{{registrationDate}}</b> فی‌مابین:</p>

<p><b>پیمانکار اصلی:</b> شرکت حسابداری اپسای به نمایندگی <b>{{companySignerName}}</b></p>

<p><b>پیمانکار جزء:</b> <b>{{party.fullName}}</b> به شماره ملی <b>{{party.nationalId}}</b> و شماره ثبت <b>{{party.registrationNumber}}</b></p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — موضوع</h2>
<p>پیمانکار جزء متعهد می‌گردد بخش <b>{{subject}}</b> از پروژه <b>{{project.name}}</b> را اجرا نماید.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — مدت</h2>
<p>مدت اجرا <b>{{durationText}}</b> از <b>{{startDate}}</b> تا <b>{{endDate}}</b>.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — مبلغ قرارداد</h2>
<p>مبلغ پایه <b>{{totalAmount}}</b> ریال. کسورات قانونی:<br/>
— بیمه سهم کارفرما: ۷٪<br/>
— مالیات تکلیفی: ۳٪<br/>
— حسن انجام کار: ۵٪</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — تعهدات پیمانکار جزء</h2>
<p>پیمانکار جزء متعهد به اجرای کار طبق مشخصات فنی، نقشه‌ها و دستور ناظر <b>{{supervisorName}}</b> می‌باشد. کلیه کارکنان پیمانکار جزء باید بیمه تأمین اجتماعی داشته باشند.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — پرداخت</h2>
<p>پرداخت‌ها بر اساس صورت‌وضعیت‌های ماهانه پس از تأیید ناظر و کسر کسورات انجام می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — تضامین</h2>
<p>نوع: <b>{{guaranteeType}}</b> — شماره: <b>{{guaranteeNumber}}</b> — مبلغ: <b>{{guaranteeAmount}}</b> ریال — بانک: <b>{{guaranteeBank}}</b></p>

<p style="margin-top:20px;">این قرارداد در دو نسخه تنظیم شده و هر دو حکم واحد دارند.</p>
` + FOOTER;

// ═══════════════════════════════════════════════════════════
// Seed
// ═══════════════════════════════════════════════════════════
const TEMPLATES = [
  { kind: 'WORKER_EMPLOYMENT',    title: 'قرارداد کار (کارگری)',        bodyHtml: WORKER_EMPLOYMENT },
  { kind: 'CONTRACTOR_AGREEMENT', title: 'قرارداد پیمانکاری',           bodyHtml: CONTRACTOR_AGREEMENT },
  { kind: 'CLIENT_CONTRACT',      title: 'قرارداد کارفرمایی',           bodyHtml: CLIENT_CONTRACT },
  { kind: 'SUBCONTRACTOR',        title: 'قرارداد پیمانکار جزء',        bodyHtml: SUBCONTRACTOR },
];

async function main() {
  console.log('');
  console.log('Seeding contract templates...');
  console.log('');

  for (const tpl of TEMPLATES) {
    const existing = await prisma.legalContractTemplate.findUnique({
      where: { kind: tpl.kind },
    });

    if (existing) {
      console.log('  [SKIP] ' + tpl.kind + ' already exists');
      continue;
    }

    await prisma.legalContractTemplate.create({
      data: {
        kind: tpl.kind,
        title: tpl.title,
        bodyHtml: tpl.bodyHtml,
        isActive: true,
      },
    });
    console.log('  [OK]   ' + tpl.kind);
  }

  console.log('');
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());