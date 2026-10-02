import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payroll Periods - دوره‌های حقوق')
@ApiBearerAuth()
@Controller('payroll/periods')
export class PayrollPeriodsController {
  constructor(
    private s: PayrollPeriodsService,
    private calc: PayrollCalculationService,
  ) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @Query('year') year?: string,
    @Query('status') status?: string,
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

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string) { return this.s.approve(id); }

  @Patch(':id/pay')
  @RequirePermissions('payroll.update')
  pay(@Param('id') id: string) { return this.s.markPaid(id); }
}
