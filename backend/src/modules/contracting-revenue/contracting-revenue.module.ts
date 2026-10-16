import { Module } from '@nestjs/common';
import { ContractingRevenueService } from './contracting-revenue.service';
import { ContractingRevenueController } from './contracting-revenue.controller';

@Module({
  controllers: [ContractingRevenueController],
  providers: [ContractingRevenueService],
  exports: [ContractingRevenueService],
})
export class ContractingRevenueModule {}
