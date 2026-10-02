import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, UpdateWithdrawalDto } from './dto/withdrawal.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Capital Withdrawals - برداشت شرکا')
@ApiBearerAuth()
@Controller('partner-capital/withdrawals')
export class WithdrawalsController {
  constructor(private s: WithdrawalsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) { return this.s.findAll({ partnerId, projectId, status }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateWithdrawalDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateWithdrawalDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('partners.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }
}
