import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leave Requests - مرخصی‌ها')
@ApiBearerAuth()
@Controller('payroll/leave-requests')
export class LeaveRequestsController {
  constructor(private s: LeaveRequestsService) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.s.findAll({ employeeId, status });
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
