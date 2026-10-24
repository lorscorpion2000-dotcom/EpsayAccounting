import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CreateAccountMappingDto, UpdateAccountMappingDto } from './dto/account-mapping.dto';
import { SoftDeleteService } from '../../../common/services/soft-delete.service';
import { ReasonDto } from '../../../common/dto';
import { OptionalIntPipe } from '../../../common/pipes/optional-int.pipe';

import type { Request } from 'express';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };

/**
 * AdminUser type comes from SoftDeleteService signature â€” avoids duplication.
 * Routes are guarded by @RequirePermissions, so req.user is present at runtime.
 */
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];

@ApiTags('Account Mappings - نگاشت حساب‌ها')
@ApiBearerAuth()
@Controller('accounting/mappings')
export class AccountMappingController {
  constructor(
    private prisma: PrismaService,
    private softDelete: SoftDeleteService,
  ) {}

  @Get()
  @RequirePermissions('accounting.read')
  list() {
    return this.prisma.accountMapping.findMany({
      include: {
        debitAccount: { select: { id: true, code: true, name: true } },
        creditAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('accounting.update')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.softDelete.listDeleted({
      model: 'accountMapping',
      take: take ?? 100,
      skip: skip ?? 0,
    });
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  get(@Param('id') id: string) {
    return this.prisma.accountMapping.findUnique({
      where: { id },
      include: { debitAccount: true, creditAccount: true },
    });
  }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateAccountMappingDto) {
    return this.prisma.accountMapping.create({ data: dto });
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: UpdateAccountMappingDto) {
    return this.prisma.accountMapping.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    await this.prisma.accountMapping.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
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
      model: 'accountMapping',
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
      model: 'accountMapping',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
}
