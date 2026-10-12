import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateLegalPartyDto } from '../dto/create-party.dto';

@Injectable()
export class LegalPartyService {
  constructor(private prisma: PrismaService) {}

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

  async findOrCreatePartyFromEmployee(employeeId: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { partner: true },
    });
    if (!emp) throw new NotFoundException('پرسنل پیدا نشد');

    const partner = emp.partner;
    const nationalId = emp.nationalId || partner.nationalId || null;

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
      return this.prisma.legalContractParty.update({
        where: { id: existing.id },
        data: partyData,
      });
    }

    return this.prisma.legalContractParty.create({ data: partyData });
  }

  async findOrCreatePartyFromPartner(partnerId: string) {
    const p = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!p) throw new NotFoundException('شخص پیدا نشد');

    const nationalId = p.nationalId || null;

    let existing = null;
    if (nationalId) {
      existing = await this.prisma.legalContractParty.findFirst({ where: { nationalId } });
    }

    const partyData: any = {
      kind: 'COMPANY' as any,
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
}
