import { Module } from '@nestjs/common';
import { PermitsService } from './permits.service';
import { InsurancesService } from './insurances.service';
import { GuaranteesService } from './guarantees.service';
import { DocumentsService } from './documents.service';
import { ChecklistsService } from './checklists.service';

import { PermitsController } from './permits.controller';
import { InsurancesController } from './insurances.controller';
import { GuaranteesController } from './guarantees.controller';
import { DocumentsController } from './documents.controller';
import { ChecklistsController } from './checklists.controller';

@Module({
  controllers: [
    PermitsController,
    InsurancesController,
    GuaranteesController,
    DocumentsController,
    ChecklistsController,
  ],
  providers: [
    PermitsService,
    InsurancesService,
    GuaranteesService,
    DocumentsService,
    ChecklistsService,
  ],
  exports: [
    PermitsService,
    InsurancesService,
    GuaranteesService,
    DocumentsService,
    ChecklistsService,
  ],
})
export class TimelineModule {}
