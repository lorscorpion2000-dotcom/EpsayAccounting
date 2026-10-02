import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// [code, name, level, nature, isPostable]
const ACCOUNTS = [
  // ═════════ 1 — داراییها ═════════
  ['1',     'داراییها',                'GROUP',     'DEBIT', false],
  ['1.1',   'دارایی جاری',              'GENERAL',   'DEBIT', false],
  ['1.1.1', 'موجودی نقد و بانک',         'SUBSIDIARY','DEBIT', true],
  ['1.1.2', 'حسابهای دریافتنی',         'SUBSIDIARY','DEBIT', true],
  ['1.1.3', 'موجودی مواد و کالا',        'SUBSIDIARY','DEBIT', true],
  ['1.1.4', 'پیشپرداختها',              'SUBSIDIARY','DEBIT', true],
  ['1.1.5', 'تنخواه گردانها',           'SUBSIDIARY','DEBIT', true],
  ['1.2',   'دارایی غیرجاری',            'GENERAL',   'DEBIT', false],
  ['1.2.1', 'دارایی ثابت',              'SUBSIDIARY','DEBIT', true],
  ['1.2.2', 'استهلاک انباشته',           'SUBSIDIARY','CREDIT', true],

  // ═════════ 2 — بدهیها ═════════
  ['2',     'بدهیها',                  'GROUP',     'CREDIT', false],
  ['2.1',   'بدهی جاری',                'GENERAL',   'CREDIT', false],
  ['2.1.1', 'حسابهای پرداختنی',         'SUBSIDIARY','CREDIT', true],
  ['2.1.2', 'بدهی پرسنلی',              'SUBSIDIARY','CREDIT', true],
  ['2.1.3', 'مالیات و عوارض',            'SUBSIDIARY','CREDIT', true],
  ['2.1.4', 'بیمه تأمین اجتماعی',        'SUBSIDIARY','CREDIT', true],
  ['2.1.5', 'پیمانکاران و تأمینکنندگان','SUBSIDIARY','CREDIT', true],

  // ═════════ 3 — سرمایه ═════════
  ['3',     'سرمایه',                    'GROUP',     'CREDIT', false],
  ['3.1',   'سرمایه شرکا',                'GENERAL',   'CREDIT', false],
  ['3.1.1', 'سرمایه حسن جویانی',          'SUBSIDIARY','CREDIT', true],
  ['3.1.2', 'سرمایه مهدی امینی',          'SUBSIDIARY','CREDIT', true],
  ['3.2',   'برداشت شرکا',               'GENERAL',   'DEBIT',  false],
  ['3.2.1', 'برداشت حسن جویانی',          'SUBSIDIARY','DEBIT',  true],
  ['3.2.2', 'برداشت مهدی امینی',          'SUBSIDIARY','DEBIT',  true],
  ['3.3',   'سود و زیان انباشته',         'GENERAL',   'CREDIT', true],

  // ═════════ 4 — درآمدها ═════════
  ['4',     'درآمدها',                   'GROUP',     'CREDIT', false],
  ['4.1',   'درآمد قراردادهای ساخت',      'GENERAL',   'CREDIT', false],
  ['4.1.1', 'درآمد صورتوضعیت کارفرما',    'SUBSIDIARY','CREDIT', true],
  ['4.2',   'درآمد فروش واحدها',          'GENERAL',   'CREDIT', false],
  ['4.2.1', 'درآمد پیشفروش واحدها',       'SUBSIDIARY','CREDIT', true],
  ['4.3',   'درآمد متفرقه',              'GENERAL',   'CREDIT', true],

  // ═════════ 5 — هزینهها ═════════
  ['5',     'هزینهها',                  'GROUP',     'DEBIT',  false],
  ['5.1',   'بهای تمامشده',              'GENERAL',   'DEBIT',  false],
  ['5.1.1', 'مصالح مصرفی',               'SUBSIDIARY','DEBIT',  true],
  ['5.1.2', 'دستمزد مستقیم',             'SUBSIDIARY','DEBIT',  true],
  ['5.1.3', 'پیمانکاران جزء',             'SUBSIDIARY','DEBIT',  true],
  ['5.2',   'هزینههای اداری و عمومی',     'GENERAL',   'DEBIT',  false],
  ['5.2.1', 'حقوق و دستمزد اداری',        'SUBSIDIARY','DEBIT',  true],
  ['5.2.2', 'اجاره و شار',              'SUBSIDIARY','DEBIT',  true],
  ['5.2.3', 'هزینههای سفر و مأموریت',    'SUBSIDIARY','DEBIT',  true],
  ['5.3',   'هزینههای مالی',              'GENERAL',   'DEBIT',  true],
  ['5.4',   'هزینههای تنخواه',           'GENERAL',   'DEBIT',  false],
  ['5.4.1', 'خرید جزئی از تنخواه',        'SUBSIDIARY','DEBIT',  true],
];

// ساخت کد → id
async function main() {
  console.log('=== Seeding chart of accounts ===\n');

  const existing = await prisma.account.count();
  if (existing > 0) {
    console.log('[INFO] حسابها از قبل موجود (' + existing + ')');
    console.log('       برای شروع تازه ابتدا: node prisma/reset-accounts.mjs');
    return;
  }

  const idMap = new Map();
  let created = 0;

  // مرحله ۱: همه را بدون parentId بساز
  for (const [code, name, level, nature, isPostable] of ACCOUNTS) {
    const acc = await prisma.account.create({
      data: { code, name, level, nature, isPostable, isActive: true },
    });
    idMap.set(code, acc.id);
    created++;
  }

  // مرحله ۲: والدین را وصل کن
  for (const [code] of ACCOUNTS) {
    const parts = code.split('.');
    if (parts.length === 1) continue;
    const parentCode = parts.slice(0, -1).join('.');
    const parentId = idMap.get(parentCode);
    if (parentId) {
      await prisma.account.update({
        where: { code },
        data: { parentId },
      });
    }
  }

  console.log('[OK] ' + created + ' حساب ساخته شد');
  console.log('');
  console.log('=========================================');
  console.log('  حالا صفحه /accounting/accounts را رفرش کنید');
  console.log('=========================================');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());