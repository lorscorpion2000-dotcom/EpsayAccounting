import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

interface EmployeeCalcData {
  id: string;
  baseSalary: number;
  housingAllow: number;
  foodAllow: number;
  childAllow: number;
  otherAllow: number;
  dailyWage: number;
  hourlyWage: number;
  employeeType: string;
}

@Injectable()
export class PayrollCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * محاسبه حقوق همه پرسنل فعال برای یک دوره
   */
  async calculatePeriod(periodId: string, userId: string) {
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
}
