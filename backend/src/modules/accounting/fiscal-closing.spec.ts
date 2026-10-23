import { Prisma } from '@prisma/client';
import { FiscalYearsService } from './fiscal-years.service';

const D = Prisma.Decimal;

describe('FiscalYearsService.generateClosingEntry', () => {
  it('باید سند اختتامیه با Decimal دقیق محاسبه و تراز شود (0.1 + 0.2)', async () => {
    const created: any[] = [];
    const tx: any = {
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(async (a) => { created.push(a); return a.data; }),
      },
      fiscalYear: { update: jest.fn().mockResolvedValue({ nextEntryNumber: 8 }) },
    };
    const prisma: any = {
      journalEntry: { findFirst: jest.fn().mockResolvedValue(null) },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ret', code: '3.3.1', name: 'سود و زیان انباشته' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'rev', code: '4.1', name: 'درآمد' },
          { id: 'exp', code: '5.1', name: 'هزینه' },
        ]),
      },
      journalLine: {
        groupBy: jest.fn().mockResolvedValue([
          { accountId: 'rev', _sum: { debit: new D('0'), credit: new D('0.3') } },
          { accountId: 'exp', _sum: { debit: new D('0.1'), credit: new D('0') } },
        ]),
      },
      fiscalYear: {
        findUnique: jest.fn().mockResolvedValue({ id: 'fy', code: '1405', name: '۱۴۰۵', status: 'OPEN', endDate: new Date('2026-03-20') }),
      },
      $transaction: jest.fn(async (fn) => fn(tx)),
    };
    const svc: any = new FiscalYearsService(prisma);
    svc.assertPeriodOpen = jest.fn().mockResolvedValue({});

    await svc.generateClosingEntry('fy', 'u1', 'سند اختتامیه');

    expect(created.length).toBe(1);
    const data = created[0].data;
    const lines = data.lines.create;
    const totalDr = lines.reduce((s: Prisma.Decimal, l: any) => s.plus(new D(l.debit)), new D(0));
    const totalCr = lines.reduce((s: Prisma.Decimal, l: any) => s.plus(new D(l.credit)), new D(0));
    expect(totalDr.toFixed(2)).toBe(totalCr.toFixed(2));
  });
});
