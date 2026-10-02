import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/attendance.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
}
