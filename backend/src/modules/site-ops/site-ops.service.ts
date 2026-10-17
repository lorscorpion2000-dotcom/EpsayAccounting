import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-report.dto';
import { UpdateDailyReportDto } from './dto/create-report.dto';
import { DailyReportSectionsService } from './daily-report-sections.service';
import { generateCode, withUniqueRetry } from '../../shared/utils/code-generator';
import * as jalaali from 'jalaali-js';

@Injectable()
export class SiteOpsService {
  constructor(
    private prisma: PrismaService,
    private sections: DailyReportSectionsService,
  ) {}

  private async generateCode(projectId: string): Promise<string> {
    void projectId; // codes are globally unique, not per-project
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'dailyReport', 'code', 'DR-' + year + '-', { pad: 4 });
  }

  async findAll(query?: { projectId?: string; status?: string; fromDate?: string; toDate?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.reportDate = {};
      if (query.fromDate) where.reportDate.gte = new Date(query.fromDate);
      if (query.toDate) where.reportDate.lte = new Date(query.toDate);
    }
    return this.prisma.dailyReport.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { workers: true, equipments: true, materials: true, progresses: true, requests: true, events: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        workers: { orderBy: { rowNumber: 'asc' } },
        equipments: { orderBy: { rowNumber: 'asc' } },
        materials: { orderBy: { rowNumber: 'asc' } },
        progresses: { orderBy: { rowNumber: 'asc' } },
        requests: { orderBy: { rowNumber: 'asc' } },
        events: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!r) throw new NotFoundException('گزارش روزانه یافت نشد');
    return r;
  }

  // ─── Helper: create nested rows ───
  /** تبدیل رشته خالی به null برای UUIDهای اختیاری */
  /** تبدیل رشته زمان خالی به null */
  private optTime(v: any): string | null {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v).trim();
    if (!s) return null;
    // نرمال‌سازی به HH:MM
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return String(Number(m[1])).padStart(2, '0') + ':' + String(Number(m[2])).padStart(2, '0');
    return null;
  }

  private optUuid(v: any): string | null {
    if (v === undefined || v === null || v === '' || v === 'null') return null;
    return String(v);
  }

  /** پاکسازی همه فیلدهای Id از '' به null در یک آبجکت */

  private buildWorkers(items: any[]) {
    return items.map((w, i) => {
      const kind = String(w.kind || 'OWN').toUpperCase() === 'CONTRACTOR' ? 'CONTRACTOR' : 'OWN';
      const isContractor = kind === 'CONTRACTOR';
      return {
        rowNumber: i + 1,
        teamName: w.teamName,
        kind,
        foreman: w.foreman,
        employeeId: isContractor ? null : this.optUuid(w.employeeId),
        contractorId: isContractor ? this.optUuid(w.contractorId) : null,
        contractorRate: isContractor && w.contractorRate != null ? Number(w.contractorRate) : null,
        workerCount: w.workerCount,
        workHours: w.workHours ?? 8,
        overtime: w.overtime ?? 0,
        status: (w.status as any) || 'PRESENT',
        wbsItemId: this.optUuid(w.wbsItemId),
        description: w.description,
      };
    });
  }
  private buildEquipments(items: any[]) {
    return items.map((e, i) => ({
      rowNumber: i + 1, equipmentId: this.optUuid(e.equipmentId), name: e.name, plateNumber: e.plateNumber, operator: e.operator,
      hoursWorked: e.hoursWorked ?? 0, status: (e.status as any) || 'ACTIVE',
      wbsItemId: this.optUuid(e.wbsItemId), fuelLiters: e.fuelLiters ?? 0, stopReason: e.stopReason,
      description: e.description,
    }));
  }
  private buildMaterials(items: any[], unitMap?: Map<string, string>) {
    return items.map((m, i) => ({
      rowNumber: i + 1, itemName: m.itemName, unit: m.unit,
      unitId: m.unit && unitMap ? (unitMap.get(m.unit) ?? null) : null,
      quantity: m.quantity,
      itemId: this.optUuid(m.itemId), warehouseId: this.optUuid(m.warehouseId),
      supplier: m.supplier, vehiclePlate: m.vehiclePlate, billNumber: m.billNumber,
      movementType: m.movementType, qcResult: m.qcResult,
      exitType: m.exitType, exitDest: m.exitDest, description: m.description,
    }));
  }
  private buildProgresses(items: any[], unitMap?: Map<string, string>) {
    return items.map((p, i) => ({
      rowNumber: i + 1, wbsItemId: this.optUuid(p.wbsItemId), description: p.description,
      progressPct: p.progressPct, quantity: p.quantity, unit: p.unit,
      unitId: p.unit && unitMap ? (unitMap.get(p.unit) ?? null) : null,
      location: p.location, notes: p.notes,
    }));
  }
  private buildRequests(items: any[], unitMap?: Map<string, string>) {
    return items.map((r, i) => ({
      rowNumber: i + 1, requestType: r.requestType, title: r.title, description: r.description,
      quantity: r.quantity, unit: r.unit,
      unitId: r.unit && unitMap ? (unitMap.get(r.unit) ?? null) : null,
      priority: r.priority,
      requiredDate: r.requiredDate ? new Date(r.requiredDate) : null,
      wbsItemId: this.optUuid(r.wbsItemId), amount: r.amount, status: 'PENDING',
      pettyCashAccountId: this.optUuid(r.pettyCashAccountId),
    }));
  }
  private buildEvents(items: any[]) {
    return items.map((e, i) => ({
      rowNumber: i + 1, eventType: e.eventType, title: e.title, description: e.description,
      startTime: this.optTime(e.startTime), endTime: this.optTime(e.endTime), durationHrs: e.durationHrs,
      severity: e.severity, actorName: e.actorName,
    }));
  }


  private async resolveUnitIds(codes: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
    if (unique.length === 0) return new Map();
    const units = await this.prisma.unit.findMany({
      where: { OR: [{ code: { in: unique } }, { name: { in: unique } }, { symbol: { in: unique } }] },
      select: { id: true, code: true, name: true, symbol: true },
    });
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.code && unique.includes(u.code)) map.set(u.code, u.id);
      if (u.name && unique.includes(u.name)) map.set(u.name, u.id);
      if (u.symbol && unique.includes(u.symbol)) map.set(u.symbol, u.id);
    }
    return map;
  }

  private isValidUuid(s: string | null | undefined): boolean {
    if (!s || typeof s !== 'string') return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  }

  async create(dto: CreateDailyReportDto, userId: string) {
    if (!this.isValidUuid(dto.projectId)) {
      throw new BadRequestException('انتخاب پروژه الزامی است');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true },
    });
    if (!project) throw new BadRequestException('پروژه یافت نشد');

    const reportDate = new Date(dto.reportDate);

    // چک تکراری (پروژه + تاریخ) قبل از هر تلاش
    const exists = await this.prisma.dailyReport.findFirst({
      where: { projectId: dto.projectId, reportDate },
    });
    if (exists) throw new BadRequestException('برای این پروژه در این تاریخ گزارش ثبت شده است');

    // داده‌های پایه یک‌بار ساخته می‌شوند
    const baseData: any = {
      projectId: dto.projectId,
      reportDate,
      weather: dto.weather as any,
      tempMin: dto.tempMin,
      tempMax: dto.tempMax,
      startTime: this.optTime(dto.startTime),
      endTime: this.optTime(dto.endTime),
      operations: dto.operations,
      issues: dto.issues,
      incidents: dto.incidents,
      status: 'DRAFT',
      createdById: userId,
    };

    const createUnitMap = await this.resolveUnitIds([
      ...(dto.materials || []).map((m: any) => m.unit),
      ...(dto.progresses || []).map((p: any) => p.unit),
      ...(dto.requests || []).map((r: any) => r.unit),
    ]);
    if (dto.workers?.length) baseData.workers = { create: this.buildWorkers(dto.workers) };
    if (dto.equipments?.length) baseData.equipments = { create: this.buildEquipments(dto.equipments) };
    if (dto.materials?.length) baseData.materials = { create: this.buildMaterials(dto.materials, createUnitMap) };
    if (dto.progresses?.length) baseData.progresses = { create: this.buildProgresses(dto.progresses, createUnitMap) };
    if (dto.requests?.length) baseData.requests = { create: this.buildRequests(dto.requests, createUnitMap) };
    if (dto.events?.length) baseData.events = { create: this.buildEvents(dto.events) };

    // B-race-fix: اگر بین generateCode و create، کاربر دیگری همان کد را بگیرد،
    // با P2002 روبرو می‌شویم. withUniqueRetry کد را دوباره می‌سازد و تلاش می‌کند.
    const created = await withUniqueRetry(async () => {
      const code = await this.generateCode(dto.projectId);
      return this.prisma.dailyReport.create({
        data: { ...baseData, code },
        include: {
          workers: true, equipments: true, materials: true, progresses: true,
          requests: true, events: true,
        },
      });
    }, 5);

    // ساخت ۹ بخش اولیه
    await this.sections.initSections(created.id);

    return created;
  }

  async update(id: string, dto: UpdateDailyReportDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT' && r.status !== 'REJECTED') {
      throw new BadRequestException('فقط گزارش پیش‌نویس یا ردشده قابل ویرایش است');
    }

    const data: any = {};
    if (dto.reportDate) data.reportDate = new Date(dto.reportDate);
    if (dto.weather !== undefined) data.weather = dto.weather;
    if (dto.tempMin !== undefined) data.tempMin = dto.tempMin;
    if (dto.tempMax !== undefined) data.tempMax = dto.tempMax;
    if (dto.startTime !== undefined) data.startTime = this.optTime(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = this.optTime(dto.endTime);
    if (dto.operations !== undefined) data.operations = dto.operations;
    if (dto.issues !== undefined) data.issues = dto.issues;
    if (dto.incidents !== undefined) data.incidents = dto.incidents;

    const updateUnitMap = await this.resolveUnitIds([
      ...(dto.materials || []).map((m: any) => m.unit),
      ...(dto.progresses || []).map((p: any) => p.unit),
      ...(dto.requests || []).map((r: any) => r.unit),
    ]);

    return this.prisma.$transaction(async (tx) => {
      if (dto.workers) {
        await tx.dailyReportWorker.deleteMany({ where: { reportId: id } });
        data.workers = { create: this.buildWorkers(dto.workers) };
      }
      if (dto.equipments) {
        await tx.dailyReportEquipment.deleteMany({ where: { reportId: id } });
        data.equipments = { create: this.buildEquipments(dto.equipments) };
      }
      if (dto.materials) {
        await tx.dailyReportMaterial.deleteMany({ where: { reportId: id } });
        data.materials = { create: this.buildMaterials(dto.materials, updateUnitMap) };
      }
      if (dto.progresses) {
        await tx.dailyReportProgress.deleteMany({ where: { reportId: id } });
        data.progresses = { create: this.buildProgresses(dto.progresses, updateUnitMap) };
      }
      if (dto.requests) {
        await tx.dailyReportRequest.deleteMany({ where: { reportId: id } });
        data.requests = { create: this.buildRequests(dto.requests, updateUnitMap) };
      }
      if (dto.events) {
        await tx.dailyReportEvent.deleteMany({ where: { reportId: id } });
        data.events = { create: this.buildEvents(dto.events) };
      }
      return tx.dailyReport.update({ where: { id }, data });
    });
  }

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT' && r.status !== 'REJECTED') {
      throw new BadRequestException('فقط گزارش پیش‌نویس یا ردشده قابل حذف است');
    }
    await this.prisma.dailyReport.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT' && r.status !== 'REJECTED') {
      throw new BadRequestException('فقط گزارش پیش‌نویس یا ردشده قابل ارسال است');
    }
    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        rejectedReason: null,
        approvedById: null,
        approvedAt: null,
      },
    });
  }
  /**
   * F2 — تأییدکننده ≠ ثبت‌کننده
   * اگر کاربر ثبت‌کننده گزارش باشد اجازه تأیید ندارد، مگر super_admin با ثبت در AuditLog.
   */
  private async assertNotSelfApprove(reportId: string, userId: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id: reportId },
      select: { createdById: true },
    });
    if (!report) throw new NotFoundException('گزارش یافت نشد');
    if (!report.createdById || report.createdById !== userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    const isSuperAdmin = !!user?.roles.some((ur: any) => ur.role.code === 'super_admin');

    if (!isSuperAdmin) {
      throw new ForbiddenException('شما ثبت‌کننده این گزارش هستید و نمی‌توانید آن را تأیید کنید');
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SELF_APPROVE_REPORT',
        entity: 'DailyReport',
        entityId: reportId,
        payload: { override: 'super_admin' } as any,
      },
    });
  }

  async approve(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    await this.assertNotSelfApprove(id, userId);

    // B13: check all sections — همه بخش‌ها باید APPROVED یا FORWARDED باشند
    const sections = await this.prisma.dailyReportSection.findMany({
      where: { reportId: id },
    });
    if (sections.length === 0) {
      throw new BadRequestException('این گزارش هیچ بخشی ندارد — ابتدا گزارش را اصلاح کنید');
    }
    const notApproved = sections.filter(
      (s) => s.status !== 'APPROVED' && s.status !== 'FORWARDED',
    );
    if (notApproved.length > 0) {
      throw new BadRequestException(
        'این گزارش بخش‌های تأییدنشده دارد. ابتدا از پنل بخش‌ها تأیید کنید: ' +
        notApproved.map((s) => s.sectionType).join(', '),
      );
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string, _userId?: string) {
    // B12: unify reject — REJECTED (same as approvals.reject)
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        approvedById: null,
        approvedAt: null,
      },
    });
  }

  // ═══════════════ Section-level approval ═══════════════
  listSections(reportId: string) {
    return this.sections.list(reportId);
  }

  approveSection(reportId: string, sectionType: string, userId: string) {
    return this.sections.approve(reportId, sectionType, userId);
  }

  rejectSection(reportId: string, sectionType: string, reason: string) {
    return this.sections.reject(reportId, sectionType, reason);
  }

  sectionsSummary(reportId: string) {
    return this.sections.summary(reportId);
  }

  /**
   * لیست پیشنهادی پرسنل خودی از گرید ماهانه حضور و غیاب
   * طبق سناریو: پیش‌فرض از گرید ماهانه — امکان افزودن دستی هم هست
   * ورودی: سال/ماه شمسی + فیلتر پروژه اختیاری
   * خروجی: پرسنل با حداقل یک رکورد Attendance در آن ماه
   */
  async suggestedWorkers(year: number, month: number, projectId?: string) {
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('سال و ماه شمسی معتبر وارد کنید');
    }

    // تبدیل شمسی به میلادی
    const { gy, gm, gd } = jalaali.toGregorian(year, month, 1);
    const startGregorian = new Date(Date.UTC(gy, gm - 1, gd));
    const daysInMonth = jalaali.jalaaliMonthLength(year, month);
    const { gy: gy2, gm: gm2, gd: gd2 } = jalaali.toGregorian(year, month, daysInMonth);
    const endGregorian = new Date(Date.UTC(gy2, gm2 - 1, gd2, 23, 59, 59));

    // رکوردهای Attendance در بازه
    const attendances = await this.prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: startGregorian, lte: endGregorian },
        deletedAt: null,
      },
      orderBy: { attendanceDate: 'desc' },
    });

    if (attendances.length === 0) {
      return {
        year, month,
        gregorianStart: startGregorian.toISOString().slice(0, 10),
        gregorianEnd: endGregorian.toISOString().slice(0, 10),
        employees: [],
      };
    }

    // گروه‌بندی بر employeeId (که Partner.id است)
    const byPartner = new Map<string, { days: number; workHours: number; overtimeHours: number; lastDate: Date }>();
    for (const a of attendances) {
      if (!byPartner.has(a.employeeId)) {
        byPartner.set(a.employeeId, { days: 0, workHours: 0, overtimeHours: 0, lastDate: a.attendanceDate });
      }
      const g = byPartner.get(a.employeeId)!;
      g.days += 1;
      g.workHours += Number(a.workHours || 0);
      g.overtimeHours += Number(a.overtimeHours || 0);
      if (a.attendanceDate > g.lastDate) g.lastDate = a.attendanceDate;
    }

    const partnerIds = Array.from(byPartner.keys());

    // EmployeeProfile برای آن اشخاص (فیلتر پروژه اختیاری)
    const profileWhere: any = {
      partnerId: { in: partnerIds },
      isActive: true,
      deletedAt: null,
    };
    if (projectId) profileWhere.projectId = projectId;

    const profiles = await this.prisma.employeeProfile.findMany({
      where: profileWhere,
      include: {
        partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    const employees = profiles
      .map((p) => {
        const agg = byPartner.get(p.partnerId);
        if (!agg) return null;
        return {
          employeeId: p.partnerId,
          partnerId: p.partnerId,
          employeeCode: p.employeeCode,
          name: p.partner?.name || '—',
          position: p.position || null,
          employeeType: p.employeeType,
          department: p.department || null,
          projectId: p.projectId,
          projectName: p.project?.name || null,
          attendanceDays: agg.days,
          totalWorkHours: Math.round(agg.workHours * 100) / 100,
          totalOvertimeHours: Math.round(agg.overtimeHours * 100) / 100,
          lastAttendanceDate: agg.lastDate.toISOString().slice(0, 10),
        };
      })
      .filter(Boolean);

    employees.sort((a: any, b: any) => b.attendanceDays - a.attendanceDays);

    return {
      year,
      month,
      gregorianStart: startGregorian.toISOString().slice(0, 10),
      gregorianEnd: endGregorian.toISOString().slice(0, 10),
      employees,
    };
  }

  async stats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const [total, draft, submitted, approved] = await Promise.all([
      this.prisma.dailyReport.count({ where }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'APPROVED' } }),
    ]);
    return { total, draft, submitted, approved };
  }
}
