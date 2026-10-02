import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePettyCashAccountDto } from './dto/create-account.dto';
import { UpdatePettyCashAccountDto } from './dto/update-account.dto';

@Injectable()
export class PettyCashAccountsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.pettyCashAccount.count();
    return 'PC-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(query?: { holderId?: string; projectId?: string; active?: boolean }) {
    const where: any = {};
    if (query?.holderId) where.holderId = query.holderId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.active !== undefined) where.isActive = query.active;

    return this.prisma.pettyCashAccount.findMany({
      where,
      include: {
        holder: { select: { id: true, fullName: true, username: true } },
            employee: { select: { id: true, fullName: true, code: true } },
            partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { transactions: true, requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.pettyCashAccount.findUnique({
      where: { id },
      include: {
        holder: { select: { id: true, fullName: true, username: true, mobile: true } },
            employee: { select: { id: true, fullName: true, code: true } },
            partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { transactions: true, requests: true } },
      },
    });
    if (!account) throw new NotFoundException('حساب تنخواه یافت نشد');
    return account;
  }

  async create(dto: CreatePettyCashAccountDto) {
    const code = await this.generateCode();
    return this.prisma.pettyCashAccount.create({
      data: {
        code,
        name: dto.name,
        holderId: dto.holderId || null,
            employeeId: dto.employeeId || null,
            partnerId: dto.partnerId || null,
        projectId: dto.projectId,
        ceilingPerTx: dto.ceilingPerTx ?? 200000000,
        weeklyLimit: dto.weeklyLimit ?? 300000000,
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
      include: {
        holder: { select: { id: true, fullName: true } },
            employee: { select: { id: true, fullName: true, code: true } },
            partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePettyCashAccountDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.holderId !== undefined) data.holderId = dto.holderId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.ceilingPerTx !== undefined) data.ceilingPerTx = dto.ceilingPerTx;
    if (dto.weeklyLimit !== undefined) data.weeklyLimit = dto.weeklyLimit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.pettyCashAccount.update({
      where: { id },
      data,
      include: {
        holder: { select: { id: true, fullName: true } },
            employee: { select: { id: true, fullName: true, code: true } },
            partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const txCount = await this.prisma.pettyCashTransaction.count({ where: { accountId: id } });
    if (txCount > 0) {
      throw new BadRequestException('این حساب دارای تراکنش است و قابل حذف نیست');
    }
    await this.prisma.pettyCashAccount.delete({ where: { id } });
    return { success: true };
  }

  /**
   * محاسبه مجموع خریدهای هفته جاری
   */
  async getWeeklyTotal(accountId: string): Promise<number> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // شنبه = 0 در ایران
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((dayOfWeek + 1) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await this.prisma.pettyCashTransaction.aggregate({
      where: {
        accountId,
        type: 'EXPENSE',
        status: { in: ['SUBMITTED', 'APPROVED'] },
        txDate: { gte: startOfWeek },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }
}
