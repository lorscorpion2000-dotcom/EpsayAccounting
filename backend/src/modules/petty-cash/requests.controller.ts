import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PettyCashRequestsService } from './requests.service';
import { CreatePettyCashRequestDto } from './dto/create-request.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import type { AuthRequest } from '../../common/types/auth-request';
import { PettyCashRequestStatus } from '@prisma/client';

@ApiTags('Petty Cash Requests - درخواست‌های شارژ')
@ApiBearerAuth()
@Controller('petty-cash/requests')
export class PettyCashRequestsController {
  constructor(private service: PettyCashRequestsService) {}

  @Get()
  @RequirePermissions('petty-cash.read')
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('accountId') accountId?: string,
    @Query('status', new ParseEnumPipe(PettyCashRequestStatus, { optional: true })) status?: PettyCashRequestStatus,
  ) {
    return this.service.findAll({ accountId, status });
  }

  @Get(':id')
  @RequirePermissions('petty-cash.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('petty-cash.create')
  create(@Body() dto: CreatePettyCashRequestDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.service.reject(id, dto.reason);
  }

  @Patch(':id/pay')
  @RequirePermissions('petty-cash.update')
  pay(
    @Param('id') id: string,
    @Body() body: { sourceAccountId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markPaid(id, body.sourceAccountId, userId);
  }


  @Delete(':id/admin')
  @RequirePermissions('pettycashrequest.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('pettycashrequest.delete')
  async restore(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.restore(id, req.user?.id);
  }

}
