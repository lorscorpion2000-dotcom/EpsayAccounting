import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OverheadService } from './overhead.service';
import {
  CreateOverheadDto, UpdateOverheadDto, PreviewDto,
} from './dto/overhead.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OverheadAllocationStatus } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

@ApiTags('Overhead - تسهیم سربار ستاد')
@ApiBearerAuth()
@Controller('overhead-allocations')
export class OverheadController {
  constructor(private service: OverheadService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('overhead.read')
  list(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('status', new ParseEnumPipe(OverheadAllocationStatus, { optional: true })) status?: OverheadAllocationStatus,
  ) { return this.service.list({ fiscalYearId, status }); }

  @Get('stats')
  @RequirePermissions('overhead.read')
  stats(@Query('fiscalYearId') fiscalYearId?: string) {
    return this.service.stats(fiscalYearId);
  }

  @Post('preview')
  @RequirePermissions('overhead.read')
  preview(@Body() dto: PreviewDto) { return this.service.preview(dto); }

  @Get(':id')
  @RequirePermissions('overhead.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('overhead.manage')
  create(@Body() dto: CreateOverheadDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('overhead.manage')
  update(@Param('id') id: string, @Body() dto: UpdateOverheadDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('overhead.manage')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user?.id);
  }

  @Post(':id/post')
  @RequirePermissions('overhead.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('overhead.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('overhead.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'overheadAllocation',
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
  @RequirePermissions('overhead.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'overheadAllocation',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('overhead.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'overheadAllocation',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
