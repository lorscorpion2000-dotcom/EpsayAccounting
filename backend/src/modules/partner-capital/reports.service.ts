import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class CapitalReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * تراز تسویه جاری همه شرکا
   */
  async balanceSheet() {
    const accounts = await this.prisma.partnerCapitalAccount.findMany({
      where: { isActive: true },
      include: {
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });

    const totalContributions = await this.prisma.partnerCapitalContribution.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });
    const totalWithdrawals = await this.prisma.partnerCapitalWithdrawal.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    return {
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        partnerName: a.partner.name,
        partnerCode: a.partner.code,
        projectName: a.project?.name || 'شرکت (عمومی)',
        projectCode: a.project?.code || '—',
        balance: Number(a.balance),
      })),
      totals: {
        contributions: Number(totalContributions._sum.amount || 0),
        withdrawals: Number(totalWithdrawals._sum.amount || 0),
        net: Number(totalContributions._sum.amount || 0) - Number(totalWithdrawals._sum.amount || 0),
      },
    };
  }

  /**
   * صورت‌حساب تفصیلی یک شریک
   */
  async partnerStatement(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('شریک یافت نشد');

    const [contributions, withdrawals, accounts, shares] = await Promise.all([
      this.prisma.partnerCapitalContribution.findMany({
        where: { partnerId, status: 'APPROVED' },
        orderBy: { contributionDate: 'asc' },
      }),
      this.prisma.partnerCapitalWithdrawal.findMany({
        where: { partnerId, status: 'APPROVED' },
        orderBy: { withdrawalDate: 'asc' },
      }),
      this.prisma.partnerCapitalAccount.findMany({
        where: { partnerId },
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.projectPartnerShare.findMany({
        where: { partnerId },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

    const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0);
    const totalWithdraw = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

    return {
      partner,
      summary: {
        totalContributions: totalContrib,
        totalWithdrawals: totalWithdraw,
        netBalance: totalContrib - totalWithdraw,
      },
      contributions,
      withdrawals,
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        projectName: a.project?.name || 'شرکت (عمومی)',
        balance: Number(a.balance),
      })),
      shares: shares.map((s) => ({
        projectName: s.project.name,
        sharePercent: Number(s.sharePercent),
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
      })),
    };
  }
}
