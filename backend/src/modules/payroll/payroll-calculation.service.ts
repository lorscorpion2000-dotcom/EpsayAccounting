import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class PayrollCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * محاسبه حقوق همه پرسنل فعال برای یک دوره
   */
  async calculatePeriod(periodId: string, _userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: { project: true },
    });
    if (!period) throw new NotFoundException('دوره حقوق یافت نشد');
    if (period.status === 'PAID' || period.status === 'CLOSED') {
      throw new BadRequestException('این دوره قفل شده است');
    }

    // حذف رکوردهای قبلی
    await this.prisma.payrollRecord.deleteMany({ where: { periodId } });

    // دریافت پرسنل فعال
    const employees = await this.prisma.employeeProfile.findMany({
      where: { isActive: true },
      include: { partner: true },
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalInsurance = 0;
    let totalAdvances = 0;

    let rowNumber = 0;

    for (const emp of employees) {
      rowNumber++;
      const calc = await this.calculateEmployee(emp as any, period.startDate, period.endDate);

      await this.prisma.payrollRecord.create({
        data: {
          periodId,
          employeeId: emp.partnerId,
          employeeProfileId: emp.id,
          rowNumber,
          workDays: calc.workDays,
          overtimeHours: calc.overtimeHours,
          holidayHours: calc.holidayHours,
          absentDays: calc.absentDays,
          leaveDays: calc.leaveDays,
          baseSalary: calc.baseSalary,
          housingAllow: calc.housingAllow,
          foodAllow: calc.foodAllow,
          childAllow: calc.childAllow,
          otherAllow: calc.otherAllow,
          overtimeAmount: calc.overtimeAmount,
          holidayAmount: calc.holidayAmount,
          bonusAmount: calc.bonusAmount,
          grossSalary: calc.grossSalary,
          insurancePercent: 7,
          insuranceAmount: calc.insuranceAmount,
          taxPercent: calc.taxPercent,
          taxAmount: calc.taxAmount,
          advanceAmount: calc.advanceAmount,
          absentDeduction: calc.absentDeduction,
          otherDeduction: calc.otherDeduction,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
        },
      });

      totalGross += calc.grossSalary;
      totalNet += calc.netSalary;
      totalTax += calc.taxAmount;
      totalInsurance += calc.insuranceAmount;
      totalAdvances += calc.advanceAmount;
    }

    // به‌روزرسانی دوره
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: 'CALCULATED',
        calculatedAt: new Date(),
        totalGross,
        totalNet,
        totalTax,
        totalInsurance,
        totalAdvances,
      },
    });
  }

  /**
   * محاسبه حقوق یک پرسنل
   */
  private async calculateEmployee(emp: any, startDate: Date, endDate: Date) {
    // دریافت کارکرد
    const workLogs = await this.prisma.dailyWorkLog.findMany({
      where: {
        employeeId: emp.partnerId,
        workDate: { gte: startDate, lte: endDate },
      },
    });

    // دریافت مساعده‌های پرداخت‌نشده
    const advances = await this.prisma.advanceRequest.aggregate({
      where: {
        employeeId: emp.partnerId,
        status: { in: ['APPROVED', 'PAID'] },
        settledAt: null,
      },
      _sum: { amount: true },
    });

    // محاسبه کارکرد
    let regularHours = 0;
    let overtimeHours = 0;
    let holidayHours = 0;
    let daysWorked = 0;

    workLogs.forEach((log) => {
      regularHours += Number(log.regularHours);
      overtimeHours += Number(log.overtimeHours);
      holidayHours += Number(log.holidayHours);
      if (log.status === 'PRESENT') daysWorked++;
    });

    // مبالغ ثابت
    const baseSalary = Number(emp.baseSalary);
    const housingAllow = Number(emp.housingAllow);
    const foodAllow = Number(emp.foodAllow);
    const childAllow = Number(emp.childAllow);
    const otherAllow = Number(emp.otherAllow);

    // نرخ ساعتی از حقوق پایه (ماهانه 220 ساعت کاری)
    const hourlyRate = baseSalary / 220;
    const overtimeRate = hourlyRate * 1.4; // اضافه‌کار ۱.۴ برابر
    const holidayRate = hourlyRate * 2; // تعطیلات ۲ برابر

    const overtimeAmount = overtimeHours * overtimeRate;
    const holidayAmount = holidayHours * holidayRate;

    // جمع کل دریافتی
    const grossSalary =
      baseSalary +
      housingAllow +
      foodAllow +
      childAllow +
      otherAllow +
      overtimeAmount +
      holidayAmount;

    // کسورات
    const insuranceAmount = (grossSalary * 7) / 100;

    // مالیات (ساده - ۱۰٪ از مبلغ مشمول مالیات)
    // مشمول مالیات: حقوق پایه + مزایا - بیمه - معافیت
    const taxExempt = 100000000; // ۱۰ میلیون تومان معافیت
    const taxableBase = Math.max(0, grossSalary - taxExempt);
    const taxPercent = 10;
    const taxAmount = (taxableBase * taxPercent) / 100;

    const advanceAmount = Number(advances._sum.amount || 0);
    const absentDeduction = 0;
    const otherDeduction = 0;

    const totalDeductions = insuranceAmount + taxAmount + advanceAmount + absentDeduction + otherDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      workDays: daysWorked,
      overtimeHours,
      holidayHours,
      absentDays: 0,
      leaveDays: 0,
      baseSalary,
      housingAllow,
      foodAllow,
      childAllow,
      otherAllow,
      overtimeAmount,
      holidayAmount,
      bonusAmount: 0,
      grossSalary,
      insuranceAmount,
      taxPercent,
      taxAmount,
      advanceAmount,
      absentDeduction,
      otherDeduction,
      totalDeductions,
      netSalary,
    };
  }

  /**
   * بازمحاسبه یک رکورد (ویرایش دستی)
   */
  async recalculateRecord(recordId: string) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: { period: true },
    });
    if (!record) throw new NotFoundException('رکورد حقوق یافت نشد');
    if (record.period.status === 'PAID' || record.period.status === 'CLOSED') {
      throw new BadRequestException('این دوره قفل شده است');
    }

    const totals = this.computeTotals(record);
    return this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        grossSalary: totals.gross,
        totalDeductions: totals.totalDeductions,
        netSalary: totals.net,
      },
    });
  }

  private computeTotals(record: any) {
    const gross =
      Number(record.baseSalary) +
      Number(record.housingAllow) +
      Number(record.foodAllow) +
      Number(record.childAllow) +
      Number(record.otherAllow) +
      Number(record.overtimeAmount) +
      Number(record.holidayAmount) +
      Number(record.bonusAmount);

    const totalDeductions =
      Number(record.insuranceAmount) +
      Number(record.taxAmount) +
      Number(record.advanceAmount) +
      Number(record.absentDeduction) +
      Number(record.otherDeduction);

    return { gross, totalDeductions, net: gross - totalDeductions };
  }

  // ═══════════════════════════════════════════════════════════
  // محاسبه حقوق بر اساس Attendance (حاضری گرید ماهانه)
  // ═══════════════════════════════════════════════════════════
  async calculateFromAttendance(periodId: string, _userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('دوره حقوق یافت نشد');
    if (period.status === 'PAID' || period.status === 'CLOSED') {
      throw new BadRequestException('این دوره قفل شده است');
    }

    // حذف رکوردهای قبلی
    await this.prisma.payrollRecord.deleteMany({ where: { periodId } });

    // پرسنل فعال (فیلتر بر اساس پروژه دوره اگر مشخص باشد)
    const where: any = { isActive: true };
    if (period.projectId) where.projectId = period.projectId;

    const employees = await this.prisma.employeeProfile.findMany({
      where,
      include: { partner: true },
      orderBy: { employeeCode: 'asc' },
    });

    // جدول مالیات فعال
    let taxSetting: any = null;
    try {
      taxSetting = await this.prisma.payrollTaxSetting.findFirst({
        where: { isActive: true },
        include: { brackets: { orderBy: { order: 'asc' } } },
        orderBy: { year: 'desc' },
      });
    } catch { /* ignore */ }

    const totalCalendarDays =
      Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalInsurance = 0;
    let totalAdvances = 0;
    let rowNumber = 0;

    for (const emp of employees) {
      // حاضری در بازه دوره
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: emp.partnerId,
          attendanceDate: { gte: period.startDate, lte: period.endDate },
          deletedAt: null,
        } as any,
      });

      // خلاصه وضعیت‌ها
      let presentDays = 0, absentDays = 0, leaveDays = 0, sickDays = 0, missionDays = 0, holidayDays = 0;
      let totalRegularHours = 0, totalOvertimeHours = 0, totalHolidayHours = 0;

      for (const a of attendances) {
        switch (a.status) {
          case 'PRESENT': presentDays++; break;
          case 'ABSENT': absentDays++; break;
          case 'LEAVE': leaveDays++; break;
          case 'SICK': sickDays++; break;
          case 'MISSION': missionDays++; break;
          case 'HOLIDAY': holidayDays++; break;
        }
        totalRegularHours += Number(a.workHours) || 0;
        totalOvertimeHours += Number(a.overtimeHours) || 0;
        if (a.status === 'HOLIDAY') totalHolidayHours += Number(a.workHours) || 0;
      }

      // اگر حاضری ثبت نشده → فرض کل ماه کار کرده
      const hasAttendance = attendances.length > 0;
      const effectivePresentDays = hasAttendance
        ? presentDays
        : totalCalendarDays;
      const effectiveWorkDays = hasAttendance
        ? (presentDays + leaveDays + sickDays + missionDays + holidayDays)
        : totalCalendarDays;

      const baseSalaryEmp = Number(emp.baseSalary) || 0;
      const housingEmp = Number(emp.housingAllow) || 0;
      const foodEmp = Number(emp.foodAllow) || 0;
      const childEmp = Number(emp.childAllow) || 0;
      const otherEmp = Number(emp.otherAllow) || 0;
      const dailyWageEmp = Number(emp.dailyWage) || 0;
      const hourlyWageEmp = Number(emp.hourlyWage) || 0;

      const ratio = totalCalendarDays > 0 ? effectiveWorkDays / totalCalendarDays : 1;
      const hourlyRateFromMonthly = baseSalaryEmp / 220;

      let baseSalary = 0, housingAllow = 0, foodAllow = 0, childAllow = 0, otherAllow = 0;
      let overtimeAmount = 0, holidayAmount = 0;

      const empType = String(emp.employeeType || 'FULL_TIME').toUpperCase();

      if (empType === 'CONTRACTOR') {
        // پیمانکار مستقل — خارج از حقوق
        continue;
      } else if (empType === 'HOURLY') {
        baseSalary = hourlyWageEmp * totalRegularHours;
        overtimeAmount = hourlyWageEmp * 1.4 * totalOvertimeHours;
      } else if (empType === 'DAILY_WAGE') {
        baseSalary = dailyWageEmp * effectivePresentDays;
        overtimeAmount = (dailyWageEmp / 8) * 1.4 * totalOvertimeHours;
      } else {
        // FULL_TIME / PART_TIME
        baseSalary = baseSalaryEmp * ratio;
        housingAllow = housingEmp * ratio;
        foodAllow = foodEmp * ratio;
        childAllow = childEmp; // ثابت طبق قانون کار
        otherAllow = otherEmp * ratio;
        overtimeAmount = hourlyRateFromMonthly * 1.4 * totalOvertimeHours;
        holidayAmount = hourlyRateFromMonthly * 2 * totalHolidayHours;
      }

      const grossSalary =
        baseSalary + housingAllow + foodAllow + childAllow + otherAllow + overtimeAmount + holidayAmount;

      // بیمه ۷٪ سهم کارگر
      const insuranceAmount = (grossSalary * 7) / 100;

      // مالیات طبق جدول
      let taxAmount = 0;
      let taxPercent = 0;
      if (taxSetting && Array.isArray(taxSetting.brackets) && taxSetting.brackets.length > 0) {
        const monthlyExempt = Number(taxSetting.monthlyExemption) || 0;
        let remaining = Math.max(0, grossSalary - monthlyExempt);
        for (const br of taxSetting.brackets) {
          if (remaining <= 0) break;
          const from = Number(br.fromAmount) || 0;
          const to = br.toAmount != null ? Number(br.toAmount) : Infinity;
          const span = Math.max(0, to - from);
          const portion = Math.min(remaining, span);
          if (portion > 0) {
            taxAmount += portion * (Number(br.ratePercent) || 0) / 100;
            remaining -= portion;
          }
        }
        taxPercent = grossSalary > 0 ? Math.round((taxAmount / grossSalary) * 10000) / 100 : 0;
      }

      // مساعده‌های پرداخت‌نشده
      const advances = await this.prisma.advanceRequest.aggregate({
        where: {
          employeeId: emp.partnerId,
          status: { in: ['APPROVED', 'PAID'] },
          settledAt: null,
        },
        _sum: { amount: true },
      });
      const advanceAmount = Number(advances._sum.amount) || 0;

      const totalDeductions = insuranceAmount + taxAmount + advanceAmount;
      const netSalary = grossSalary - totalDeductions;

      rowNumber++;

      await this.prisma.payrollRecord.create({
        data: {
          periodId,
          employeeId: emp.partnerId,
          employeeProfileId: emp.id,
          rowNumber,
          workDays: effectivePresentDays,
          overtimeHours: totalOvertimeHours,
          holidayHours: totalHolidayHours,
          absentDays,
          leaveDays: leaveDays + sickDays + missionDays,
          baseSalary,
          housingAllow,
          foodAllow,
          childAllow,
          otherAllow,
          overtimeAmount,
          holidayAmount,
          bonusAmount: 0,
          grossSalary,
          insurancePercent: 7,
          insuranceAmount,
          taxPercent,
          taxAmount,
          advanceAmount,
          absentDeduction: 0,
          otherDeduction: 0,
          totalDeductions,
          netSalary,
        },
      });

      totalGross += grossSalary;
      totalNet += netSalary;
      totalTax += taxAmount;
      totalInsurance += insuranceAmount;
      totalAdvances += advanceAmount;
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: 'CALCULATED',
        calculatedAt: new Date(),
        totalGross,
        totalNet,
        totalTax,
        totalInsurance,
        totalAdvances,
      },
    });
  }

}
