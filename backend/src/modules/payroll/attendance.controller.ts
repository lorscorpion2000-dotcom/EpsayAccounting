import { Body, Controller, Delete, Get, Param, Post, Query, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, BulkAttendanceDto } from './dto/attendance.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';

@ApiTags('Attendance - حضور و غیاب')
@ApiBearerAuth()
@Controller('payroll/attendance')
export class AttendanceController {
  constructor(private s: AttendanceService) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
  ) {
    return this.s.findAll({ employeeId, fromDate, toDate, status });
  }

  @Get('summary')
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  summary(
    @Query('employeeId') employeeId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.s.summary(employeeId, fromDate, toDate);
  }

  @Get('grid')
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  getGrid(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.s.getGrid(Number(year), Number(month), projectId);
  }

  @Post('bulk')
  @RequirePermissions('payroll.create')
  bulkUpsert(@Body() dto: BulkAttendanceDto, @CurrentUser('id') userId: string) {
    return this.s.bulkUpsert(dto.items, userId);
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  upsert(@Body() dto: CreateAttendanceDto, @CurrentUser('id') userId: string) {
    return this.s.upsert(dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }


  @Delete(':id/admin')
  @RequirePermissions('attendance.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.s.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('attendance.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.s.restore(id, user.id);
  }

}
