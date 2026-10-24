import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SoftDeleteService } from '../../common/services/soft-delete.service';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';

import type { Request } from 'express';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];

@ApiTags('Accounts - کدینگ حساب‌ها')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(
    private service: AccountsService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get('tree')
  @RequirePermissions('accounting.read')
  findTree() { return this.service.findTree(); }

  @Get('flat')
  @RequirePermissions('accounting.read')
  findAllFlat() { return this.service.findAllFlat(); }

  @Get('postable')
  @RequirePermissions('accounting.read')
  findPostable() { return this.service.findPostable(); }

  @Get('generate-code')
  @RequirePermissions('accounting.create')
  @ApiQuery({ name: 'parentId', required: false })
  generateCode(@Query('parentId') parentId?: string) {
    return this.service.generateCode(parentId).then((code) => ({ code }));
  }

  @Get('for-filter')
  @RequirePermissions('accounting.accounts.read')
  findAllForFilter() {
    return this.service.findAllForFilter();
  }

  // ═══ Admin Delete / Restore ═══
  @Get('deleted/list')
  @RequirePermissions('accounting.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'account',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateAccountDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user?.id);
  }

  @Delete(':id/admin')
  @RequirePermissions('accounting.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
      model: 'account',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('accounting.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
      model: 'account',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
}
