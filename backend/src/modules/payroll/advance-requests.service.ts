import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAdvanceRequestDto } from './dto/advance-request.dto';

@Injectable()
export class AdvanceRequestsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.advanceRequest.count();
    return 'ADV-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { employeeId?: string; status?: string }) {
    const where: any = {};
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.status) where.status = query.status;
    return this.prisma.advanceRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.advanceRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!a) throw new NotFoundException('درخواست مساعده یافت نشد');
    return a;
  }

  async create(dto: CreateAdvanceRequestDto, userId: string) {
    const code = await this.generateCode();
    return this.prisma.advanceRequest.create({
      data: {
        code,
        employeeId: dto.employeeId,
        requestDate: new Date(dto.requestDate),
        amount: dto.amount,
        reason: dto.reason,
        createdById: userId,
      },
      include: { employee: { select: { id: true, code: true, name: true } } },
    });
  }

  async approve(id: string, userId: string) {
    const a = await this.findOne(id);
    if (a.status !== 'PENDING') throw new BadRequestException('فقط درخواست‌های در انتظار قابل تایید هستند');
    return this.prisma.advanceRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const a = await this.findOne(id);
    if (a.status !== 'PENDING') throw new BadRequestException('فقط درخواست‌های در انتظار قابل رد هستند');
    return this.prisma.advanceRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }

  async markPaid(id: string) {
    const a = await this.findOne(id);
    if (a.status !== 'APPROVED') throw new BadRequestException('ابتدا تایید شود');
    return this.prisma.advanceRequest.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  /**
   * مجموع مساعده‌های پرداخت‌نشده یک پرسنل
   */
  async getUnpaidTotal(employeeId: string): Promise<number> {
    const result = await this.prisma.advanceRequest.aggregate({
      where: {
        employeeId,
        status: { in: ['APPROVED', 'PAID'] },
        settledAt: null,
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  }

  async remove(id: string) {
    const a = await this.findOne(id);
    if (a.status === 'PAID') {
      throw new BadRequestException('مساعده پرداخت‌شده قابل حذف نیست');
    }
    await this.prisma.advanceRequest.delete({ where: { id } });
    return { success: true };
  }
}
