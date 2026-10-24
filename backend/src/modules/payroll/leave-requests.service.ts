import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.leaveRequest.count();
    return 'LR-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { employeeId?: string; status?: string }) {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.status) where.status = query.status as Prisma.LeaveRequestWhereInput['status'];
    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const l = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!l) throw new NotFoundException('درخواست مرخصی یافت نشد');
    return l;
  }

  async create(dto: CreateLeaveRequestDto, userId: string) {
    const code = await this.generateCode();
    return this.prisma.leaveRequest.create({
      data: {
        code,
        employeeId: dto.employeeId,
        leaveType: dto.leaveType as Prisma.LeaveRequestUncheckedCreateInput['leaveType'],
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days: dto.days,
        reason: dto.reason,
        createdById: userId,
      },
      include: { employee: { select: { id: true, code: true, name: true } } },
    });
  }

  async approve(id: string, userId: string) {
    const l = await this.findOne(id);
    if (l.status !== 'PENDING') throw new BadRequestException('فقط درخواست‌های در انتظار قابل تایید هستند');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const l = await this.findOne(id);
    if (l.status !== 'PENDING') throw new BadRequestException('فقط درخواست‌های در انتظار قابل رد هستند');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }

  async remove(id: string, userId?: string) {
    const l = await this.findOne(id);
    if (l.status !== 'PENDING') throw new BadRequestException('فقط درخواست‌های در انتظار قابل حذف هستند');
    await this.prisma.leaveRequest.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }
}
