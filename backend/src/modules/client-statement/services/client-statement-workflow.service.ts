import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ClientStatementCrudService } from './client-statement-crud.service';

@Injectable()
export class ClientStatementWorkflowService {
  constructor(
    private prisma: PrismaService,
    private crud: ClientStatementCrudService,
  ) {}

  async submit(id: string) {
    const s = await this.crud.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (s.items.length === 0) throw new BadRequestException('صورت‌وضعیت باید حداقل یک ردیف داشته باشد');
    return this.prisma.clientStatement.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  async approve(id: string, userId: string) {
    const s = await this.crud.get(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const s = await this.crud.get(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.clientStatement.update({ where: { id }, data: { status: 'DRAFT', rejectedReason: reason } });
  }

  async cancel(id: string) {
    const s = await this.crud.get(id);
    if (s.status === 'PAID') throw new BadRequestException('پرداخت‌شده قابل لغو نیست');
    return this.prisma.clientStatement.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
