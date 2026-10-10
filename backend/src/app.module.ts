import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UnitsModule } from './modules/units/units.module';
import { RecycleBinModule } from './modules/recycle-bin/recycle-bin.module';
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
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { BankModule } from './modules/bank/bank.module';
import { FixedAssetsModule } from './modules/fixed-assets/fixed-assets.module';
import { PurchaseInvoicesModule } from './modules/purchase-invoices/purchase-invoices.module';
import { SalesInvoicesModule } from './modules/sales-invoices/sales-invoices.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { PriceListModule } from './modules/price-list/price-list.module';
import { OverheadModule } from './modules/overhead/overhead.module';
import { ClientStatementModule } from './modules/client-statement/client-statement.module';
import { WipModule } from './modules/wip/wip.module';
import { DataIoModule } from './modules/data-io/data-io.module';
import { MaterialReportModule } from './modules/material-report/material-report.module';
import { InventoryCountModule } from './modules/inventory-count/inventory-count.module';
import { AdjustmentModule } from './modules/adjustment/adjustment.module';
import { TaxReportsModule } from './modules/tax-reports/tax-reports.module';
import { OperationalReportsModule } from './modules/operational-reports/operational-reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './common/common.module';
import { BackupModule } from './modules/backup/backup.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { HealthController } from './common/health/health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 1000 },
    ]),
    CommonModule,
    UnitsModule,
    RecycleBinModule,
    NotificationModule,
    BackupModule,
    AuditModule,
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
    CostCentersModule,
    BankModule,
    FixedAssetsModule,
    PurchaseInvoicesModule,
    SalesInvoicesModule,
    EquipmentModule,
    PriceListModule,
    OverheadModule,
    ClientStatementModule,
    WipModule,
    DataIoModule,
    MaterialReportModule,
    InventoryCountModule,
    AdjustmentModule,
    TaxReportsModule,
    OperationalReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
