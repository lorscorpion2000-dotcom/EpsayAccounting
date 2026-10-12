import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { endOfLocalDay } from '../../common/utils/date.util';
import { toLocalDateString } from '../../common/utils/date.util';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

@Injectable()
export class EmployeeCardService {
  constructor(private prisma: PrismaService) {}

  /**
   * کارت پرسنل — اطلاعات کامل + آمار کلی
   */
  async getCard(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('پرسنل یافت نشد');

    // آمار حضور
    const [attendanceCount, workLogsCount, leaveCount, advanceCount] = await Promise.all([
      this.prisma.attendance.count({ where: { employeeId } }),
      this.prisma.dailyWorkLog.count({ where: { employeeId } }),
      this.prisma.leaveRequest.count({ where: { employeeId, status: 'APPROVED' } }),
      this.prisma.advanceRequest.count({ where: { employeeId, status: { in: ['APPROVED', 'PAID'] } } }),
    ]);

    // جمع مساعده
    const advancesAgg = await this.prisma.advanceRequest.aggregate({
      where: { employeeId, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { amount: true },
    });

    // آخرین دوره حقوق
    const lastPayroll = await this.prisma.payrollRecord.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        period: { select: { id: true, code: true, title: true, year: true, month: true } },
      },
    });

    return {
      employee,
      stats: {
        attendanceCount,
        workLogsCount,
        leaveCount,
        advanceCount,
        totalAdvances: Number(advancesAgg._sum.amount || 0),
      },
      lastPayroll: lastPayroll || null,
    };
  }

  /**
   * ریز کارکرد ماهانه — روز به روز
   */
  async getMonthlyWork(employeeId: string, year: number, month: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('پرسنل یافت نشد');

    // بازه ماه
    const startDate = this.getMonthStart(year, month);
    const endDate = this.getMonthEnd(year, month);

    // attendance روزانه
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      orderBy: { attendanceDate: 'asc' },
    });

    // work logs
    const workLogs = await this.prisma.dailyWorkLog.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
      orderBy: { workDate: 'asc' },
    });

    // leave requests
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    // ساخت تقویم ماه
    const days: any[] = [];
    const totalDaysInMonth = this.getDaysInMonth(year, month);

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = this.getShamsiDate(year, month, d);
      const dow = this.getDayOfWeek(date);
      const isHoliday = dow === 5; // جمعه

      const att = attendances.find((a) => this.isSameDay(a.attendanceDate, date));
      const wl = workLogs.find((w) => this.isSameDay(w.workDate, date));
      const leave = leaves.find((l) => date >= l.startDate && date <= l.endDate);

      days.push({
        day: d,
        date: toLocalDateString(date),
        dayOfWeek: dow,
        dayOfWeekName: this.getDayOfWeekName(dow),
        isHoliday,
        status: leave ? 'LEAVE' : att?.status || (isHoliday ? 'HOLIDAY' : 'ABSENT'),
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        workHours: wl ? Number(wl.regularHours) : (att ? Number(att.workHours) : 0),
        overtimeHours: wl ? Number(wl.overtimeHours) : (att ? Number(att.overtimeHours) : 0),
        holidayHours: wl ? Number(wl.holidayHours) : 0,
        notes: att?.notes || wl?.description || null,
        wbsItemId: wl?.wbsItemId || null,
        projectId: wl?.projectId || null,
        leaveType: leave?.leaveType || null,
      });
    }

    // جمع‌ها
    const totalWorkHours = days.reduce((s, d) => s + d.workHours, 0);
    const totalOvertime = days.reduce((s, d) => s + d.overtimeHours, 0);
    const totalHoliday = days.reduce((s, d) => s + d.holidayHours, 0);
    const presentDays = days.filter((d) => d.status === 'PRESENT').length;
    const absentDays = days.filter((d) => d.status === 'ABSENT' && !d.isHoliday).length;
    const leaveDays = days.filter((d) => d.status === 'LEAVE').length;
    const holidayDays = days.filter((d) => d.isHoliday).length;

    return {
      employee,
      period: {
        year,
        month,
        monthName: PERSIAN_MONTHS[month - 1] || month,
        startDate: toLocalDateString(startDate),
        endDate: toLocalDateString(endDate),
      },
      days,
      totals: {
        totalWorkHours,
        totalOvertime,
        totalHoliday,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        totalDays: totalDaysInMonth,
      },
    };
  }

  // ═══ Helper methods ═══
  private getMonthStart(year: number, month: number): Date {
    // month: 1=فروردین
    const gregorianYear = year + 621;
    // تخمین ساده: فروردین = مارس 21
    const monthOffsets = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];
    const daysOffset = monthOffsets[month - 1] || 0;
    const start = new Date(gregorianYear, 2, 21);
    start.setDate(start.getDate() + daysOffset);
    return start;
  }

  private getMonthEnd(year: number, month: number): Date {
    const start = this.getMonthStart(year, month);
    const days = this.getDaysInMonth(year, month);
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return endOfLocalDay(end);
  }

  private getDaysInMonth(_year: number, month: number): number {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    // اسفند — ساده: 29 یا 30
    return 29;
  }

  private getShamsiDate(year: number, month: number, day: number): Date {
    const start = this.getMonthStart(year, month);
    const d = new Date(start);
    d.setDate(d.getDate() + day - 1);
    return d;
  }

  private getDayOfWeek(date: Date): number {
    return date.getDay();
  }

  private getDayOfWeekName(dow: number): string {
    const names = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    return names[dow] || '';
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }
}
