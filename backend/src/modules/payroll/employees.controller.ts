import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;;
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { EmployeeCardService } from './employee-card.service';
import { CreateEmployeeDto } from './dto/employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { EmployeeType } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Employees - پرسنل')
@ApiBearerAuth()
@Controller('payroll/employees')
export class EmployeesController {
  constructor(private s: EmployeesService, private cardService: EmployeeCardService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false })
  findAll(
    @Query('active') active?: string,
    @Query('type', new ParseEnumPipe(EmployeeType, { optional: true })) type?: EmployeeType,
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    return this.s.findAll({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      type, search, department,
    });
  }

  @Get('stats')
  @RequirePermissions('payroll.read')
  stats() { return this.s.stats(); }

  @Get(':id/card')
  @RequirePermissions('payroll.read')
  getCard(@Param('id') id: string) {
    return this.cardService.getCard(id);
  }

  @Get(':id/monthly-work')
  @RequirePermissions('payroll.read')
  getMonthlyWork(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.cardService.getMonthlyWork(
      id,
      year ? parseInt(year, 10) : new Date().getFullYear(),
      month ? parseInt(month, 10) : new Date().getMonth() + 1,
    );
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateEmployeeDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.s.remove(id, { force: wantForce && isAdmin });
  }

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
      model: 'employeeProfile',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('payroll.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'employeeProfile',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('payroll.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'employeeProfile',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
