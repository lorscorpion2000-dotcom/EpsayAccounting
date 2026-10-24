import { Body, Controller, Delete, Get, Param, Post, Query, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CapitalAccountsService } from './accounts.service';
import { CreateCapitalAccountDto } from './dto/capital-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@ApiTags('Partner Capital Accounts - حساب‌های سرمایه شرکا')
@ApiBearerAuth()
@Controller('partner-capital/accounts')
export class CapitalAccountsController {
  constructor(private s: CapitalAccountsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
  ) { return this.s.findAll({ partnerId, projectId }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateCapitalAccountDto) { return this.s.create(dto); }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }


  @Delete(':id/admin')
  @RequirePermissions('capitalaccount.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user!;
    return this.s.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('capitalaccount.delete')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user!;
    return this.s.restore(id, user.id);
  }

  @Get('deleted/list')
  @RequirePermissions('capitalaccount.delete')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.s.listDeleted(take ?? 100, skip ?? 0);
  }

}
