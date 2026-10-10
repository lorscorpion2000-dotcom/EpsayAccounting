import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountDetailType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DetailAccountsService } from '../accounting/detail-accounts.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private detailAccounts: DetailAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.employeeProfile.count();
    return 'EMP-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { active?: boolean; type?: string; search?: string; department?: string }) {
    const where: any = {};
    if (query?.active !== undefined) where.isActive = query.active;
    if (query?.type) where.employeeType = query.type;
    if (query?.department) where.department = query.department;
    if (query?.search) {
      where.OR = [
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { position: { contains: query.search, mode: 'insensitive' } },
        { partner: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.employeeProfile.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true, phone: true, nationalId: true } },
        _count: { select: { payrollRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id },
      include: {
        partner: true,
        payrollRecords: {
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: { period: { select: { id: true, code: true, title: true } } },
        },
      },
    });
    if (!emp) throw new NotFoundException('پرسنل یافت نشد');
    return emp;
  }

  async create(dto: CreateEmployeeDto) {
    // بررسی وجود Partner
    const partner = await this.prisma.partner.findUnique({ where: { id: dto.partnerId } });
    if (!partner) throw new NotFoundException('شخص یافت نشد');

    // بررسی عدم وجود پرسنل برای این Partner
    const existing = await this.prisma.employeeProfile.findUnique({
      where: { partnerId: dto.partnerId },
    });
    if (existing) throw new BadRequestException('این شخص قبلاً به عنوان پرسنل ثبت شده است');

    const code = await this.generateCode();
    const created = await this.prisma.employeeProfile.create({
      data: {
        partnerId: dto.partnerId,
        employeeCode: code,
        employeeType: dto.employeeType as any,
        position: dto.position,
        department: dto.department,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        baseSalary: dto.baseSalary ?? 0,
        housingAllow: dto.housingAllow ?? 0,
        foodAllow: dto.foodAllow ?? 0,
        childAllow: dto.childAllow ?? 0,
        otherAllow: dto.otherAllow ?? 0,
        dailyWage: dto.dailyWage,
        hourlyWage: dto.hourlyWage,
        bankAccount: dto.bankAccount,
        bankIban: dto.bankIban,
        bankName: dto.bankName,
        insuranceNumber: dto.insuranceNumber,
        insuranceStart: dto.insuranceStart ? new Date(dto.insuranceStart) : null,
        hasInsurance: dto.hasInsurance ?? false,
        maritalStatus: (dto.maritalStatus as any) || 'SINGLE',
        childrenCount: dto.childrenCount ?? 0,
        nationalId: dto.nationalId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        birthPlace: dto.birthPlace,
        education: dto.education,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
      include: { partner: true },
    });

    // ─── تفضیل خودکار پرسنل زیر معین 2.1.2 ───
    try {
      await this.detailAccounts.ensureDetailAccount(this.prisma, {
        detailType: AccountDetailType.EMPLOYEE,
        entityId: dto.partnerId,
        entityName: partner.name,
      });
    } catch (err) {
      console.error('[Employees] Failed to create detail account:', err);
    }

    // Sync partner fields on create
    const partnerUpdate: any = {};
    if (dto.fatherName !== undefined) partnerUpdate.fatherName = dto.fatherName;
    if (dto.postalCode !== undefined) partnerUpdate.postalCode = dto.postalCode;
    if (dto.phone !== undefined) partnerUpdate.phone = dto.phone;
    if (dto.address !== undefined) partnerUpdate.address = dto.address;
    if (dto.nationalId !== undefined) partnerUpdate.nationalId = dto.nationalId;

    if (Object.keys(partnerUpdate).length > 0) {
      await this.prisma.partner.update({
        where: { id: dto.partnerId },
        data: partnerUpdate,
      });
    }
    // Auto-sync related contract parties
    try {
      await this.syncRelatedParties(created.id);
    } catch (e) {
      // silent fail — sync should not break create
    }

    return created;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);

    // 1) Build employeeProfile data
    const data: any = {};
    if (dto.projectId !== undefined) {
      data.projectId = (dto.projectId && String(dto.projectId).trim()) ? dto.projectId : null;
    }
    if (dto.employeeType !== undefined) data.employeeType = dto.employeeType;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.hireDate !== undefined) data.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    if (dto.baseSalary !== undefined) data.baseSalary = dto.baseSalary;
    if (dto.housingAllow !== undefined) data.housingAllow = dto.housingAllow;
    if (dto.foodAllow !== undefined) data.foodAllow = dto.foodAllow;
    if (dto.childAllow !== undefined) data.childAllow = dto.childAllow;
    if (dto.otherAllow !== undefined) data.otherAllow = dto.otherAllow;
    if (dto.dailyWage !== undefined) data.dailyWage = dto.dailyWage;
    if (dto.hourlyWage !== undefined) data.hourlyWage = dto.hourlyWage;
    if (dto.bankAccount !== undefined) data.bankAccount = dto.bankAccount;
    if (dto.bankIban !== undefined) data.bankIban = dto.bankIban;
    if (dto.bankName !== undefined) data.bankName = dto.bankName;
    if (dto.insuranceNumber !== undefined) data.insuranceNumber = dto.insuranceNumber;
    if (dto.insuranceStart !== undefined) data.insuranceStart = dto.insuranceStart ? new Date(dto.insuranceStart) : null;
    if (dto.hasInsurance !== undefined) data.hasInsurance = dto.hasInsurance;
    if (dto.maritalStatus !== undefined) data.maritalStatus = dto.maritalStatus;
    if (dto.childrenCount !== undefined) data.childrenCount = dto.childrenCount;
    if (dto.nationalId !== undefined) data.nationalId = dto.nationalId;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.birthPlace !== undefined) data.birthPlace = dto.birthPlace;
    if (dto.education !== undefined) data.education = dto.education;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // 2) Update employeeProfile
    await this.prisma.employeeProfile.update({
      where: { id },
      data,
      include: { partner: true },
    });

    // 3) Update partner if needed
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id },
      select: { partnerId: true },
    });

    if (emp) {
      const partnerUpdate: any = {};
      if (dto.fatherName !== undefined) partnerUpdate.fatherName = dto.fatherName;
      if (dto.postalCode !== undefined) partnerUpdate.postalCode = dto.postalCode;
      if (dto.phone !== undefined) partnerUpdate.phone = dto.phone;
      if (dto.address !== undefined) partnerUpdate.address = dto.address;
      if (dto.nationalId !== undefined) partnerUpdate.nationalId = dto.nationalId;

      if (Object.keys(partnerUpdate).length > 0) {
        await this.prisma.partner.update({
          where: { id: emp.partnerId },
          data: partnerUpdate,
        });
      }
    }

    // 4) Sync employee detail account name
    try {
      const fullProfile = await this.prisma.employeeProfile.findUnique({
        where: { id },
        include: { partner: true },
      });
      if (fullProfile?.partner) {
        await this.detailAccounts.ensureDetailAccount(this.prisma, {
          detailType: AccountDetailType.EMPLOYEE,
          entityId: fullProfile.partnerId,
          entityName: fullProfile.partner.name,
        });
      }
    } catch (err) {
      console.error('[Employees] Failed to sync detail account:', err);
    }

    // 5) Auto-sync related contract parties
    try {
      const syncResult = await this.syncRelatedParties(id);
      console.log('[syncRelatedParties] result: ' + JSON.stringify(syncResult));
    } catch (e: any) {
      console.error('[syncRelatedParties] error:', e?.message || e);
    }

    // 6) Return fresh record
    return this.prisma.employeeProfile.findUnique({
      where: { id },
      include: { partner: true },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    const emp = await this.findOne(id);
    const force = options?.force === true;

    if (!force) {
      const records = await this.prisma.payrollRecord.count({ where: { employeeProfileId: id } });
      if (records > 0) {
        throw new BadRequestException('این پرسنل دارای سابقه حقوق است — از حالت مدیر برای حذف کامل استفاده کنید');
      }
      // soft: غیرفعال
      await this.prisma.employeeProfile.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, softDeleted: true };
    }

    // force (admin) — چک ارجاعها
    const refs = await this.countEmployeeRefs(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'EMPLOYEE_HAS_REFS',
        message: 'پرسنل در ' + total + ' مورد دیگر استفاده شده است:\n' + details + '\n\nبرای حذف همه از دکمه تأیید دوم استفاده کنید.',
        refs, total,
      });
    }

    await this.prisma.employeeProfile.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  private async countEmployeeRefs(id: string) {
    const p = this.prisma;
    const [payrollRecords, attendances, workLogs, leaveRequests, advanceRequests, statements] = await Promise.all([
      p.payrollRecord.count({ where: { employeeProfileId: id } }),
      (p as any).attendance.count({ where: { employeeProfileId: id } }).catch(() => 0),
      (p as any).dailyWorkLog.count({ where: { employeeProfileId: id } }).catch(() => 0),
      (p as any).leaveRequest.count({ where: { employeeProfileId: id } }).catch(() => 0),
      (p as any).advanceRequest.count({ where: { employeeProfileId: id } }).catch(() => 0),
      (p as any).workerStatement?.count({ where: { employeeId: id } }).catch(() => 0) || Promise.resolve(0),
    ]);
    return { payrollRecords, attendances, workLogs, leaveRequests, advanceRequests, statements };
  }

  async stats() {
    const [total, active, byType] = await Promise.all([
      this.prisma.employeeProfile.count(),
      this.prisma.employeeProfile.count({ where: { isActive: true } }),
      this.prisma.employeeProfile.groupBy({
        by: ['employeeType'],
        _count: true,
      }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      byType: byType.reduce((acc, item) => {
        acc[item.employeeType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }


  /**
   * Syncs all LegalContractParty records that match this employee.
   * Matches by nationalId (preferred) or by exact fullName.
   */
  async syncRelatedParties(employeeId: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { partner: true },
    });
    if (!emp) return { synced: 0 };

    const partner = emp.partner;
    const nationalId = emp.nationalId || partner.nationalId || null;

    if (!nationalId) return { synced: 0 };

    // Only update parties that ALREADY have this nationalId.
    // Never assign a nationalId to a party that has NULL — that's a different person.
    const parties = await this.prisma.legalContractParty.findMany({
      where: { nationalId },
    });

    if (parties.length === 0) return { synced: 0 };

    const updateData = {
      fullName: partner.name,
      fatherName: partner.fatherName || null,
      postalCode: partner.postalCode || null,
      mobilePhone: partner.phone || null,
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
      // Note: nationalId is NOT updated — it's the matching key and is already correct
    };

    let synced = 0;
    for (const p of parties) {
      try {
        await this.prisma.legalContractParty.update({
          where: { id: p.id },
          data: updateData,
        });
        synced++;
      } catch (e) {
        // ignore individual failures
      }
    }

    return { synced };
  }
}
