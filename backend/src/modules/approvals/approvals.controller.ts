import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { ApproveDto, RejectDto } from './dto/approve.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Approvals - کارتابل تاییدها')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private service: ApprovalsService) {}

  @Get('pending')
  @RequirePermissions('approvals.read')
  getPending(@CurrentUser('id') userId: string) {
    return this.service.getPending(userId);
  }

  @Get('stats')
  @RequirePermissions('approvals.read')
  getStats() {
    return this.service.getStats();
  }

  @Post('approve')
  @RequirePermissions('approvals.update')
  approve(@Body() dto: ApproveDto, @CurrentUser('id') userId: string) {
    return this.service.approve(dto.module, dto.id, userId, dto.force);
  }

  @Post('reject')
  @RequirePermissions('approvals.update')
  reject(@Body() dto: RejectDto, @CurrentUser('id') userId: string) {
    return this.service.reject(dto.module, dto.id, dto.reason, userId);
  }
}
