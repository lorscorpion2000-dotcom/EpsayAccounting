import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardExecutiveService } from './dashboard-executive.service';
import { DashboardController } from './dashboard.controller';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardExecutiveService],
  exports: [DashboardService],
})
export class DashboardModule {}
