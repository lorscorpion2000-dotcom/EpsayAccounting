import { Module } from '@nestjs/common';
import { OverheadService } from './overhead.service';
import { OverheadController } from './overhead.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [OverheadController],
  providers: [OverheadService],
  exports: [OverheadService],
})
export class OverheadModule {}
