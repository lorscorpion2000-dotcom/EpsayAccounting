import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChequesService } from './cheques.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { ChequeActionDto } from './dto/cheque-action.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';

@ApiTags('Cheques - چک‌ها')
@ApiBearerAuth()
@Controller('cheques')
export class ChequesController {
  constructor(private service: ChequesService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'direction', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'bankAccountId', required: false })
  @ApiQuery({ name: 'fromDueDate', required: false })
  @ApiQuery({ name: 'toDueDate', required: false })
  findAll(
    @Query('direction') direction?: string,
    @Query('status') status?: string,
    @Query('partnerId') partnerId?: string,
    @Query('bankAccountId') bankAccountId?: string,
    @Query('fromDueDate') fromDueDate?: string,
    @Query('toDueDate') toDueDate?: string,
  ) {
    return this.service.findAll({ direction, status, partnerId, bankAccountId, fromDueDate, toDueDate });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateChequeDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateChequeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: any,
  ) {
    const roles = (user?.roles || []) as string[];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.service.remove(id, { force: wantForce && isAdmin });
  }

  @Patch(':id/pass')
  @RequirePermissions('accounting.update')
  pass(@Param('id') id: string, @Body() dto: ChequeActionDto, @CurrentUser('id') userId: string) {
    return this.service.pass(id, dto.note, userId);
  }

  @Patch(':id/return')
  @RequirePermissions('accounting.update')
  return_(@Param('id') id: string, @Body() dto: ChequeActionDto, @CurrentUser('id') userId: string) {
    return this.service.return_(id, dto.note, userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('accounting.update')
  cancel(@Param('id') id: string, @Body() dto: ChequeActionDto, @CurrentUser('id') userId: string) {
    return this.service.cancel(id, dto.note, userId);
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('bank.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'cheque',
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
  @RequirePermissions('bank.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'cheque',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('bank.update')
  listDeleted(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.softDelete.listDeleted({
      model: 'cheque',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

}