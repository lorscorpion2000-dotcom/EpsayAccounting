import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { WbsService } from './wbs.service';
import { ContractsService } from './contracts.service';
import { BudgetsService } from './budgets.service';
import { ProjectsController } from './projects.controller';
import { WbsController } from './wbs.controller';
import { ContractsController } from './contracts.controller';
import { BudgetsController } from './budgets.controller';

@Module({
  controllers: [
    ProjectsController,
    WbsController,
    ContractsController,
    BudgetsController,
  ],
  providers: [ProjectsService, WbsService, ContractsService, BudgetsService],
  exports: [ProjectsService, WbsService, ContractsService, BudgetsService],
})
export class ProjectsModule {}
