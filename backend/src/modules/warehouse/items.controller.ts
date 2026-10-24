import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { ItemType } from '@prisma/client';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

import type { Request } from 'express';

interface AuthUser {
  id?: string;
  roles?: string[];
  permissions?: string[];
}

type AuthenticatedRequest = Request & { user?: AuthUser };
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];

@ApiTags('Items - کالاها')
@ApiBearerAuth()
@Controller('warehouse/items')
export class ItemsController {
  constructor(private s: ItemsService,
    private softDelete: SoftDeleteService,) {}

  @Get()
  @RequirePermissions('warehouse.read')
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('type', new ParseEnumPipe(ItemType, { optional: true })) type?: ItemType,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ type, categoryId, search }); }

  @Get(':id')
  @RequirePermissions('warehouse.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('warehouse.create')
  create(@Body() dto: CreateItemDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('warehouse.update')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.delete')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const roles = user?.roles || [];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');
    const wantForce = force === 'true' || force === '1';
    return this.s.remove(id, { force: wantForce && isAdmin, userId: user?.id });
  }

  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('warehouse.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
      model: 'item',
      id,
      user,
      reason: body?.reason || '',
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('warehouse.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
      model: 'item',
      id,
      user,
      meta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('warehouse.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'item',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

}
