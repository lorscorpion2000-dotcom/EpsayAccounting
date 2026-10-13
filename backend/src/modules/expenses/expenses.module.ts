import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories.controller';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [ExpensesService, ExpenseCategoriesService],
  exports: [ExpensesService, ExpenseCategoriesService],
})
export class ExpensesModule {}
