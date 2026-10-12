import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { PayrollPeriodStatus } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Payroll Periods - دوره‌های حقوق')
@ApiBearerAuth()
@Controller('payroll/periods')
export class PayrollPeriodsController {
  constructor(private s: PayrollPeriodsService,
    private calc: PayrollCalculationService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @Query('year') year?: string,
    @Query('status', new ParseEnumPipe(PayrollPeriodStatus, { optional: true })) status?: PayrollPeriodStatus,
    @Query('projectId') projectId?: string,
  ) {
    return this.s.findAll({
      year: year ? parseInt(year, 10) : undefined,
      status, projectId,
    });
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreatePayrollPeriodDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/calculate')
  @RequirePermissions('payroll.update')
  calculate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.calc.calculatePeriod(id, userId);
  }

  @Patch(':id/calculate-from-attendance')
  @RequirePermissions('payroll.update')
  calculateFromAttendance(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.calc.calculateFromAttendance(id, userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/pay')
  @RequirePermissions('payroll.update')
  pay(@Param('id') id: string) { return this.s.markPaid(id); }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('payroll.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'payrollPeriod',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('payroll.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'payrollPeriod',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('payroll.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'payrollPeriod',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
