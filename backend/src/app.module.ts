import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './shared/prisma/prisma.module';
import { UploadModule } from './common/upload/upload.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PettyCashModule } from './modules/petty-cash/petty-cash.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SiteOpsModule } from './modules/site-ops/site-ops.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PartnerCapitalModule } from './modules/partner-capital/partner-capital.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { SalesModule } from './modules/sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    UploadModule,
    AttachmentsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PartnersModule,
    ProjectsModule,
    AccountingModule,
    PettyCashModule,
    ApprovalsModule,
    ProcurementModule,
    WarehouseModule,
    SiteOpsModule,
    PayrollModule,
    DashboardModule,
    PartnerCapitalModule,
    TimelineModule,
    ContractsModule,
    SalesModule,
  ],
})
export class AppModule {}
