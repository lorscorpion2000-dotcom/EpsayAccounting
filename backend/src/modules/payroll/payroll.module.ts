import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeeCardService } from './employee-card.service';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { AttendanceService } from './attendance.service';
import { WorkLogsService } from './work-logs.service';
import { LeaveRequestsService } from './leave-requests.service';
import { AdvanceRequestsService } from './advance-requests.service';
import { SubcontractorStatementsService } from './subcontractor-statements.service';
import { PayrollTaxService } from './payroll-tax.service';
import { WorkerStatementsService } from './worker-statements.service';

import { EmployeesController } from './employees.controller';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { AttendanceController } from './attendance.controller';
import { WorkLogsController } from './work-logs.controller';
import { LeaveRequestsController } from './leave-requests.controller';
import { AdvanceRequestsController } from './advance-requests.controller';
import { SubcontractorStatementsController } from './subcontractor-statements.controller';
import { PayrollTaxController } from './payroll-tax.controller';
import { WorkerStatementsController } from './worker-statements.controller';

import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [
    EmployeesController,
    PayrollPeriodsController,
    AttendanceController,
    WorkLogsController,
    LeaveRequestsController,
    AdvanceRequestsController,
    SubcontractorStatementsController,
    PayrollTaxController,
    WorkerStatementsController,
  ],
  providers: [
    EmployeesService,
    EmployeeCardService,
    PayrollPeriodsService,
    PayrollCalculationService,
    AttendanceService,
    WorkLogsService,
    LeaveRequestsService,
    AdvanceRequestsService,
    SubcontractorStatementsService,
    PayrollTaxService,
    WorkerStatementsService,
  ],
  exports: [
    EmployeesService,
    PayrollPeriodsService,
    PayrollCalculationService,
    AttendanceService,
    WorkLogsService,
    LeaveRequestsService,
    AdvanceRequestsService,
    SubcontractorStatementsService,
    PayrollTaxService,
    WorkerStatementsService,
  ],
})
export class PayrollModule {}
