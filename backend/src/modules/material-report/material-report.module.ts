import { Module } from '@nestjs/common';
import { MaterialReportService } from './material-report.service';
import { MaterialReportController } from './material-report.controller';

@Module({
  controllers: [MaterialReportController],
  providers: [MaterialReportService],
  exports: [MaterialReportService],
})
export class MaterialReportModule {}
