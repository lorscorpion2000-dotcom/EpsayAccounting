import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;;;;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InsurancesService } from './insurances.service';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { InsuranceType } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest, AuthUserPayload } from '../auth/auth.controller';

@ApiTags('Timeline Insurances - بیمه‌نامه‌ها')
@ApiBearerAuth()
@Controller('timeline/insurances')
export class InsurancesController {
  constructor(private s: InsurancesService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type', new ParseEnumPipe(InsuranceType, { optional: true })) type?: InsuranceType,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, search }); }

  @Get('expiring')
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'days', required: false })
  getExpiring(@Query('days') days?: string) {
    return this.s.getExpiring(days ? parseInt(days, 10) : 60);
  }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateInsuranceDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string, @CurrentUser() _user: AuthUserPayload) {
    return this.s.remove(id, { force: true });
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('timeline.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user!;
    return this.softDelete.adminDelete({
      model: 'insurance',
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
  @RequirePermissions('timeline.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user!;
    return this.softDelete.restore({
      model: 'insurance',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('timeline.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'insurance',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
