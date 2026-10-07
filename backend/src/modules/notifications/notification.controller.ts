import { Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private service: NotificationService) {}

  @Get()
  @RequirePermissions('notification.read')
  list(@Query('unread') unread?: string, @Query('limit') limit?: string) {
    return this.service.list({
      unreadOnly: unread === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('unread-count')
  @RequirePermissions('notification.read')
  unreadCount() { return this.service.unreadCount(); }

  @Patch(':id/read')
  @RequirePermissions('notification.read')
  markRead(@Param('id') id: string) { return this.service.markRead(id); }

  @Post('read-all')
  @RequirePermissions('notification.read')
  markAllRead() { return this.service.markAllRead(); }

  @Post('scan')
  @RequirePermissions('notification.manage')
  scan() { return this.service.scan(); }

  @Post('clear-read')
  @RequirePermissions('notification.manage')
  clearRead() { return this.service.clearRead(); }

  @Delete(':id')
  @RequirePermissions('notification.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
