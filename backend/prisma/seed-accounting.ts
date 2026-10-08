// E:\EpsayAccounting\backend\prisma\seed-accounting.ts
import { PrismaClient, AccountLevel, AccountNature, AccountSubtype } from '@prisma/client';

// ============================================================
// Map account code -> subtype for aging/reporting
// ============================================================
function detectSubtype(code: string): AccountSubtype | null {
  const map: Record<string, AccountSubtype> = {
    '1.1.1': 'CASH',
    '1.1.2': 'ACCOUNTS_RECEIVABLE',
    '1.1.3': 'INVENTORY',
    '1.1.4': 'PREPAID',
    '1.1.5': 'CASH',
    '1.2.1': 'FIXED_ASSET',
    '1.2.2': 'ACCUMULATED_DEPRECIATION',
    '2.1.1': 'ACCOUNTS_PAYABLE',
    '2.1.2': 'SALARY_PAYABLE',
    '2.1.3': 'TAX_PAYABLE',
    '2.1.4': 'INSURANCE_PAYABLE',
    '2.1.5': 'ACCOUNTS_PAYABLE',
    '3.3':   'RETAINED_EARNINGS',
  };
  return map[code] ?? null;
}
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding accounting core...');

  // 1. سال مالی جاری
  const fy = await prisma.fiscalYear.upsert({
    where: { code: '1404' },
    update: {},
    create: {
      code: '1404',
      name: 'سال مالی ۱۴۰۴',
      startDate: new Date('2025-03-21'),
      endDate: new Date('2026-03-20'),
      isCurrent: true,
      status: 'OPEN',
    },
  });
  console.log('  ✓ Fiscal year 1404');

  // 2. ساختار پایه کدینگ
  const tree: any = {
    '1': { name: 'دارایی‌ها', nature: 'DEBIT', children: {
      '1.1': { name: 'دارایی جاری', children: {
        '1.1.1': { name: 'موجودی نقد و بانک', children: {
          '1.1.1.01': { name: 'صندوق', nature: 'DEBIT', postable: true },
          '1.1.1.02': { name: 'بانک‌ها', nature: 'DEBIT', postable: true },
          '1.1.1.03': { name: 'تنخواه‌گردان‌ها', nature: 'DEBIT', postable: true },
        }},
        '1.1.2': { name: 'حساب‌های دریافتنی', children: {
          '1.1.2.01': { name: 'حساب‌های دریافتنی تجاری', nature: 'DEBIT', postable: true },
          '1.1.2.02': { name: 'اسناد دریافتنی', nature: 'DEBIT', postable: true },
        }},
        '1.1.3': { name: 'موجودی مواد و کالا', children: {
          '1.1.3.01': { name: 'موجودی مصالح', nature: 'DEBIT', postable: true },
        }},
      }},
      '1.2': { name: 'دارایی غیرجاری', children: {
        '1.2.1': { name: 'دارایی ثابت', children: {
          '1.2.1.01': { name: 'ماشین‌آلات و تجهیزات', nature: 'DEBIT', postable: true },
        }},
      }},
    }},
    '2': { name: 'بدهی‌ها', nature: 'CREDIT', children: {
      '2.1': { name: 'بدهی جاری', children: {
        '2.1.1': { name: 'حساب‌های پرداختنی', children: {
          '2.1.1.01': { name: 'حساب‌های پرداختنی تجاری', nature: 'CREDIT', postable: true },
          '2.1.1.02': { name: 'اسناد پرداختنی', nature: 'CREDIT', postable: true },
        }},
        '2.1.2': { name: 'بدهی پرسنلی', children: {
          '2.1.2.01': { name: 'حقوق پرداختنی', nature: 'CREDIT', postable: true },
          '2.1.2.02': { name: 'بیمه پرداختنی', nature: 'CREDIT', postable: true },
          '2.1.2.03': { name: 'مالیات پرداختنی', nature: 'CREDIT', postable: true },
        }},
      }},
    }},
    '3': { name: 'سرمایه', nature: 'CREDIT', children: {
      '3.1': { name: 'سرمایه شرکا', children: {
        '3.1.1': { name: 'سرمایه حسن جویانی', nature: 'CREDIT', postable: true },
        '3.1.2': { name: 'سرمایه مهدی امینی', nature: 'CREDIT', postable: true },
      }},
      '3.2': { name: 'برداشت شرکا', children: {
        '3.2.1': { name: 'برداشت حسن جویانی', nature: 'DEBIT', postable: true },
        '3.2.2': { name: 'برداشت مهدی امینی', nature: 'DEBIT', postable: true },
      }},
    }},
    '4': { name: 'درآمدها', nature: 'CREDIT', children: {
      '4.1': { name: 'درآمد عملیاتی', children: {
        '4.1.1': { name: 'درآمد قراردادها', nature: 'CREDIT', postable: true },
        '4.1.2': { name: 'درآمد صورت‌وضعیت‌ها', nature: 'CREDIT', postable: true },
      }},
    }},
    '5': { name: 'هزینه‌ها', nature: 'DEBIT', children: {
      '5.1': { name: 'بهای تمام‌شده', children: {
        '5.1.1': { name: 'مصالح مصرفی', nature: 'DEBIT', postable: true },
        '5.1.2': { name: 'دستمزد مستقیم', nature: 'DEBIT', postable: true },
        '5.1.3': { name: 'پیمانکاران جزء', nature: 'DEBIT', postable: true },
        '5.1.4': { name: 'ماشین‌آلات', nature: 'DEBIT', postable: true },
      }},
      '5.2': { name: 'هزینه‌های اداری و عمومی', children: {
        '5.2.1': { name: 'حقوق و دستمزد اداری', nature: 'DEBIT', postable: true },
        '5.2.2': { name: 'اجاره', nature: 'DEBIT', postable: true },
        '5.2.3': { name: 'هزینه‌های متفرقه', nature: 'DEBIT', postable: true },
      }},
    }},
  };

  // تابع بازگشتی برای ساخت درخت
  async function createNode(code: string, node: any, parentId?: string) {
    const existing = await prisma.account.findUnique({ where: { code } });
    if (existing) return existing.id;

    const level = !parentId ? 'GROUP'
      : !node.children ? 'DETAIL'
      : code.split('.').length === 2 ? 'GENERAL'
      : 'SUBSIDIARY';

    const created = await prisma.account.create({
      data: {
        code,
        name: node.name,
        level: level as AccountLevel,
        nature: (node.nature || 'DEBIT') as AccountNature,
        parentId,
        isActive: true,
        isPostable: !!node.postable,
        subtype: detectSubtype(code),
      },
    });

    if (node.children) {
      for (const [childCode, childNode] of Object.entries(node.children)) {
        await createNode(childCode, childNode, created.id);
      }
    }
    return created.id;
  }

  for (const [code, node] of Object.entries(tree)) {
    await createNode(code, node);
  }

  const count = await prisma.account.count();
  console.log(`  ✓ ${count} accounts created`);
  console.log('\\n=============================================');
  console.log('  Accounting seed completed!');
  console.log('=============================================');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());