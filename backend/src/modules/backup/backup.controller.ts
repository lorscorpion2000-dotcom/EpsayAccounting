import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backups')
export class BackupController {
  constructor(private service: BackupService) {}

  @Get()
  @RequirePermissions('backup.read')
  list() { return this.service.listBackups(); }

  @Get('stats')
  @RequirePermissions('backup.read')
  stats() { return this.service.stats(); }

  @Post('run')
  @RequirePermissions('backup.manage')
  run() { return this.service.createBackup('MANUAL'); }

  @Delete(':filename')
  @RequirePermissions('backup.manage')
  remove(@Param('filename') filename: string) {
    return this.service.deleteBackup(filename);
  }
}
