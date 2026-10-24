import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Req } from '@nestjs/common';;
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientStatementService } from './client-statement.service';
import {
  CreateCSDto, UpdateCSDto, ImportCSItemsDto, UpdateCSItemDto, RejectCSDto,
} from './dto/client-statement.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReasonDto } from '../../common/dto';
import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';
import { ClientStatementStatus } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth.controller';

@ApiTags('Client Statement')
@ApiBearerAuth()
@Controller('client-statements')
export class ClientStatementController {
  constructor(private service: ClientStatementService) {}

  @Get()
  @RequirePermissions('client-statement.read')
  list(
    @Query('projectId') projectId?: string,
    @Query('status', new ParseEnumPipe(ClientStatementStatus, { optional: true })) status?: ClientStatementStatus,
    @Query('search') search?: string,
  ) { return this.service.list({ projectId, status, search }); }

  @Get('stats')
  @RequirePermissions('client-statement.read')
  stats(@Query('projectId') projectId?: string) {
    return this.service.stats(projectId);
  }

  @Get('next-number/:projectId')
  @RequirePermissions('client-statement.read')
  nextNumber(@Param('projectId') projectId: string) {
    return this.service.nextStatementNumber(projectId);
  }

  @Get(':id')
  @RequirePermissions('client-statement.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('client-statement.manage')
  create(@Body() dto: CreateCSDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('client-statement.manage')
  update(@Param('id') id: string, @Body() dto: UpdateCSDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('client-statement.manage')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }

  @Get('deleted/list')
  @RequirePermissions('client-statement.manage')
  listDeleted(
    @Query('take', new OptionalIntPipe()) take?: number,
    @Query('skip', new OptionalIntPipe()) skip?: number,
  ) {
    return this.service.listDeleted(take ?? 100, skip ?? 0);
  }

  @Delete(':id/admin')
  @RequirePermissions('client-statement.manage')
  adminDelete(@Param('id') id: string, @Body() body: ReasonDto, @Req() req: AuthenticatedRequest) {
    return this.service.adminDelete(id, req.user?.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('client-statement.manage')
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.restore(id, userId);
  }

  @Post(':id/items/import')
  @RequirePermissions('client-statement.manage')
  importItems(@Param('id') id: string, @Body() dto: ImportCSItemsDto) {
    return this.service.importItems(id, dto);
  }

  @Patch('items/:itemId')
  @RequirePermissions('client-statement.manage')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateCSItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('client-statement.manage')
  deleteItem(@Param('itemId') itemId: string) { return this.service.deleteItem(itemId); }

  @Post(':id/submit')
  @RequirePermissions('client-statement.manage')
  submit(@Param('id') id: string) { return this.service.submit(id); }

  @Post(':id/approve')
  @RequirePermissions('approvals.approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Post(':id/reject')
  @RequirePermissions('approvals.approve')
  reject(@Param('id') id: string, @Body() dto: RejectCSDto) {
    return this.service.reject(id, dto.reason);
  }

  @Post(':id/post')
  @RequirePermissions('client-statement.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('client-statement.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }
}
