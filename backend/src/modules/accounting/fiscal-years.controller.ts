import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';;;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';

@ApiTags('Fiscal Years - سال‌های مالی')
@ApiBearerAuth()
@Controller('fiscal-years')
export class FiscalYearsController {
  constructor(private service: FiscalYearsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('accounting.read')
  findAll() { return this.service.findAll(); }

  @Get('current')
  @RequirePermissions('accounting.read')
  findCurrent() { return this.service.findCurrent(); }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateFiscalYearDto) { return this.service.create(dto); }

  @Patch(':id/set-current')
  @RequirePermissions('accounting.update')
  setCurrent(@Param('id') id: string) {
    return this.service.setCurrent(id);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: CreateFiscalYearDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/close')
  @RequirePermissions('accounting.update')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Patch(':id/reopen')
  @RequirePermissions('accounting.update')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Get(':id/summary')
  @RequirePermissions('accounting.read')
  summary(@Param('id') id: string) {
    return this.service.summary(id);
  }

  @Patch(':id/generate-closing')
  @RequirePermissions('accounting.update')
  generateClosing(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateClosingEntry(id, userId);
  }

  @Patch(':id/generate-opening')
  @RequirePermissions('accounting.update')
  generateOpening(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateOpeningEntry(id, userId);
  }

  @Get(':id/locked-months')
  @RequirePermissions('accounting.fiscal-years.manage')
  getLockedMonths(@Param('id') id: string) {
    return this.service.getLockedMonths(id);
  }

  @Post(':id/lock-month')
  @RequirePermissions('accounting.fiscal-years.manage')
  lockMonth(@Param('id') id: string, @Body() body: { monthKey: string }) {
    return this.service.lockMonth(id, body.monthKey);
  }

  @Post(':id/unlock-month')
  @RequirePermissions('accounting.fiscal-years.manage')
  unlockMonth(@Param('id') id: string, @Body() body: { monthKey: string }) {
    return this.service.unlockMonth(id, body.monthKey);
  }


  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('accounting.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'fiscalYear',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('accounting.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'fiscalYear',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('accounting.update')
  listDeleted(
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'fiscalYear',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
