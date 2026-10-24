import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountDetailType, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { DetailAccountsService } from '../accounting/detail-accounts.service';

const PARTNER_TYPE_TO_DETAIL: Record<string, AccountDetailType> = {
  CLIENT: 'CUSTOMER' as AccountDetailType,
  SUPPLIER: 'SUPPLIER' as AccountDetailType,
  CONTRACTOR: 'CONTRACTOR' as AccountDetailType,
};

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private detailAccounts: DetailAccountsService,
  ) {}

  async findAll(type?: string, search?: string) {
    const q = search?.trim();
    return this.prisma.partner.findMany({
      where: {
        isActive: true,
        ...(type ? { type: type as Prisma.PartnerWhereInput['type'] } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { aliasName: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { nationalId: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { fatherName: { contains: q, mode: 'insensitive' } },
                { shabaNumber: { contains: q, mode: 'insensitive' } },
                { bankAccountNumber: { contains: q, mode: 'insensitive' } },
                { bankCardNumber: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner || !partner.isActive) {
      throw new NotFoundException('Partner not found');
    }
    return partner;
  }

  private async generateCode(): Promise<string> {
    // Only consider codes with our P- prefix, sorted numerically.
    // Old codes (PAR-xxx etc.) are ignored to avoid collisions.
    const last = await this.prisma.partner.findFirst({
      where: { code: { startsWith: 'P-' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let lastNum = 0;
    if (last) {
      const m = last.code.match(/^P-(\d+)$/);
      if (m) lastNum = parseInt(m[1], 10) || 0;
    }

    // Retry if collision (extra safety against race conditions)
    let candidate = `P-${String(lastNum + 1).padStart(5, '0')}`;
    let tries = 0;
    while (tries < 100) {
      const exists = await this.prisma.partner.findFirst({ where: { code: candidate } });
      if (!exists) return candidate;
      tries++;
      lastNum++;
      candidate = `P-${String(lastNum + 1).padStart(5, '0')}`;
    }
    throw new Error('Cannot generate unique partner code');
  }

  async create(dto: CreatePartnerDto) {
    const code = await this.generateCode();
    const partnerType = (dto.type as unknown as Prisma.PartnerUncheckedCreateInput['type']) || 'OTHER';

    // ─── در یک تراکنش: هم Partner، هم حساب تفصیلی ───
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const partner = await tx.partner.create({
        data: {
          code,
          name: dto.name,
          type: partnerType,
          nationalId: dto.nationalId,
          fatherName: dto.fatherName,
          aliasName: dto.aliasName,
          phone: dto.phone,
          email: dto.email,
          postalCode: dto.postalCode,
          address: dto.address,
          jobDescription: dto.jobDescription,
          shabaNumber: dto.shabaNumber,
          bankAccountNumber: dto.bankAccountNumber,
          bankCardNumber: dto.bankCardNumber,
        },
      });

      // اگه نوعش مشتری/تأمین‌کننده/پیمانکاره، خودکار تفضیل بساز
      const detailType = PARTNER_TYPE_TO_DETAIL[partnerType];
      if (detailType) {
        try {
          await this.detailAccounts.ensureDetailAccount(tx as unknown as Parameters<DetailAccountsService['ensureDetailAccount']>[0], {
            detailType,
            entityId: partner.id,
            entityName: partner.name,
          });
        } catch (err) {
          // لاگ کن ولی تراکنش رو fail نکن
          console.error('[PartnersService] Failed to create detail account:', err);
        }
      }

      return partner;
    });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const partner = await tx.partner.update({
        where: { id },
        data: {
          name: dto.name,
          type: dto.type as unknown as Prisma.PartnerUncheckedUpdateInput['type'],
          nationalId: dto.nationalId,
          fatherName: dto.fatherName,
          aliasName: dto.aliasName,
          phone: dto.phone,
          email: dto.email,
          postalCode: dto.postalCode,
          address: dto.address,
          jobDescription: dto.jobDescription,
          shabaNumber: dto.shabaNumber,
          bankAccountNumber: dto.bankAccountNumber,
          bankCardNumber: dto.bankCardNumber,
        },
      });

      // اگه تفضیل قبلاً ساخته شده، اسمش رو هم آپدیت کن
      const existingDetail = await tx.account.findFirst({
        where: { detailId: id } as unknown as Prisma.AccountWhereInput,
      });
      if (existingDetail && dto.name && existingDetail.name !== dto.name) {
        await tx.account.update({
          where: { id: existingDetail.id },
          data: { name: dto.name },
        });
      }

      return partner;
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    await this.findOne(id);
    const force = options?.force === true;

    if (!force) {
      return this.softDeactivate(id);
    }

    // force: بررسی وابستگیها قبل از حذف واقعی
    const refs = await this.countReferences(id);
    const total = Object.values(refs).reduce((s: number, n) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'PARTNER_HAS_REFS',
        message: '\u0634\u062e\u0635 \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647 \u0627\u0633\u062a. \u0627\u0628\u062a\u062f\u0627 \u0622\u0646\u200c\u0647\u0627 \u0631\u0627 \u067e\u0627\u06a9 \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0627\u0632 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f:\n' + details,
        refs,
        total,
      });
    }

    // حذف کامل (بدون ارجاع)
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // حذف تفضیل حساب مرتبط
      await tx.account.deleteMany({ where: { detailId: id } as unknown as Prisma.AccountWhereInput });
      // حذف شخص
      await tx.partner.delete({ where: { id } });
      return { success: true, hardDeleted: true };
    });
  }

  private async softDeactivate(id: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // soft-delete: هم isActive false و هم deletedAt set
      await tx.partner.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      const detailAccount = await tx.account.findFirst({
        where: { detailId: id } as unknown as Prisma.AccountWhereInput,
      });
      if (detailAccount) {
        await tx.account.update({
          where: { id: detailAccount.id },
          data: { isActive: false },
        });
      }
      return { success: true, softDeleted: true };
    });
  }

  async countReferences(id: string) {
    const prisma = this.prisma;
    const [
      projectsAsClient, projectsAsConsultant,
      cheques, journalLines, pettyCashAccounts,
      rfqResponses, purchaseOrders, goodsReceipts, goodsIssues,
      employeeProfile, payrollRecords, attendances, workLogs,
      leaveRequests, advanceRequests, subcontractorStatements,
      projectPartnerShares, capitalAccounts, capitalContributions,
      capitalWithdrawals, purchaseInvoices, supplierPayments,
      salesInvoicesAsPartner, workerStatements,
      equipmentAsOwner, equipmentLogsAsOperator,
    ] = await Promise.all([
      prisma.project.count({ where: { clientId: id } }),
      prisma.project.count({ where: { consultantId: id } }),
      prisma.cheque.count({ where: { partnerId: id } }),
      prisma.journalLine.count({ where: { partnerId: id } }),
      prisma.pettyCashAccount.count({ where: { partnerId: id } }),
      prisma.rFQResponse.count({ where: { supplierId: id } }),
      prisma.purchaseOrder.count({ where: { supplierId: id } }),
      prisma.goodsReceipt.count({ where: { supplierId: id } }),
      prisma.goodsIssue.count({ where: { recipientId: id } }),
      prisma.employeeProfile.count({ where: { partnerId: id } }),
      prisma.payrollRecord.count({ where: { employeeId: id } }),
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.dailyWorkLog.count({ where: { employeeId: id } }),
      prisma.leaveRequest.count({ where: { employeeId: id } }),
      prisma.advanceRequest.count({ where: { employeeId: id } }),
      prisma.subcontractorStatement.count({ where: { contractorId: id } }),
      prisma.projectPartnerShare.count({ where: { partnerId: id } }),
      prisma.partnerCapitalAccount.count({ where: { partnerId: id } }),
      prisma.partnerCapitalContribution.count({ where: { partnerId: id } }),
      prisma.partnerCapitalWithdrawal.count({ where: { partnerId: id } }),
      prisma.purchaseInvoice.count({ where: { supplierId: id } }),
      prisma.supplierPayment.count({ where: { supplierId: id } }),
      prisma.salesInvoice.count({ where: { partnerId: id } }),
      prisma.workerStatement.count({ where: { partnerId: id } }),
      prisma.equipment.count({ where: { ownerId: id } }),
      prisma.equipmentDailyLog.count({ where: { operatorId: id } }),
    ]);

    return {
      projectsAsClient, projectsAsConsultant,
      cheques, journalLines, pettyCashAccounts,
      rfqResponses, purchaseOrders, goodsReceipts, goodsIssues,
      employeeProfile, payrollRecords, attendances, workLogs,
      leaveRequests, advanceRequests, subcontractorStatements,
      projectPartnerShares, capitalAccounts, capitalContributions,
      capitalWithdrawals, purchaseInvoices, supplierPayments,
      salesInvoicesAsPartner, workerStatements,
      equipmentAsOwner, equipmentLogsAsOperator,
    };
  }
}