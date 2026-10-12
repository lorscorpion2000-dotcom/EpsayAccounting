import { Module } from '@nestjs/common';
import { ClientStatementService } from './client-statement.service';
import { ClientStatementController } from './client-statement.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [ClientStatementController],
  providers: [ClientStatementService],
  exports: [ClientStatementService],
})
export class ClientStatementModule {}
