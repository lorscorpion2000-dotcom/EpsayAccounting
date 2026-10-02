// backend/prisma/setup-remaining-templates.mjs
// 1) Sets CLIENT_CONTRACT and SUBCONTRACTOR templates
// 2) Fills empty bodyHtml on existing contracts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// SHARED HEADER
// ═══════════════════════════════════════════════════════════════
const HEADER = `<div style="text-align:center; margin-bottom:24px;">
  <div style="font-size:20px; font-weight:bold;">بسمه تعالی</div>
</div>`;

// ═══════════════════════════════════════════════════════════════
// CLIENT_CONTRACT — قرارداد کارفرمایی (خدمات مهندسی)
// ═══════════════════════════════════════════════════════════════
const CLIENT_CONTRACT = HEADER + `
<h1 style="text-align:center; font-size:18px;">قرارداد خدمات مهندسی</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">
  شماره ثبت: <span style="font-family:monospace;">{{registrationNumber}}</span> — 
  تاریخ ثبت: <b>{{registrationDate}}</b>
</p>

<p>این قرارداد به استناد مواد ۱۰ و ۲۱۹ قانون مدنی جمهوری اسلامی ایران فیمابین طرفین به شرح و شرایط ذیل منعقد گردید:</p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — طرفین قرارداد</h2>
<p>این قرارداد فیمابین:</p>
<p><b>کارفرما:</b> <b>{{party.fullName}}</b> فرزند <b>{{party.fatherName}}</b> به شماره ملی <b>{{party.nationalId}}</b> و کد اقتصادی <b>{{party.economicCode}}</b>، ساکن <b>{{party.address}}</b>، به شماره تماس <b>{{party.mobilePhone}}</b> که در این قرارداد «کارفرما» نامیده می‌شود.</p>
<p><b>پیمانکار:</b> استودیو معماری اپسای به نمایندگی <b>{{companySignerName}}</b> که در این قرارداد «پیمانکار» نامیده می‌شود.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — موضوع قرارداد</h2>
<p>موضوع قرارداد عبارت است از <b>{{subject}}</b> در پروژه <b>{{project.name}}</b>.</p>
<p>پیمانکار متعهد به انجام و تحویل موضوع قرارداد طبق مشخصات فنی، نقشه‌های اجرایی و استانداردهای تخصصی مربوطه می‌باشد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — مدت قرارداد</h2>
<p>مدت قرارداد از تاریخ <b>{{startDate}}</b> آغاز و در تاریخ <b>{{endDate}}</b> پایان می‌یابد (معادل <b>{{durationText}}</b>).</p>
<p>اتمام مدت قرارداد نافی انجام تعهدات باقی‌مانده پیمانکار نیست.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — محل انجام کار</h2>
<p>محل انجام کار: <b>{{workLocation}}</b> و یا هر محل دیگری که از سوی کارفرما تعیین می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — مبلغ قرارداد و نحوه پرداخت</h2>
<p>مبلغ کل قرارداد <b>{{totalAmount}}</b> ریال (بدون احتساب مالیات بر ارزش افزوده) می‌باشد.</p>
<p>روش پرداخت:</p>
<ul>
  <li>پرداخت‌ها بر اساس صورت‌وضعیت‌های ماهانه پس از تأیید ناظر <b>{{supervisorName}}</b> انجام می‌گردد.</li>
  <li>کارفرما مکلف است مبلغ هر صورت‌وضعیت تأییدشده را حداکثر ظرف ۳۰ روز پرداخت نماید.</li>
  <li>در صورت تأخیر، خسارت تأخیر تأدیه مطابق قانون محاسبه می‌شود.</li>
</ul>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — تعهدات کارفرما</h2>
<ol>
  <li>تأمین نیازهای اطلاعاتی، نقشه‌ها، مشخصات فنی و مستندات لازم برای اجرای موضوع.</li>
  <li>پرداخت صورت‌وضعیت‌های تأییدشده در بازه‌های تعیین‌شده.</li>
  <li>معرفی ناظر قرارداد به عنوان نماینده پاسخگوی کارفرما.</li>
  <li>فراهم کردن همکاری لازم جهت انجام تعهدات پیمانکار.</li>
</ol>

<h2 style="font-size:14px; margin-top:16px;">ماده ۷ — تعهدات پیمانکار</h2>
<ol>
  <li>اجرای موضوع قرارداد طبق مشخصات فنی و استانداردهای تخصصی.</li>
  <li>تأمین نیروی متخصص و تجهیزات مورد نیاز به هزینه خود.</li>
  <li>رعایت کلیه مقررات HSE، ایمنی و بهداشت محیط کار.</li>
  <li>ارائه گزارش‌های پیشرفت دوره‌ای به کارفرما یا ناظر.</li>
  <li>رفع نواقص احتمالی در اسرع وقت و به هزینه خود.</li>
  <li>عدم واگذاری کل یا بخشی از موضوع قرارداد به شخص ثالث بدون اجازه کتبی کارفرما.</li>
</ol>

<h2 style="font-size:14px; margin-top:16px;">ماده ۸ — کسورات قانونی</h2>
<p>مالیات تکلیفی (۳٪)، بیمه سهم کارفرما (۷٪) و حسن انجام کار (۵٪) از صورت‌وضعیت‌ها کسر و حسن انجام کار پس از تکمیل موضوع قرارداد و تأیید ناظر آزاد می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۹ — مالکیت مادی و معنوی</h2>
<p>کلیه حقوق مالکیت فکری، نقشه‌ها، طرح‌ها و مستندات تولیدشده در جریان اجرای موضوع قرارداد، متعلق به کارفرما بوده و پیمانکار حق بهره‌برداری، واگذاری یا انتشار آن‌ها را بدون موافقت کتبی کارفرما ندارد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۰ — محرمانگی</h2>
<p>پیمانکار متعهد به حفظ محرمانگی کلیه اطلاعات، اسناد و مستندات کارفرما است. این تعهد پس از خاتمه قرارداد نیز ادامه دارد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۱ — تضامین</h2>
<p>نوع تضمین: <b>{{guaranteeType}}</b></p>
<p>شماره تضمین: <b>{{guaranteeNumber}}</b> — مبلغ: <b>{{guaranteeAmount}}</b> ریال — بانک صادرکننده: <b>{{guaranteeBank}}</b></p>
<p>تضامین پس از تحویل نهایی موضوع قرارداد و تأیید ناظر، به پیمانکار مسترد می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۲ — فسخ و خاتمه قرارداد</h2>
<p>در صورتی که هر یک از طرفین از انجام تعهدات مندرج در این قرارداد تخطی نماید، طرف دیگر می‌تواند با ارسال اخطار کتبی و اعطای مهلت معقول، نسبت به فسخ قرارداد اقدام نماید.</p>
<p>همچنین در صورت بروز فورس‌ماژور (حوادث قهری)، تعهدات طرفین معلق شده و مسئولیتی متوجه هیچ‌کدام نخواهد بود.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۳ — حل و فصل اختلاف</h2>
<p>هرگونه اختلاف ناشی از تفسیر، اجرا یا خاتمه این قرارداد ابتدا از طریق مذاکره مستقیم، و در صورت عدم توافق، از طریق داوری مورد توافق طرفین یا مراجع قضایی صالح حل و فصل خواهد شد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۴ — اقامتگاه طرفین</h2>
<p><b>کارفرما:</b> <b>{{party.address}}</b> — کد پستی: <b>{{party.postalCode}}</b></p>
<p><b>پیمانکار:</b> استان اصفهان، شهرستان خوانسار، دهکده گردشگری گلستانکوه — کد پستی: ۸۷۹۱۶۳۰۰۱۰</p>
<p>هرگونه تغییر در نشانی باید ظرف ۴۸ ساعت به‌صورت کتبی به طرف دیگر اعلام گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۵ — نسخ قرارداد</h2>
<p>این قرارداد در دو نسخه تنظیم و هر نسخه حکم واحد دارد و برای طرفین و قائم‌مقام قانونی آن‌ها لازم‌الاجراست.</p>

<div style="margin-top:40px; page-break-inside:avoid;">
  <table style="width:100%; border:none; margin-top:40px;">
    <tr>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">کارفرما</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{party.fullName}}</div>
      </td>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">پیمانکار</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{companySignerName}}</div>
      </td>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">ناظر</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{supervisorName}}</div>
      </td>
    </tr>
  </table>
</div>
`;

// ═══════════════════════════════════════════════════════════════
// SUBCONTRACTOR — قرارداد پیمانکار جزء
// ═══════════════════════════════════════════════════════════════
const SUBCONTRACTOR = HEADER + `
<h1 style="text-align:center; font-size:18px;">قرارداد پیمانکار جزء</h1>
<p style="text-align:center; color:#666; margin-bottom:24px;">
  شماره: <span style="font-family:monospace;">{{registrationNumber}}</span> — تاریخ: <b>{{registrationDate}}</b>
</p>

<p>این قرارداد به استناد مواد ۱۰ و ۲۱۹ قانون مدنی جمهوری اسلامی ایران و بر اساس مفاد قرارداد اصلی پیمانکار با کارفرمای پروژه، فیمابین طرفین به شرح ذیل منعقد گردید:</p>

<h2 style="font-size:14px; margin-top:20px;">ماده ۱ — طرفین قرارداد</h2>
<p><b>پیمانکار اصلی (کارفرما):</b> استودیو معماری اپسای به نمایندگی <b>{{companySignerName}}</b> که در این قرارداد «کارفرما» نامیده می‌شود.</p>
<p><b>پیمانکار جزء:</b> <b>{{party.fullName}}</b> فرزند <b>{{party.fatherName}}</b>، شماره ملی <b>{{party.nationalId}}</b>، شماره ثبت <b>{{party.registrationNumber}}</b>، کد اقتصادی <b>{{party.economicCode}}</b>، ساکن <b>{{party.address}}</b> که در این قرارداد «پیمانکار جزء» نامیده می‌شود.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۲ — موضوع قرارداد</h2>
<p>موضوع قرارداد عبارت است از اجرای بخشی از موضوع <b>{{subject}}</b> در پروژه <b>{{project.name}}</b> که طبق مشخصات فنی، نقشه‌های اجرایی و در چارچوب مفاد این قرارداد توسط پیمانکار جزء اجرا و تحویل می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۳ — مدت و زمان‌بندی</h2>
<p>مدت اجرا از تاریخ <b>{{startDate}}</b> لغایت <b>{{endDate}}</b> (معادل <b>{{durationText}}</b>) می‌باشد.</p>
<p>پیمانکار جزء مکلف است برنامه زمان‌بندی تفصیلی خود را حداکثر ظرف ۷ روز از تاریخ انعقاد قرارداد به کارفرما ارائه نماید.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۴ — محل انجام کار</h2>
<p>محل اجرای موضوع: <b>{{workLocation}}</b> یا هر محلی که از سوی کارفرما تعیین می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۵ — مبلغ قرارداد و نحوه پرداخت</h2>
<p>مبلغ کل قرارداد <b>{{totalAmount}}</b> ریال می‌باشد.</p>
<p>نحوه پرداخت: صورت‌وضعیت ماهانه پس از تأیید ناظر <b>{{supervisorName}}</b> و کسر کسورات قانونی.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۶ — کسورات قانونی</h2>
<p>از هر صورت‌وضعیت، کسورات ذیل کسر خواهد شد:</p>
<ul>
  <li>بیمه سهم کارفرما: ۷٪</li>
  <li>مالیات تکلیفی: ۳٪</li>
  <li>حسن انجام کار: ۵٪ (پس از تحویل نهایی و انقضای دوره تضمین آزاد می‌شود)</li>
</ul>

<h2 style="font-size:14px; margin-top:16px;">ماده ۷ — تعهدات پیمانکار جزء</h2>
<ol>
  <li>اجرای موضوع قرارداد مطابق مشخصات فنی، نقشه‌های اجرایی و استانداردهای مربوطه.</li>
  <li>تأمین نیروی انسانی متخصص، تجهیزات و ماشین‌آلات مورد نیاز به هزینه خود.</li>
  <li>بیمه کردن کلیه کارکنان نزد سازمان تأمین اجتماعی.</li>
  <li>رعایت کامل مقررات ایمنی، بهداشت و HSE کارگاه.</li>
  <li>ارائه گزارش پیشرفت دوره‌ای به کارفرما یا ناظر قرارداد.</li>
  <li>رفع نواقص در مهلت تعیین‌شده توسط ناظر و به هزینه خود.</li>
  <li>حفظ محرمانگی اطلاعات، اسناد و مدارک پروژه.</li>
  <li>عدم واگذاری کل یا بخشی از موضوع قرارداد به شخص ثالث بدون اجازه کتبی کارفرما.</li>
</ol>

<h2 style="font-size:14px; margin-top:16px;">ماده ۸ — تعهدات کارفرما</h2>
<ol>
  <li>در اختیار قرار دادن نقشه‌ها، مشخصات فنی و مستندات لازم.</li>
  <li>پرداخت صورت‌وضعیت‌های تأییدشده طبق بازه‌های تعیین‌شده.</li>
  <li>معرفی ناظر قرارداد و پاسخگویی به پرسش‌های فنی پیمانکار جزء.</li>
  <li>فراهم کردن شرایط لازم برای اجرای موضوع (در محدوده تعهدات کارفرما).</li>
</ol>

<h2 style="font-size:14px; margin-top:16px;">ماده ۹ — تضامین</h2>
<p>پیمانکار جزء مکلف است به‌منظور تضمین اجرای تعهدات:</p>
<p>نوع تضمین: <b>{{guaranteeType}}</b></p>
<p>شماره تضمین: <b>{{guaranteeNumber}}</b> — مبلغ: <b>{{guaranteeAmount}}</b> ریال — بانک صادرکننده: <b>{{guaranteeBank}}</b></p>
<p>تضامین پس از تحویل نهایی، انقضای دوره تضمین و تأیید ناظر، به پیمانکار جزء مسترد می‌گردد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۰ — ایمنی و بهداشت کار (HSE)</h2>
<p>پیمانکار جزء مکلف است کلیه مقررات ایمنی و بهداشت کار، دستورالعمل‌های HSE کارگاه و الزامات قانون کار را رعایت نماید. هرگونه حادثه ناشی از عدم رعایت این مقررات، مسئولیت آن متوجه پیمانکار جزء خواهد بود.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۱ — محرمانگی</h2>
<p>کلیه اطلاعات فنی، نقشه‌ها، مشخصات و مستندات پروژه محرمانه تلقی شده و پیمانکار جزء متعهد به حفظ آن‌ها حتی پس از خاتمه قرارداد می‌باشد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۲ — فسخ قرارداد</h2>
<p>کارفرما حق دارد در موارد ذیل قرارداد را یک‌جانبه فسخ نماید:</p>
<ol>
  <li>تأخیر غیرموجه پیمانکار جزء در شروع یا ادامه کار بیش از ۱۵ روز.</li>
  <li>عدم رعایت مشخصات فنی و استانداردهای کیفی.</li>
  <li>عدم رعایت مقررات ایمنی و بروز حوادث مکرر.</li>
  <li>واگذاری غیرمجاز موضوع قرارداد به شخص ثالث.</li>
  <li>ورشکستگی یا انحلال پیمانکار جزء.</li>
</ol>
<p>در صورت فسخ، کارفرما حق مطالبه خسارات وارده از محل تضامین یا از طریق مراجع قضایی را خواهد داشت.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۳ — حل و فصل اختلاف</h2>
<p>هرگونه اختلاف ناشی از تفسیر یا اجرای این قرارداد ابتدا از طریق مذاکره مستقیم، و در صورت عدم توافق، از طریق داوری مورد توافق طرفین یا مراجع قضایی صالح حل و فصل خواهد شد.</p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۴ — اقامتگاه طرفین</h2>
<p><b>کارفرما:</b> استان اصفهان، شهرستان خوانسار، دهکده گردشگری گلستانکوه — کد پستی: ۸۷۹۱۶۳۰۰۱۰</p>
<p><b>پیمانکار جزء:</b> <b>{{party.address}}</b> — کد پستی: <b>{{party.postalCode}}</b></p>

<h2 style="font-size:14px; margin-top:16px;">ماده ۱۵ — نسخ قرارداد</h2>
<p>این قرارداد در دو نسخه تنظیم شده و هر نسخه حکم واحد دارد و برای طرفین و قائم‌مقام قانونی آن‌ها لازم‌الاجراست.</p>

<div style="margin-top:40px; page-break-inside:avoid;">
  <table style="width:100%; border:none; margin-top:40px;">
    <tr>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">کارفرما</div>
        <div style="border-top:1px solid #999; padding-top:4px;">{{companySignerName}}</div>
      </td>
      <td style="text-align:center; padding:8px;">
        <div style="margin-bottom:60px;">پیمانکار جزء</div>
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

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('=== Part 1: Upserting CLIENT_CONTRACT + SUBCONTRACTOR ===');
  console.log('');

  const templates = [
    { kind: 'CLIENT_CONTRACT', title: 'قرارداد کارفرمایی', bodyHtml: CLIENT_CONTRACT },
    { kind: 'SUBCONTRACTOR',   title: 'قرارداد پیمانکار جزء', bodyHtml: SUBCONTRACTOR },
  ];

  for (const tpl of templates) {
    await prisma.legalContractTemplate.upsert({
      where: { kind: tpl.kind },
      update: { title: tpl.title, bodyHtml: tpl.bodyHtml, isActive: true },
      create: { kind: tpl.kind, title: tpl.title, bodyHtml: tpl.bodyHtml, isActive: true },
    });
    console.log('  [OK] ' + tpl.kind + ' (' + tpl.bodyHtml.length + ' chars)');
  }

  console.log('');
  console.log('=== Part 2: Fixing empty bodyHtml on existing contracts ===');
  console.log('');

  const allTemplates = await prisma.legalContractTemplate.findMany();
  const tplByKind = {};
  allTemplates.forEach((t) => { tplByKind[t.kind] = t.bodyHtml; });

  const emptyContracts = await prisma.legalContract.findMany({
    where: { OR: [{ bodyHtml: null }, { bodyHtml: '' }] },
  });

  console.log('  Found ' + emptyContracts.length + ' contract(s) with empty bodyHtml');

  for (const c of emptyContracts) {
    const html = tplByKind[c.kind];
    if (!html) {
      console.log('  [SKIP] ' + c.code + ' — no template for ' + c.kind);
      continue;
    }
    await prisma.legalContract.update({
      where: { id: c.id },
      data: { bodyHtml: html },
    });
    console.log('  [OK] ' + c.code + ' <- ' + c.kind + ' (' + html.length + ' chars)');
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('');
  const summary = await prisma.legalContractTemplate.findMany({ orderBy: { kind: 'asc' } });
  summary.forEach((t) => {
    const mark = t.bodyHtml && t.bodyHtml.length > 100 ? '[OK]' : '[X]';
    console.log('  ' + mark + ' ' + t.kind.padEnd(24) + ' ' + (t.bodyHtml ? t.bodyHtml.length : 0) + ' chars');
  });

  console.log('');
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());