import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ClientStatementCrudService } from './client-statement-crud.service';
import { ClientStatementPostService } from './client-statement-post.service';

@Injectable()
export class ClientStatementWorkflowService {
  constructor(
    private prisma: PrismaService,
    private crud: ClientStatementCrudService,
    private postSvc: ClientStatementPostService,
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
    const updated = await this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
    // F13: auto-post JE on approve (parity with subcontractor/worker)
    try {
      const posted = await this.postSvc.post(id, userId);
      return posted;
    } catch (e) {
      console.error('[client-statement] post failed:', e && e.message, e && e.stack);
      // status is APPROVED; JE failed. User can retry via /post endpoint.
      return updated;
    }
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
