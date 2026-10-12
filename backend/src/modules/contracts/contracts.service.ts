import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Auto code: LC-YYYY-####
  // ─────────────────────────────────────────────
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

  /**
   * لیست قراردادهای یک طرف قرارداد (پرسنل/پیمانکار)
   * برای استفاده در فرم صورت‌وضعیت
   */
  async listByParty(partyIdOrPartnerId: string, kind?: string) {
    // حل‌کردن: آیا LegalContractParty است یا Partner؟
    let resolvedPartyId = partyIdOrPartnerId;

    const asLegalParty = await this.prisma.legalContractParty.findUnique({
      where: { id: partyIdOrPartnerId },
      select: { id: true },
    });

    if (!asLegalParty) {
      // احتمالاً Partner id داده شده — از nationalId یا fullName تبدیل کن
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

  /**
   * محاسبه‌ی جمع یک ردیف
   */
  private calcItemTotal(it: any) {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unitPrice) || 0;
    return q * p;
  }

  async create(dto: CreateLegalContractDto) {
    const code = await this.nextCode();

    // اگر اجزا داده شده، جمع را از Σ محاسبه کن
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
    delete data.items; // items جدا مدیریت می‌شود

    return this.prisma.$transaction(async (tx) => {
      // اگر items داده شده، جایگزین کن و totalAmount را از Σ حساب کن
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

  // ─────────────────────────────────────────────
  // Parties
  // ─────────────────────────────────────────────
  async listParties(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.legalContractParty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getParty(id: string) {
    const p = await this.prisma.legalContractParty.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('طرف قرارداد پیدا نشد');
    return p;
  }

  async createParty(dto: CreateLegalPartyDto) {
    return this.prisma.legalContractParty.create({
      data: {
        kind: dto.kind as any,
        fullName: dto.fullName,
        fatherName: dto.fatherName,
        nationalId: dto.nationalId || null,
        economicCode: dto.economicCode,
        registrationNumber: dto.registrationNumber,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        mobilePhone: dto.mobilePhone,
        landlinePhone: dto.landlinePhone,
        email: dto.email,
        maritalStatus: dto.maritalStatus as any,
        childrenCount: dto.childrenCount,
        education: dto.education,
        job: dto.job,
        insuranceNumber: dto.insuranceNumber,
        address: dto.address,
        postalCode: dto.postalCode,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankSheba: dto.bankSheba,
        notes: dto.notes,
      },
    });
  }

  async updateParty(id: string, dto: CreateLegalPartyDto) {
    await this.getParty(id);
    const data: any = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    return this.prisma.legalContractParty.update({ where: { id }, data });
  }


  // ═══════════════════════════════════════════════════════════════
  // Contract Templates
  // ═══════════════════════════════════════════════════════════════

  async listTemplates() {
    return this.prisma.legalContractTemplate.findMany({
      orderBy: { kind: 'asc' },
    });
  }

  async getTemplate(kind: string) {
    return this.prisma.legalContractTemplate.findUnique({
      where: { kind: kind as any },
    });
  }

  async upsertTemplate(kind: string, title: string, bodyHtml: string) {
    return this.prisma.legalContractTemplate.upsert({
      where: { kind: kind as any },
      update: { title, bodyHtml },
      create: { kind: kind as any, title, bodyHtml },
    });
  }


  // ═══════════════════════════════════════════════════════════════
  // Create or find a LegalContractParty from an EmployeeProfile
  // (used when the contract kind is WORKER_EMPLOYMENT)
  // ═══════════════════════════════════════════════════════════════
  async findOrCreatePartyFromEmployee(employeeId: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { partner: true },
    });
    if (!emp) throw new NotFoundException('پرسنل پیدا نشد');

    const partner = emp.partner;
    const nationalId = emp.nationalId || partner.nationalId || null;

    // Try to find existing party by nationalId
    let existing = null;
    if (nationalId) {
      existing = await this.prisma.legalContractParty.findFirst({
        where: { nationalId },
      });
    }

    const partyData = {
      kind: 'INDIVIDUAL' as any,
      fullName: partner.name,
      fatherName: partner.fatherName || null,
      nationalId,
      postalCode: partner.postalCode || null,
      mobilePhone: partner.phone || null,
      landlinePhone: null,
      email: partner.email || null,
      address: partner.address || null,
      bankName: emp.bankName || null,
      bankAccount: emp.bankAccount || null,
      bankSheba: emp.bankIban || null,
      insuranceNumber: emp.insuranceNumber || null,
      job: emp.position || null,
      education: emp.education || null,
      birthDate: emp.birthDate || null,
      maritalStatus: (emp.maritalStatus as any) || null,
      childrenCount: emp.childrenCount || null,
    };

    if (existing) {
      // Update existing with latest info
      return this.prisma.legalContractParty.update({
        where: { id: existing.id },
        data: partyData,
      });
    }

    return this.prisma.legalContractParty.create({ data: partyData });
  }

  /**
   * ساخت/بازیابی LegalContractParty از Partner (پیمانکار، تأمین‌کننده، ...)
   */
  async findOrCreatePartyFromPartner(partnerId: string) {
    const p = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!p) throw new NotFoundException('شخص پیدا نشد');

    const nationalId = p.nationalId || null;

    // اگر از قبل party با این کد ملی هست
    let existing = null;
    if (nationalId) {
      existing = await this.prisma.legalContractParty.findFirst({ where: { nationalId } });
    }

    const partyData: any = {
      kind: 'COMPANY' as any, // پیش‌فرض: حقوقی — کاربر می‌تواند ویرایش کند
      fullName: p.name,
      fatherName: (p as any).fatherName || null,
      nationalId,
      postalCode: p.postalCode || null,
      mobilePhone: p.phone || null,
      email: p.email || null,
      address: p.address || null,
      job: (p as any).jobDescription || null,
      bankName: null,
      bankAccount: (p as any).bankAccountNumber || null,
      bankSheba: (p as any).shabaNumber || null,
      notes: (p as any).aliasName ? 'نام مستعار: ' + (p as any).aliasName : null,
    };

    if (existing) {
      return this.prisma.legalContractParty.update({ where: { id: existing.id }, data: partyData });
    }
    return this.prisma.legalContractParty.create({ data: partyData });
  }

  async remove(id: string, options?: { force?: boolean }) {
    const existing = await this.get(id);
    const force = options?.force === true;

    if (!force) {
      if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
        throw new BadRequestException('فقط قراردادهای پیشنویس یا ابطالشده قابل حذف هستند. برای حذف کامل از حالت مدیر استفاده کنید.');
      }
      // فقط اجزا و قرارداد
      await this.prisma.$transaction(async (tx) => {
        await tx.legalContractItem.deleteMany({ where: { contractId: id } });
        await tx.legalContract.delete({ where: { id } });
      });
      return { ok: true, hardDeleted: true };
    }

    // force: چک ارجاعها
    const refs = await this.countReferences(id);
    const total = Object.values(refs).reduce((sum: number, n: any) => sum + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'CONTRACT_HAS_REFS',
        message: '\u0642\u0631\u0627\u0631\u062f\u0627\u062f \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647 \u0627\u0633\u062a. \u0627\u0628\u062a\u062f\u0627 \u0622\u0646\u200c\u0647\u0627 \u0631\u0627 \u067e\u0627\u06a9 \u06a9\u0646\u06cc\u062f:\n' + details,
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // حذف پیوستها
      await tx.legalContractAttachment.deleteMany({ where: { contractId: id } }).catch(() => {});
      // حذف اجزا
      await tx.legalContractItem.deleteMany({ where: { contractId: id } });
      // حذف قرارداد
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
