import { Module } from '@nestjs/common';
import { ClientStatementService } from './client-statement.service';
import { ClientStatementController } from './client-statement.controller';

@Module({
  controllers: [ClientStatementController],
  providers: [ClientStatementService],
  exports: [ClientStatementService],
})
export class ClientStatementModule {}
