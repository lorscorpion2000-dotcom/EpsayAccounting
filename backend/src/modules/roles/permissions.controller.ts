import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Permissions - مجوزها')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('settings.read')
  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }
}
