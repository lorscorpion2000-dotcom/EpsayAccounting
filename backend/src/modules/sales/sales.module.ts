import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import {
  SalesUnitsController,
  SalesCustomersController,
  SalesContractsController,
  SalesPaymentsController,
} from './sales.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    SalesUnitsController,
    SalesCustomersController,
    SalesContractsController,
    SalesPaymentsController,
  ],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
