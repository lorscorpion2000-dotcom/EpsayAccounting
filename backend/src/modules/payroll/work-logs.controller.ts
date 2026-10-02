import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WorkLogsService } from './work-logs.service';
import { CreateWorkLogDto } from './dto/work-log.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Work Logs - کارکرد روزانه')
@ApiBearerAuth()
@Controller('payroll/work-logs')
export class WorkLogsController {
  constructor(private s: WorkLogsService) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.s.findAll({ employeeId, projectId, fromDate, toDate });
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
  create(@Body() dto: CreateWorkLogDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkLogDto>) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
