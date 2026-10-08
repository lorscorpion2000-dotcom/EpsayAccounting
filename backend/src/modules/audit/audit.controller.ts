import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Audit Trail')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  list(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      userId, entity, action, fromDate, toDate, search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get('stats')
  @RequirePermissions('audit.read')
  stats(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.service.stats({ fromDate, toDate });
  }

  @Get('security')


  @RequirePermissions('audit.read')


  securityEvents(


    @Query('action') action?: string,


    @Query('fromDate') fromDate?: string,


    @Query('toDate') toDate?: string,


    @Query('ipAddress') ipAddress?: string,


    @Query('page') page?: string,


    @Query('pageSize') pageSize?: string,


  ) {


    return this.service.securityEvents({


      action, fromDate, toDate, ipAddress,


      page: page ? parseInt(page, 10) : 1,


      pageSize: pageSize ? parseInt(pageSize, 10) : 50,


    });


  }



  @Get('security/stats')


  @RequirePermissions('audit.read')


  securityStats(


    @Query('fromDate') fromDate?: string,


    @Query('toDate') toDate?: string,


  ) {


    return this.service.securityStats({ fromDate, toDate });


  }



  @Get(':id')
  @RequirePermissions('audit.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Delete('clean')
  @RequirePermissions('audit.manage')
  clean(@Query('days') days?: string) {
    return this.service.cleanOlderThan(days ? parseInt(days, 10) : 90);
  }
}
