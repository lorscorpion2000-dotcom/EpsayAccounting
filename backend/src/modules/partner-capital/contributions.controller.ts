import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query } from '@nestjs/common';;
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CapitalTransactionStatus } from '@prisma/client';

@ApiTags('Capital Contributions - آورده شرکا')
@ApiBearerAuth()
@Controller('partner-capital/contributions')
export class ContributionsController {
  constructor(private s: ContributionsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
    @Query('status', new ParseEnumPipe(CapitalTransactionStatus, { optional: true })) status?: CapitalTransactionStatus,
  ) { return this.s.findAll({ partnerId, projectId, status }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateContributionDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateContributionDto) {
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
