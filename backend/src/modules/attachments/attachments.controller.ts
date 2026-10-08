import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Attachments - پیوست‌ها')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.list(entityType, entityId);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.createMany(body);
  }

  @Delete(':id')
  @RequirePermissions('attachment.delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }


  @Delete(':id/admin')
  @RequirePermissions('attachment.delete')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.svc.adminDelete(id, user.id, body?.reason, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('attachment.delete')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.svc.restore(id, user.id);
  }

}
