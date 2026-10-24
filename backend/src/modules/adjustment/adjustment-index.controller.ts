import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdjustmentIndexService } from './adjustment-index.service';
import { CreateIndexDto, UpdateIndexDto } from './dto/adjustment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@ApiTags('Adjustment Index - شاخص‌های تعدیل')
@ApiBearerAuth()
@Controller('adjustment-indices')
export class AdjustmentIndexController {
  constructor(private service: AdjustmentIndexService) {}

  @Get()
  @RequirePermissions('adjustment.read')
  list(
    @Query('year') year?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list({
      year: year ? parseInt(year, 10) : undefined,
      category,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get('stats')
  @RequirePermissions('adjustment.read')
  stats() { return this.service.stats(); }

  @Get(':id')
  @RequirePermissions('adjustment.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('adjustment.manage')
  create(@Body() dto: CreateIndexDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('adjustment.manage')
  update(@Param('id') id: string, @Body() dto: UpdateIndexDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('adjustment.manage')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user?.id);
  }

  // ═══ Admin Delete / Restore / List ═══
  @Get('deleted/list')
  @RequirePermissions('adjustment.manage')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.service.listDeleted(take ?? 100, skip ?? 0);
  }

  @Delete(':id/admin')
  @RequirePermissions('adjustment.manage')
  adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('adjustment.manage')
  restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.restore(id, req.user?.id);
  }
}
