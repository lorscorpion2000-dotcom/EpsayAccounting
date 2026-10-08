import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTaxSettingDto, UpdateTaxSettingDto } from './dto/payroll-tax.dto';

@Injectable()
export class PayrollTaxService {
  constructor(private prisma: PrismaService) {}

  // ═══ CRUD تنظیمات ═══
  async list() {
    return this.prisma.payrollTaxSetting.findMany({
      include: { brackets: { orderBy: { order: 'asc' } } },
      orderBy: { year: 'desc' },
    });
  }

  async getByYear(year: number) {
    const s = await this.prisma.payrollTaxSetting.findUnique({
      where: { year },
      include: { brackets: { orderBy: { order: 'asc' } } },
    });
    if (!s) throw new NotFoundException('تنظیمات مالیات این سال یافت نشد');
    return s;
  }

  async getActive() {
    const s = await this.prisma.payrollTaxSetting.findFirst({
      where: { isActive: true },
      include: { brackets: { orderBy: { order: 'asc' } } },
      orderBy: { year: 'desc' },
    });
    if (!s) throw new NotFoundException('هیچ تنظیمات فعالی وجود ندارد');
    return s;
  }

  async create(dto: CreateTaxSettingDto) {
    const exists = await this.prisma.payrollTaxSetting.findUnique({ where: { year: dto.year } });
    if (exists) throw new BadRequestException('برای این سال قبلاً تنظیمات ثبت شده');

    return this.prisma.payrollTaxSetting.create({
      data: {
        year: dto.year,
        title: dto.title || 'جدول مالیات ' + dto.year,
        monthlyExemption: dto.monthlyExemption,
        insuranceEmployeePercent: dto.insuranceEmployeePercent ?? 7,
        insuranceEmployerPercent: dto.insuranceEmployerPercent ?? 23,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        brackets: {
          create: dto.brackets.map((b) => ({
            order: b.order,
            fromAmount: b.fromAmount,
            toAmount: b.toAmount,
            ratePercent: b.ratePercent,
            description: b.description,
          })),
        },
      },
      include: { brackets: { orderBy: { order: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateTaxSettingDto) {
    const existing = await this.prisma.payrollTaxSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تنظیمات یافت نشد');

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.monthlyExemption !== undefined) data.monthlyExemption = dto.monthlyExemption;
      if (dto.insuranceEmployeePercent !== undefined) data.insuranceEmployeePercent = dto.insuranceEmployeePercent;
      if (dto.insuranceEmployerPercent !== undefined) data.insuranceEmployerPercent = dto.insuranceEmployerPercent;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;
      if (dto.notes !== undefined) data.notes = dto.notes;

      if (dto.brackets) {
        await tx.taxBracket.deleteMany({ where: { settingId: id } });
        data.brackets = {
          create: dto.brackets.map((b) => ({
            order: b.order,
            fromAmount: b.fromAmount,
            toAmount: b.toAmount,
            ratePercent: b.ratePercent,
            description: b.description,
          })),
        };
      }

      return tx.payrollTaxSetting.update({
        where: { id },
        data,
        include: { brackets: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.payrollTaxSetting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تنظیمات یافت نشد');
    await this.prisma.payrollTaxSetting.delete({ where: { id } });
    return { success: true };
  }

  // ═══ محاسبه مالیات پله‌ای ═══
  /**
   * محاسبه مالیات بر درآمد حقوق بر اساس جدول پله‌ای
   * @param grossSalary - حقوق ناخالص ماهانه (ریال)
   * @param year - سال (پیش‌فرض: سال فعال)
   */
  async calculateTax(grossSalary: number, year?: number): Promise<{
    grossSalary: number;
    exemption: number;
    taxableAmount: number;
    taxAmount: number;
    details: Array<{ order: number; from: number; to: number | null; rate: number; portion: number; tax: number }>;
  }> {
    const setting = year
      ? await this.getByYear(year)
      : await this.getActive();

    const exemption = Number(setting.monthlyExemption);
    // برای نمایش: بخش مشمول = حقوق منهای معافیت (که در پله ۱ جدول هم آمده)
    const taxableAmount = Math.max(0, grossSalary - exemption);

    if (grossSalary <= 0 || setting.brackets.length === 0) {
      return { grossSalary, exemption, taxableAmount, taxAmount: 0, details: [] };
    }

    // ═══ محاسبه‌ی پله‌ای روی کل حقوق ناخالص ═══
    // جدول مالیات عموماً به‌صورت «مطلق از صفر» تعریف می‌شود؛
    // یعنی پله‌ی اول با نرخ ۰٪ خودش همان معافیت است.
    // پس مستقیماً روی grossSalary حرکت می‌کنیم.

    let remaining = grossSalary;
    let totalTax = 0;
    const details: any[] = [];

    for (const b of setting.brackets) {
      if (remaining <= 0) break;

      const from = Number(b.fromAmount);
      const to = b.toAmount ? Number(b.toAmount) : Infinity;
      const rate = Number(b.ratePercent);
      const width = to - from;

      // چقدر از درآمد باقی‌مانده در این پله می‌افتد؟
      const portion = Math.min(remaining, width);

      if (portion > 0) {
        const tax = (portion * rate) / 100;
        totalTax += tax;
        remaining -= portion;
        details.push({
          order: b.order,
          from,
          to: b.toAmount ? Number(b.toAmount) : null,
          rate,
          portion,
          tax,
        });
      }
    }

    return { grossSalary, exemption, taxableAmount, taxAmount: totalTax, details };
  }

  // ═══ Seed داده پیش‌فرض ۱۴۰۴ ═══
  async seedDefault() {
    const year = 1404;
    const exists = await this.prisma.payrollTaxSetting.findUnique({ where: { year } });
    if (exists) return { skipped: true, message: 'داده پیش‌فرض سال ۱۴۰۴ موجود است' };

    // جدول نمونه سال ۱۴۰۴ (ریال) — قابل ویرایش در UI
    const brackets = [
      { order: 1, fromAmount: 0,           toAmount: 120000000,   ratePercent: 0,  description: 'معاف' },
      { order: 2, fromAmount: 120000000,   toAmount: 165000000,   ratePercent: 10, description: 'پله ۱ — ۱۰٪' },
      { order: 3, fromAmount: 165000000,   toAmount: 270000000,   ratePercent: 15, description: 'پله ۲ — ۱۵٪' },
      { order: 4, fromAmount: 270000000,   toAmount: 420000000,   ratePercent: 20, description: 'پله ۳ — ۲۰٪' },
      { order: 5, fromAmount: 420000000,   toAmount: null,        ratePercent: 30, description: 'پله ۴ — ۳۰٪' },
    ];

    return this.prisma.payrollTaxSetting.create({
      data: {
        year,
        title: 'جدول مالیات حقوق ' + year,
        monthlyExemption: 120000000,
        insuranceEmployeePercent: 7,
        insuranceEmployerPercent: 23,
        isActive: true,
        notes: 'مقادیر پیش‌فرض — لطفاً با جدول رسمی سازمان امور مالیاتی تطبیق دهید',
        brackets: { create: brackets },
      },
      include: { brackets: { orderBy: { order: 'asc' } } },
    });
  }
}
