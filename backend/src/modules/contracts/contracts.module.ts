import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { ContractService } from './services/contract.service';
import { LegalPartyService } from './services/legal-party.service';
import { LegalTemplateService } from './services/legal-template.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractService,
    LegalPartyService,
    LegalTemplateService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
