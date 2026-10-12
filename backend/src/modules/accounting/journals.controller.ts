import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { ReverseJournalDto } from './dto/reverse-journal.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto, ReasonForceDto } from '../../common/dto';

@ApiTags('Journals - اسناد حسابداری')
@ApiBearerAuth()
@Controller('journals')
export class JournalsController {
  constructor(private service: JournalsService) {}

  @Get()
  @RequirePermissions('accounting.read')
  @ApiQuery({ name: 'fiscalYearId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ fiscalYearId, status, fromDate, toDate, search });
  }

  @Get('deletions')
  @RequirePermissions('journal.view-deletions')
  listDeletions(@Query('limit') limit?: string) {
    return this.service.listDeletions(limit ? parseInt(limit, 10) : 100);
  }

  @Get(':id')
  @RequirePermissions('accounting.read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermissions('accounting.create')
  create(@Body() dto: CreateJournalDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }

  @Patch(':id/post')
  @RequirePermissions('accounting.update')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Patch(':id/reverse')
  @RequirePermissions('accounting.update')
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseJournalDto,
    @CurrentUser('id') userId: string,
  ) {
    const reversalDate = (dto as any).reversalDate
      ? new Date((dto as any).reversalDate)
      : new Date();
    return this.service.reverse(id, dto.reason, reversalDate, userId);
  }


  @Delete(':id/admin')
  @RequirePermissions('journal.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonForceDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    const force = !!body.force;

    // If force=false, only allow DRAFT/REJECTED (Posted rejected)
    if (!force) {
      const j: any = await this.service['prisma'].journalEntry.findUnique({ where: { id } });
      if (!j) throw new Error('سند یافت نشد');
      if (j.status === 'POSTED') {
        const err: any = new Error('سند Posted است — برای حذف force=true لازم است');
        err.status = 400;
        throw err;
      }
    } else {
      // force=true requires journal.force-delete permission
      const perms = (user.permissions || []) as string[];
      if (!perms.includes('journal.force-delete') && !perms.includes('*')) {
        const err: any = new Error('اجازه حذف سند Posted را ندارید');
        err.status = 403;
        throw err;
      }
    }

    return this.service.deleteWithLog(
      id,
      { id: user.id, username: user.username, fullName: user.fullName },
      body.reason || 'بدون دلیل',
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] },
    );
  }




  @Patch(':id/restore')
  @RequirePermissions('journal.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.service.restore(id, user.id);
  }

  @Delete(':id/hard-delete')
  @RequirePermissions('journal.force-delete')
  async hardDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.service.hardDelete(
      id,
      { id: user.id, username: user.username, fullName: user.fullName },
      body.reason || 'حذف کامل توسط مدیر',
      { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    );
  }
}
