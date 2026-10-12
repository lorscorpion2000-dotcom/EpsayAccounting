import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
} from '../dto/create-contract.dto';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // ─── Auto code: LC-YYYY-#### ───
  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'LC-' + year + '-';
    const last = await this.prisma.legalContract.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(params: { kind?: string; status?: string; search?: string; projectId?: string }) {
    const where: any = {};
    if (params.kind) where.kind = params.kind;
    if (params.status) where.status = params.status;
    if (params.projectId) where.projectId = params.projectId;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { registrationNumber: { contains: params.search, mode: 'insensitive' } },
        { party: { fullName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.legalContract.findMany({
      where,
      include: {
        party: { select: { id: true, fullName: true, nationalId: true, kind: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByParty(partyIdOrPartnerId: string, kind?: string) {
    let resolvedPartyId = partyIdOrPartnerId;

    const asLegalParty = await this.prisma.legalContractParty.findUnique({
      where: { id: partyIdOrPartnerId },
      select: { id: true },
    });

    if (!asLegalParty) {
      const partner = await this.prisma.partner.findUnique({
        where: { id: partyIdOrPartnerId },
        select: { id: true, name: true, nationalId: true },
      });

      if (!partner) return [];

      let linkedParty = null;
      if (partner.nationalId) {
        linkedParty = await this.prisma.legalContractParty.findFirst({
          where: { nationalId: partner.nationalId },
          select: { id: true },
        });
      }
      if (!linkedParty) {
        linkedParty = await this.prisma.legalContractParty.findFirst({
          where: { fullName: partner.name },
          select: { id: true },
        });
      }

      if (!linkedParty) return [];
      resolvedPartyId = linkedParty.id;
    }

    const where: any = {
      partyId: resolvedPartyId,
      status: { in: ['DRAFT', 'ACTIVE', 'SUSPENDED'] },
    };
    if (kind) where.kind = kind;

    return this.prisma.legalContract.findMany({
      where,
      include: {
        items: { orderBy: { rowNumber: 'asc' } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const item = await this.prisma.legalContract.findUnique({
      where: { id },
      include: {
        party: true,
        project: { select: { id: true, name: true, code: true } },
        attachments: true,
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!item) throw new NotFoundException('قرارداد پیدا نشد');
    return item;
  }

  private calcItemTotal(it: any) {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unitPrice) || 0;
    return q * p;
  }

  async create(dto: CreateLegalContractDto) {
    const code = await this.nextCode();

    const items = dto.items || [];
    const itemsTotal = items.reduce((s, it) => s + this.calcItemTotal(it), 0);
    const finalTotal = items.length > 0 ? itemsTotal : dto.totalAmount;

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.legalContract.create({
        data: {
          code,
          kind: dto.kind as any,
          status: 'DRAFT',
          title: dto.title,
          partyId: dto.partyId,
          projectId: dto.projectId,
          registrationNumber: dto.registrationNumber,
          registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : undefined,
          subject: dto.subject,
          bodyHtml: dto.bodyHtml,
          totalAmount: finalTotal,
          salaryMonthly: dto.salaryMonthly,
          salaryDaily: dto.salaryDaily,
          salaryHourly: dto.salaryHourly,
          wageBreakdown: dto.wageBreakdown ?? undefined,
          workHoursPerWeek: dto.workHoursPerWeek,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          durationText: dto.durationText,
          workLocation: dto.workLocation,
          guaranteeType: dto.guaranteeType,
          guaranteeNumber: dto.guaranteeNumber,
          guaranteeAmount: dto.guaranteeAmount,
          guaranteeBank: dto.guaranteeBank,
          supervisorName: dto.supervisorName,
          companySignerName: dto.companySignerName,
          workerSignerName: dto.workerSignerName,
          notes: dto.notes,
        },
      });

      if (items.length > 0) {
        await tx.legalContractItem.createMany({
          data: items.map((it, idx) => ({
            contractId: contract.id,
            rowNumber: it.rowNumber ?? idx + 1,
            description: it.description,
            unit: it.unit,
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unitPrice) || 0,
            totalPrice: this.calcItemTotal(it),
            notes: it.notes,
          })),
        });
      }

      return contract;
    });
  }

  async update(id: string, dto: UpdateLegalContractDto) {
    await this.get(id);
    const data: any = { ...dto };
    if (dto.registrationDate) data.registrationDate = new Date(dto.registrationDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    delete data.items;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.legalContractItem.deleteMany({ where: { contractId: id } });

        const items = dto.items || [];
        if (items.length > 0) {
          await tx.legalContractItem.createMany({
            data: items.map((it, idx) => ({
              contractId: id,
              rowNumber: it.rowNumber ?? idx + 1,
              description: it.description,
              unit: it.unit,
              quantity: Number(it.quantity) || 0,
              unitPrice: Number(it.unitPrice) || 0,
              totalPrice: this.calcItemTotal(it),
              notes: it.notes,
            })),
          });
          data.totalAmount = items.reduce((s, it) => s + this.calcItemTotal(it), 0);
        } else if (dto.totalAmount !== undefined) {
          data.totalAmount = dto.totalAmount;
        }
      }

      return tx.legalContract.update({ where: { id }, data });
    });
  }

  async cancel(id: string, reason: string, userId?: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('دلیل ابطال الزامی است');
    }
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledById: userId,
      },
    });
  }

  async activate(id: string) {
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async reactivate(id: string) {
    const c = await this.get(id);
    if (!['SUSPENDED', 'COMPLETED', 'CANCELLED', 'TERMINATED'].includes(c.status)) {
      throw new BadRequestException('قرارداد در وضعیت پایانی نیست');
    }
    return this.prisma.legalContract.update({
      where: { id },
      data: { status: 'ACTIVE', cancelledAt: null, cancellationReason: null },
    });
  }

  async complete(id: string) {
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    const existing = await this.get(id);
    const force = options?.force === true;

    if (!force) {
      if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
        throw new BadRequestException('فقط قراردادهای پیش‌نویس یا ابطال‌شده قابل حذف هستند. برای حذف کامل از حالت مدیر استفاده کنید.');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.legalContractItem.deleteMany({ where: { contractId: id } });
        await tx.legalContract.delete({ where: { id } });
      });
      return { ok: true, hardDeleted: true };
    }

    const refs = await this.countReferences(id);
    const total = Object.values(refs).reduce((sum: number, n: any) => sum + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'CONTRACT_HAS_REFS',
        message: 'قرارداد در ' + total + ' مورد دیگر استفاده شده است. ابتدا آن‌ها را پاک کنید:\n' + details,
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.legalContractAttachment.deleteMany({ where: { contractId: id } }).catch(() => {});
      await tx.legalContractItem.deleteMany({ where: { contractId: id } });
      await tx.legalContract.delete({ where: { id } });
    });

    return { ok: true, hardDeleted: true };
  }

  private async countReferences(id: string) {
    const p = this.prisma;
    const r = await Promise.all([
      p.subcontractorStatement.count({ where: { contractId: id } }).catch(() => 0),
      (p as any).workerStatement?.count({ where: { contractId: id } }).catch(() => 0) || Promise.resolve(0),
    ]);
    return {
      subcontractorStatements: Number(r[0] || 0),
      workerStatements: Number(r[1] || 0),
    };
  }
}
