import { Module } from '@nestjs/common';
import { ClientStatementService } from './client-statement.service';
import { ClientStatementController } from './client-statement.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { ClientStatementCrudService } from './services/client-statement-crud.service';
import { ClientStatementItemsService } from './services/client-statement-items.service';
import { ClientStatementWorkflowService } from './services/client-statement-workflow.service';
import { ClientStatementPostService } from './services/client-statement-post.service';

@Module({
  imports: [AccountingModule],
  controllers: [ClientStatementController],
  providers: [
    ClientStatementService,
    ClientStatementCrudService,
    ClientStatementItemsService,
    ClientStatementWorkflowService,
    ClientStatementPostService,
  ],
  exports: [ClientStatementService],
})
export class ClientStatementModule {}
