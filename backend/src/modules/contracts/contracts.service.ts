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

  async get(id: string) {
    const item = await this.prisma.legalContract.findUnique({
      where: { id },
      include: {
        party: true,
        project: { select: { id: true, name: true, code: true } },
        attachments: true,
      },
    });
    if (!item) throw new NotFoundException('قرارداد پیدا نشد');
    return item;
  }

  async create(dto: CreateLegalContractDto) {
    const code = await this.nextCode();
    return this.prisma.legalContract.create({
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
        totalAmount: dto.totalAmount,
        salaryMonthly: dto.salaryMonthly,
        salaryDaily: dto.salaryDaily,
        salaryHourly: dto.salaryHourly,
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
  }

  async update(id: string, dto: UpdateLegalContractDto) {
    await this.get(id);
    const data: any = { ...dto };
    if (dto.registrationDate) data.registrationDate = new Date(dto.registrationDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.legalContract.update({ where: { id }, data });
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

  async remove(id: string) {
    const existing = await this.get(id);
    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      throw new BadRequestException('فقط قراردادهای پیش‌نویس یا ابطال‌شده قابل حذف هستند');
    }
    await this.prisma.legalContract.delete({ where: { id } });
    return { ok: true };
  }
}
