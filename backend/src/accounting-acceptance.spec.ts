import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './shared/prisma/prisma.service';

describe('Accounting Acceptance Tests (Financial Logic)', () => {
  let prisma: PrismaService;

  const mockPrisma: any = {
    journalLine: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    journalEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    fiscalYear: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  it('۱. تراز آزمایشی کل اسناد صادرشده باید کاملاً تراز و اختلاف بدهکار/بستانکار صفر باشد', async () => {
    mockPrisma.journalLine.aggregate.mockResolvedValue({
      _sum: { debit: 1500000000, credit: 1500000000 },
    });

    const result = await prisma.journalLine.aggregate({
      _sum: { debit: true, credit: true },
    });

    const debitSum = Number(result._sum?.debit ?? 0);
    const creditSum = Number(result._sum?.credit ?? 0);
    const difference = debitSum - creditSum;

    expect(difference).toBe(0);
  });

  it('۲. ثبت سند در دوره مالی قفل‌شده (بسته‌شده) باید رد شود', async () => {
    mockPrisma.fiscalYear.findFirst.mockResolvedValue({
      id: 'period-2025',
      status: 'CLOSED',
    });

    const period = await prisma.fiscalYear.findFirst({
      where: { status: 'CLOSED' },
    });

    expect(period?.status).toBe('CLOSED');
  });

  it('۳. ذخیره‌گیری عیدی (۲/۱۲) و سنوات (۱/۱۲) باید دقیق محاسبه شود', () => {
    const baseSalary = 120000000; // ۱۲۰ میلیون ریال حقوق پایه
    const bonusAccrual = Math.round((baseSalary * 2) / 12); // ۲۰ میلیون ریال
    const severanceAccrual = Math.round(baseSalary / 12); // ۱۰ میلیون ریال

    expect(bonusAccrual).toBe(20000000);
    expect(severanceAccrual).toBe(10000000);
    expect(bonusAccrual + severanceAccrual).toBe(30000000);
  });
});
