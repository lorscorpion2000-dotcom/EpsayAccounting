import { Test, TestingModule } from '@nestjs/testing';
import { SharesService } from './shares.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import Decimal from 'decimal.js';

describe('SharesService - Dynamic Dilution', () => {
  let service: SharesService;

  const mockPrisma: any = {
    projectPartnerShare: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SharesService>(SharesService);
  });

  it('باید سهم شریک جدید را درست محاسبه کرده و مجموع سهم‌ها را دقیقاً روی ۱۰۰٪ تنظیم کند', async () => {
    mockPrisma.projectPartnerShare.findMany.mockResolvedValue([
      {
        id: 'share-1',
        projectId: 'proj-100',
        partnerId: 'partner-A',
        sharePercent: new Decimal(100.0),
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
      },
    ]);

    const result = await service.addPartnerWithDilution({
      projectId: 'proj-100',
      partnerId: 'partner-B',
      contributionUsd: 50000,
      usdRate: 100000,
      currentProjectValuationUsd: 100000,
      effectiveFrom: '2026-02-01',
    });

    expect(result.success).toBe(true);
    expect(result.newValuationUsd).toBe(150000);
    expect(result.newPartnerSharePercent).toBe(33.33);
    expect(result.totalSharesPercent).toBe(100.0);
    expect(mockPrisma.projectPartnerShare.createMany).toHaveBeenCalledTimes(1);
  });
});
