import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { PettyCashTransactionsService } from './transactions.service';
import { CreatePettyCashTransactionDto } from './dto/create-transaction.dto';
import { UpdatePettyCashTransactionDto } from './dto/update-transaction.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Petty Cash Transactions - تراکنش‌های تنخواه')
@ApiBearerAuth()
@Controller('petty-cash/transactions')
export class PettyCashTransactionsController {
  constructor(private service: PettyCashTransactionsService) {}

  @Get()
  @RequirePermissions('petty-cash.read')
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findAll(
    @Query('accountId') accountId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.findAll({ accountId, type, status, fromDate, toDate });
  }

  @Get(':id')
  @RequirePermissions('petty-cash.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('petty-cash.create')
  create(@Body() dto: CreatePettyCashTransactionDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('petty-cash.update')
  update(@Param('id') id: string, @Body() dto: UpdatePettyCashTransactionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('petty-cash.delete')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('petty-cash.update')
  submit(@Param('id') id: string) { return this.service.submit(id); }

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


  @Delete(':id/admin')
  @RequirePermissions('pettycashtransaction.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.service.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('pettycashtransaction.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

}
