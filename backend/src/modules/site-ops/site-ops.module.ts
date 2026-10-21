import { Module } from '@nestjs/common';
import { SiteOpsService } from './site-ops.service';
import { SiteOpsController } from './site-ops.controller';
import { DailyReportSectionsService } from './daily-report-sections.service';
import { DailyReportForwarderService } from './daily-report-forwarder.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { ProcurementModule } from '../procurement/procurement.module';

@Module({
  imports: [PrismaModule, ProcurementModule],
  controllers: [SiteOpsController],
  providers: [
    SiteOpsService,
    DailyReportSectionsService,
    DailyReportForwarderService,
  ],
  exports: [
    SiteOpsService,
    DailyReportSectionsService,
    DailyReportForwarderService,
  ],
})
export class SiteOpsModule {}