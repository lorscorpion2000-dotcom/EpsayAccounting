import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WorkerStatementsService } from './worker-statements.service';
import {
  CreateWorkerStatementDto,
  PreviewWorkerStatementDto,
} from './dto/worker-statement.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { WorkerStatementStatus } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Worker Statements - صورت‌وضعیت پرسنل')
@ApiBearerAuth()
@Controller('payroll/worker-statements')
export class WorkerStatementsController {
  constructor(private s: WorkerStatementsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('payroll.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('status', new ParseEnumPipe(WorkerStatementStatus, { optional: true })) status?: WorkerStatementStatus,
  ) {
    return this.s.findAll({ projectId, partnerId, status });
  }

  @Get('stats')
  @RequirePermissions('payroll.read')
  stats(@Query('projectId') projectId?: string) { return this.s.stats(projectId); }

  @Post('preview')
  @RequirePermissions('payroll.read')
  preview(@Body() dto: PreviewWorkerStatementDto) { return this.s.preview(dto); }

  @Get(':id')
  @RequirePermissions('payroll.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('payroll.create')
  create(@Body() dto: CreateWorkerStatementDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('payroll.update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkerStatementDto>) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.delete')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.remove(id, userId);
  }

  @Patch(':id/submit')
  @RequirePermissions('payroll.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

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
      model: 'workerStatement',
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
      model: 'workerStatement',
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
      model: 'workerStatement',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
