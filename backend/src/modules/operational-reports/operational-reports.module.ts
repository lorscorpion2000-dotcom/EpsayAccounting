import { Module } from '@nestjs/common';
import { OperationalReportsService } from './operational-reports.service';
import { OperationalReportsController } from './operational-reports.controller';

@Module({
  controllers: [OperationalReportsController],
  providers: [OperationalReportsService],
  exports: [OperationalReportsService],
})
export class OperationalReportsModule {}
