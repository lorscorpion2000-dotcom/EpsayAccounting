import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { AttendanceService } from './attendance.service';
import { WorkLogsService } from './work-logs.service';
import { LeaveRequestsService } from './leave-requests.service';
import { AdvanceRequestsService } from './advance-requests.service';
import { SubcontractorStatementsService } from './subcontractor-statements.service';

import { EmployeesController } from './employees.controller';
import { PayrollPeriodsController } from './payroll-periods.controller';
import { AttendanceController } from './attendance.controller';
import { WorkLogsController } from './work-logs.controller';
import { LeaveRequestsController } from './leave-requests.controller';
import { AdvanceRequestsController } from './advance-requests.controller';
import { SubcontractorStatementsController } from './subcontractor-statements.controller';

@Module({
  controllers: [
    EmployeesController,
    PayrollPeriodsController,
    AttendanceController,
    WorkLogsController,
    LeaveRequestsController,
    AdvanceRequestsController,
    SubcontractorStatementsController,
  ],
  providers: [
    EmployeesService,
    PayrollPeriodsService,
    PayrollCalculationService,
    AttendanceService,
    WorkLogsService,
    LeaveRequestsService,
    AdvanceRequestsService,
    SubcontractorStatementsService,
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
  ],
})
export class PayrollModule {}
