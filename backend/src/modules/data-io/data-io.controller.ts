import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataIoService } from './data-io.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Data I/O - ورود/خروج داده‌های پایه')
@ApiBearerAuth()
@Controller('data-io')
export class DataIoController {
  constructor(private service: DataIoService) {}

  // ═══ Export ═══
  @Get('partners/export')
  @RequirePermissions('data-io.read')
  exportPartners() { return this.service.exportPartners(); }

  @Get('items/export')
  @RequirePermissions('data-io.read')
  exportItems() { return this.service.exportItems(); }

  @Get('wbs/export')
  @RequirePermissions('data-io.read')
  exportWbs(@Query('projectId') projectId?: string) { return this.service.exportWbs(projectId); }

  @Get('accounts/export')
  @RequirePermissions('data-io.read')
  exportAccounts() { return this.service.exportAccounts(); }

  // ═══ Import ═══
  @Post('partners/import')
  @RequirePermissions('data-io.manage')
  importPartners(@Body() body: { rows: any[] }) {
    return this.service.importPartners(body.rows || []);
  }

  @Post('items/import')
  @RequirePermissions('data-io.manage')
  importItems(@Body() body: { rows: any[] }) {
    return this.service.importItems(body.rows || []);
  }

  @Post('wbs/import')
  @RequirePermissions('data-io.manage')
  importWbs(@Body() body: { rows: any[] }) {
    return this.service.importWbs(body.rows || []);
  }

  @Post('accounts/import')
  @RequirePermissions('data-io.manage')
  importAccounts(@Body() body: { rows: any[] }) {
    return this.service.importAccounts(body.rows || []);
  }
}
