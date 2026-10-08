import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
const ExecutiveDashboardPage = lazy(() => import('@/modules/dashboard/pages/ExecutiveDashboardPage'));
import WarehouseFormModal from '@/modules/warehouse/components/WarehouseFormModal';






// ─── Lazy-loaded pages ─────────────────────────────────────
const CapitalAccountsPage = lazy(() => import('@/modules/partner-capital/pages/CapitalAccountsPage'));
const ContributionsPage = lazy(() => import('@/modules/partner-capital/pages/ContributionsPage'));
const WithdrawalsPage = lazy(() => import('@/modules/partner-capital/pages/WithdrawalsPage'));
const SharesPage = lazy(() => import('@/modules/partner-capital/pages/SharesPage'));
const BalanceSheetPage = lazy(() => import('@/modules/partner-capital/pages/BalanceSheetPage'));
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const ReportsHubPage = lazy(() => import('@/modules/reports/pages/ReportsHubPage'));
const ProjectReportsPage = lazy(() => import('@/modules/reports/pages/ProjectReportsPage'));
const ProjectReportsPickerPage = lazy(() => import('@/modules/reports/pages/ProjectReportsPickerPage'));
const UsersPage = lazy(() => import('@/modules/settings/pages/UsersPage'));
const RolesPage = lazy(() => import('@/modules/settings/pages/RolesPage'));
const UnitsPage = lazy(() => import('@/modules/settings/pages/UnitsPage'));
const FiscalYearsPage = lazy(() => import('@/modules/settings/pages/FiscalYearsPage'));
const PeriodLockPage = lazy(() => import('@/modules/settings/pages/PeriodLockPage'));
const PartnersListPage = lazy(() => import('@/modules/partners/pages/PartnersListPage'));
const ProjectsListPage = lazy(() => import('@/modules/projects/pages/ProjectsListPage'));
const ProjectFormPage = lazy(() => import('@/modules/projects/pages/ProjectFormPage'));
const ProjectDetailPage = lazy(() => import('@/modules/projects/pages/ProjectDetailPage'));
const ProjectInfoTab = lazy(() => import('@/modules/projects/pages/ProjectInfoTab'));
const ContractsTab = lazy(() => import('@/modules/projects/pages/ContractsTab'));
const ContractFormPage = lazy(() => import('@/modules/projects/pages/ContractFormPage'));
const WbsTab = lazy(() => import('@/modules/projects/pages/WbsTab'));
const BudgetsTab = lazy(() => import('@/modules/projects/pages/BudgetsTab'));
const ProjectDashboardTab = lazy(() => import('@/modules/projects/pages/ProjectDashboardTab'));
const ChartOfAccountsPage = lazy(() => import('@/modules/accounting/pages/ChartOfAccountsPage'));
const JournalsListPage = lazy(() => import('@/modules/accounting/pages/JournalsListPage'));
const JournalFormPage = lazy(() => import('@/modules/accounting/pages/JournalFormPage'));
const JournalViewPage = lazy(() => import('@/modules/accounting/pages/JournalViewPage'));
const TrialBalancePage = lazy(() => import('@/modules/accounting/pages/TrialBalancePage'));
const JournalBookPage = lazy(() => import('@/modules/accounting/pages/JournalBookPage'));
const PettyCashAccountsPage = lazy(() => import('@/modules/petty-cash/pages/PettyCashAccountsPage'));
const PettyCashDetailPage = lazy(() => import('@/modules/petty-cash/pages/PettyCashDetailPage'));
const ApprovalsPage = lazy(() => import('@/modules/approvals/pages/ApprovalsPage'));
const WarehousesListPage = lazy(() => import('@/modules/warehouse/pages/WarehousesListPage'));
const CategoriesPage = lazy(() => import('@/modules/warehouse/pages/CategoriesPage'));
const ItemsPage = lazy(() => import('@/modules/warehouse/pages/ItemsPage'));
const ReceiptsListPage = lazy(() => import('@/modules/warehouse/pages/ReceiptsListPage'));
const ReceiptDetailPage = lazy(() => import('@/modules/warehouse/pages/ReceiptDetailPage'));
const ReceiptFormPage = lazy(() => import('@/modules/warehouse/pages/ReceiptFormPage'));
const IssuesListPage = lazy(() => import('@/modules/warehouse/pages/IssuesListPage'));
const IssueFormPage = lazy(() => import('@/modules/warehouse/pages/IssueFormPage'));
const KardexPage = lazy(() => import('@/modules/warehouse/pages/KardexPage'));
const DailyReportsListPage = lazy(() => import('@/modules/site-ops/pages/DailyReportsListPage'));
const DailyReportFormPage = lazy(() => import('@/modules/site-ops/pages/DailyReportFormPage'));
const DailyReportDetailPage = lazy(() => import('@/modules/site-ops/pages/DailyReportDetailPage'));
const FailedForwardingsPage = lazy(() => import('@/modules/site-ops/pages/FailedForwardingsPage'));
const EmployeesListPage = lazy(() => import('@/modules/payroll/pages/EmployeesListPage'));
const EmployeeCardPage = lazy(() => import('@/modules/payroll/pages/EmployeeCardPage'));
const PayrollPeriodsPage = lazy(() => import('@/modules/payroll/pages/PayrollPeriodsPage'));
const PayrollPeriodDetailPage = lazy(() => import('@/modules/payroll/pages/PayrollPeriodDetailPage'));
const AttendancePage = lazy(() => import('@/modules/payroll/pages/AttendancePage'));
const WorkLogsPage = lazy(() => import('@/modules/payroll/pages/WorkLogsPage'));
const LeaveRequestsPage = lazy(() => import('@/modules/payroll/pages/LeaveRequestsPage'));
const AdvanceRequestsPage = lazy(() => import('@/modules/payroll/pages/AdvanceRequestsPage'));
const StatementsListPage = lazy(() => import('@/modules/payroll/pages/StatementsListPage'));
const WorkerStatementsListPage = lazy(() => import('@/modules/payroll/pages/WorkerStatementsListPage'));
const WorkerStatementFormPage = lazy(() => import('@/modules/payroll/pages/WorkerStatementFormPage'));
const WorkerStatementDetailPage = lazy(() => import('@/modules/payroll/pages/WorkerStatementDetailPage'));
const StatementFormPage = lazy(() => import('@/modules/payroll/pages/StatementFormPage'));
const StatementDetailPage = lazy(() => import('@/modules/payroll/pages/StatementDetailPage'));
const PRListPage = lazy(() => import('@/modules/procurement/pages/PRListPage'));
const PRFormPage = lazy(() => import('@/modules/procurement/pages/PRFormPage'));
const PRDetailPage = lazy(() => import('@/modules/procurement/pages/PRDetailPage'));
const RFQFormPage = lazy(() => import('@/modules/procurement/pages/RFQFormPage'));
const RFQDetailPage = lazy(() => import('@/modules/procurement/pages/RFQDetailPage'));
const POListPage = lazy(() => import('@/modules/procurement/pages/POListPage'));
const POFormPage = lazy(() => import('@/modules/procurement/pages/POFormPage'));
const PODetailPage = lazy(() => import('@/modules/procurement/pages/PODetailPage'));
const PurchaseInvoicesListPage = lazy(() => import('@/modules/procurement/pages/PurchaseInvoicesListPage'));
const PurchaseInvoiceFormPage = lazy(() => import('@/modules/procurement/pages/PurchaseInvoiceFormPage'));
const PurchaseInvoiceDetailPage = lazy(() => import('@/modules/procurement/pages/PurchaseInvoiceDetailPage'));
const SupplierPaymentsPage = lazy(() => import('@/modules/procurement/pages/SupplierPaymentsPage'));
const PermitsPage = lazy(() => import('@/modules/timeline/pages/PermitsPage'));
const InsurancesPage = lazy(() => import('@/modules/timeline/pages/InsurancesPage'));
const GuaranteesPage = lazy(() => import('@/modules/timeline/pages/GuaranteesPage'));
const DocumentsPage = lazy(() => import('@/modules/timeline/pages/DocumentsPage'));
const ChecklistsPage = lazy(() => import('@/modules/timeline/pages/ChecklistsPage'));
const ContractsListPage = lazy(() => import('@/modules/contracts/pages/ContractsListPage'));
const ContractViewPage = lazy(() => import('@/modules/contracts/pages/ContractViewPage'));
const ContractTemplatesPage = lazy(() => import('@/modules/contracts/pages/ContractTemplatesPage'));
const SalesUnitsPage = lazy(() => import('@/modules/sales/pages/SalesUnitsPage'));
const SalesCustomersPage = lazy(() => import('@/modules/sales/pages/SalesCustomersPage'));
const SalesContractsListPage = lazy(() => import('@/modules/sales/pages/SalesContractsListPage'));
const SalesContractFormPage = lazy(() => import('@/modules/sales/pages/SalesContractFormPage'));
const SalesContractDetailPage = lazy(() => import('@/modules/sales/pages/SalesContractDetailPage'));
const SalesInvoicesListPage = lazy(() => import('@/modules/sales/pages/SalesInvoicesListPage'));
const SalesInvoiceFormPage = lazy(() => import('@/modules/sales/pages/SalesInvoiceFormPage'));
const SalesInvoiceDetailPage = lazy(() => import('@/modules/sales/pages/SalesInvoiceDetailPage'));
const SalesReceiptsPage = lazy(() => import('@/modules/sales/pages/SalesReceiptsPage'));
const ARAgingDetailPage = lazy(() => import('@/modules/accounting/pages/ARAgingDetailPage'));
const PartyLedgerPage = lazy(() => import('@/modules/accounting/pages/PartyLedgerPage'));
const ProjectLedgerPage = lazy(() => import('@/modules/accounting/pages/ProjectLedgerPage'));
const ARAgingPage = lazy(() => import('@/modules/accounting/pages/ARAgingPage'));
const APAgingPage = lazy(() => import('@/modules/accounting/pages/APAgingPage'));
const ProfitLossPage = lazy(() => import('@/modules/accounting/pages/ProfitLossPage'));
const AccountingBalanceSheetPage = lazy(() => import('@/modules/accounting/pages/BalanceSheetPage'));
const DetailedTrialBalancePage = lazy(() => import('@/modules/accounting/pages/DetailedTrialBalancePage'));
const AccountMappingsPage = lazy(() => import('@/modules/accounting/pages/AccountMappingsPage'));
const CostCentersPage = lazy(() => import('@/modules/accounting/pages/CostCentersPage'));
const BankAccountsPage = lazy(() => import('@/modules/accounting/pages/BankAccountsPage'));
const ChequesPage = lazy(() => import('@/modules/accounting/pages/ChequesPage'));
const FixedAssetsPage = lazy(() => import('@/modules/accounting/pages/FixedAssetsPage'));
const DepreciationRunPage = lazy(() => import('@/modules/accounting/pages/DepreciationRunPage'));
const FixedAssetsReportsPage = lazy(() => import('@/modules/accounting/pages/FixedAssetsReportsPage'));
const CashFlowPage = lazy(() => import('@/modules/accounting/pages/CashFlowPage'));
const VatReportPage = lazy(() => import('@/modules/accounting/pages/VatReportPage'));
const BudgetVsActualPage = lazy(() => import('@/modules/accounting/pages/BudgetVsActualPage'));
const APAgingDetailPage = lazy(() => import('@/modules/accounting/pages/APAgingDetailPage'));
const ProfilePage = lazy(() => import('@/modules/settings/pages/ProfilePage'));
const WorkflowsGuidePage = lazy(() => import('@/modules/help/pages/WorkflowsGuidePage'));
// Equipment
const EquipmentListPage    = lazy(() => import('@/modules/equipment/pages/EquipmentListPage'));
const EquipmentFormPage    = lazy(() => import('@/modules/equipment/pages/EquipmentFormPage'));
const EquipmentDetailPage  = lazy(() => import('@/modules/equipment/pages/EquipmentDetailPage'));
const DailyLogsListPage    = lazy(() => import('@/modules/equipment/pages/DailyLogsListPage'));
const DailyLogFormPage     = lazy(() => import('@/modules/equipment/pages/DailyLogFormPage'));
const MaintenanceListPage  = lazy(() => import('@/modules/equipment/pages/MaintenanceListPage'));
const MaintenanceFormPage  = lazy(() => import('@/modules/equipment/pages/MaintenanceFormPage'));
const EquipmentReportPage  = lazy(() => import('@/modules/equipment/pages/EquipmentReportPage'));
const PriceListsPage       = lazy(() => import('@/modules/price-list/pages/PriceListsPage'));
const PriceListFormPage    = lazy(() => import('@/modules/price-list/pages/PriceListFormPage'));
const PriceListDetailPage  = lazy(() => import('@/modules/price-list/pages/PriceListDetailPage'));
const WbsBoqMapperPage     = lazy(() => import('@/modules/price-list/pages/WbsBoqMapperPage'));

// Overhead (تسهیم سربار)
const OverheadListPage   = lazy(() => import('@/modules/overhead/pages/OverheadListPage'));
const OverheadFormPage   = lazy(() => import('@/modules/overhead/pages/OverheadFormPage'));
const OverheadDetailPage = lazy(() => import('@/modules/overhead/pages/OverheadDetailPage'));

// Client Statement (صورت‌وضعیت کارفرما)
const ClientStatementsListPage   = lazy(() => import('@/modules/client-statement/pages/ClientStatementsListPage'));
const ClientStatementFormPage   = lazy(() => import('@/modules/client-statement/pages/ClientStatementFormPage'));
const ClientStatementDetailPage = lazy(() => import('@/modules/client-statement/pages/ClientStatementDetailPage'));

// WIP
const WipReportPage = lazy(() => import('@/modules/wip/pages/WipReportPage'));
const SCurvePage    = lazy(() => import('@/modules/wip/pages/SCurvePage'));

// Advanced Ledger
const AdvancedLedgerPage = lazy(() => import('@/modules/accounting/pages/AdvancedLedgerPage'));

// Adjustment & Material Price Diff
const AdjustmentIndicesListPage   = lazy(() => import('@/modules/adjustment/pages/AdjustmentIndicesListPage'));
const AdjustmentIndexFormPage     = lazy(() => import('@/modules/adjustment/pages/AdjustmentIndexFormPage'));
const AdjustmentsListPage         = lazy(() => import('@/modules/adjustment/pages/AdjustmentsListPage'));
const AdjustmentCalculatePage     = lazy(() => import('@/modules/adjustment/pages/AdjustmentCalculatePage'));
const AdjustmentDetailPage        = lazy(() => import('@/modules/adjustment/pages/AdjustmentDetailPage'));
const MaterialPriceDiffListPage   = lazy(() => import('@/modules/adjustment/pages/MaterialPriceDiffListPage'));
const MaterialPriceDiffFormPage   = lazy(() => import('@/modules/adjustment/pages/MaterialPriceDiffFormPage'));
const MaterialPriceDiffDetailPage = lazy(() => import('@/modules/adjustment/pages/MaterialPriceDiffDetailPage'));

// Tax Reports
const TaxReportsPage = lazy(() => import('@/modules/tax-reports/pages/TaxReportsPage'));

// Operational Reports
const OperationalReportsPage = lazy(() => import('@/modules/operational-reports/pages/OperationalReportsPage'));

// Data I/O
const DataIoPage = lazy(() => import('@/modules/data-io/pages/DataIoPage'));

// Inventory Count & Transfer
const InventoryCountsListPage   = lazy(() => import('@/modules/inventory-count/pages/InventoryCountsListPage'));
const InventoryCountNewPage    = lazy(() => import('@/modules/inventory-count/pages/InventoryCountNewPage'));
const InventoryCountDetailPage = lazy(() => import('@/modules/inventory-count/pages/InventoryCountDetailPage'));
const TransfersListPage        = lazy(() => import('@/modules/inventory-count/pages/TransfersListPage'));
const TransferFormPage         = lazy(() => import('@/modules/inventory-count/pages/TransferFormPage'));
const TransferDetailPage       = lazy(() => import('@/modules/inventory-count/pages/TransferDetailPage'));

// Material Report
const MaterialConsumptionPage = lazy(() => import('@/modules/material-report/pages/MaterialConsumptionPage'));
const WbsUnitCostPage        = lazy(() => import('@/modules/material-report/pages/WbsUnitCostPage'));
const AuditTrailPage = lazy(() => import('@/modules/audit/pages/AuditTrailPage'));
const BackupPage = lazy(() => import('@/modules/backup/pages/BackupPage'));
const NotificationsPage = lazy(() => import('@/modules/notifications/pages/NotificationsPage'));
const RecycleBinPage = lazy(() => import('@/modules/recycle-bin/pages/RecycleBinPage'));

export default function AppRouter() {
  return (
    <Suspense fallback={<div style={{minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>در حال بارگذاری...</div>}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ExecutiveDashboardPage />} />
        <Route path="/reports" element={<ReportsHubPage />} />
        <Route path="/reports/project" element={<ProjectReportsPickerPage />} />
        <Route path="/reports/project/:id" element={<ProjectReportsPage />} />

        {/* Directory */}
        <Route path="/directory" element={<PartnersListPage />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />}>
          <Route path="dashboard" element={<ProjectDashboardTab />} />
          <Route index element={<ProjectInfoTab />} />
          <Route path="contracts" element={<ContractsTab />} />
          <Route path="wbs" element={<WbsTab />} />
          <Route path="budgets" element={<BudgetsTab />} />
        </Route>
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/projects/:projectId/contracts/new" element={<ContractFormPage />} />
        <Route path="/projects/:projectId/contracts/:contractId/edit" element={<ContractFormPage />} />

        {/* Accounting */}
        <Route path="/accounting/accounts" element={<ChartOfAccountsPage />} />
        <Route path="/accounting/journals" element={<JournalsListPage />} />
        <Route path="/accounting/journals/new" element={<JournalFormPage />} />
        <Route path="/accounting/journals/:id" element={<JournalViewPage />} />
        <Route path="/accounting/journals/:id/edit" element={<JournalFormPage />} />
        <Route path="/accounting/trial-balance" element={<TrialBalancePage />} />
        <Route path="/accounting/reports/party-ledger" element={<PartyLedgerPage />} />
        <Route path="/accounting/reports/project-ledger" element={<ProjectLedgerPage />} />
        <Route path="/accounting/reports/ar-aging" element={<ARAgingPage />} />
        <Route path="/accounting/reports/ap-aging" element={<APAgingPage />} />
        <Route path="/accounting/reports/profit-loss" element={<ProfitLossPage />} />
        <Route path="/accounting/reports/balance-sheet" element={<AccountingBalanceSheetPage />} />
        <Route path="/accounting/reports/detailed-trial-balance" element={<DetailedTrialBalancePage />} />
        <Route path="/accounting/advanced-ledger" element={<AdvancedLedgerPage />} />

        {/* Adjustment Indices */}
        <Route path="/adjustment-indices" element={<AdjustmentIndicesListPage />} />
        <Route path="/adjustment-indices/new" element={<AdjustmentIndexFormPage />} />
        <Route path="/adjustment-indices/:id/edit" element={<AdjustmentIndexFormPage />} />

        {/* Adjustment Calculations */}
        <Route path="/adjustments" element={<AdjustmentsListPage />} />
        <Route path="/adjustments/new" element={<AdjustmentCalculatePage />} />
        <Route path="/adjustments/:id" element={<AdjustmentDetailPage />} />

        {/* Material Price Diffs */}
        <Route path="/material-price-diffs" element={<MaterialPriceDiffListPage />} />
        <Route path="/material-price-diffs/new" element={<MaterialPriceDiffFormPage />} />
        <Route path="/material-price-diffs/:id" element={<MaterialPriceDiffDetailPage />} />

        {/* Tax Reports */}
        <Route path="/tax-reports" element={<TaxReportsPage />} />
        <Route path="/operational-reports" element={<OperationalReportsPage />} />
        <Route path="/accounting/journal-book" element={<JournalBookPage />} />
        <Route path="/accounting/mappings" element={<AccountMappingsPage />} />
        <Route path="/accounting/cost-centers" element={<CostCentersPage />} />
        <Route path="/accounting/banks" element={<BankAccountsPage />} />
        <Route path="/accounting/cheques" element={<ChequesPage />} />
        <Route path="/accounting/fixed-assets" element={<FixedAssetsPage />} />
        <Route path="/accounting/depreciation-run" element={<DepreciationRunPage />} />
        <Route path="/accounting/reports/fixed-assets" element={<FixedAssetsReportsPage />} />
        <Route path="/accounting/reports/cash-flow" element={<CashFlowPage />} />
        <Route path="/accounting/reports/vat" element={<VatReportPage />} />
        <Route path="/accounting/reports/budget-vs-actual" element={<BudgetVsActualPage />} />
        <Route path="/accounting/reports/ap-aging-detail" element={<APAgingDetailPage />} />

        {/* Petty Cash */}
        <Route path="/petty-cash" element={<PettyCashAccountsPage />} />
        <Route path="/petty-cash/:id" element={<PettyCashDetailPage />} />

        {/* Approvals */}
        <Route path="/approvals" element={<ApprovalsPage />} />

        {/* Procurement */}
        <Route path="/procurement/requests" element={<PRListPage />} />
        <Route path="/procurement/requests/new" element={<PRFormPage />} />
        <Route path="/procurement/requests/:id" element={<PRDetailPage />} />
        <Route path="/procurement/requests/:id/edit" element={<PRFormPage />} />
        <Route path="/procurement/rfqs/new" element={<RFQFormPage />} />
        <Route path="/procurement/rfqs/:id" element={<RFQDetailPage />} />
        <Route path="/procurement/orders" element={<POListPage />} />
        <Route path="/procurement/orders/new" element={<POFormPage />} />
        <Route path="/procurement/orders/:id" element={<PODetailPage />} />
        <Route path="/procurement/orders/:id/edit" element={<POFormPage />} />
        {/* Purchase Invoices & Payments */}
        <Route path="/procurement/invoices" element={<PurchaseInvoicesListPage />} />
        <Route path="/procurement/invoices/new" element={<PurchaseInvoiceFormPage />} />
        <Route path="/procurement/invoices/:id" element={<PurchaseInvoiceDetailPage />} />
        <Route path="/procurement/invoices/:id/edit" element={<PurchaseInvoiceFormPage />} />
        <Route path="/procurement/supplier-payments" element={<SupplierPaymentsPage />} />

        {/* Warehouse */}
        <Route path="/warehouse/warehouses" element={<WarehousesListPage />} />
        <Route path="/warehouse/categories" element={<CategoriesPage />} />
        <Route path="/warehouse/items" element={<ItemsPage />} />
        <Route path="/warehouse/receipts" element={<ReceiptsListPage />} />
        <Route path="/warehouse/receipts/new" element={<ReceiptFormPage />} />
        <Route path="/warehouse/receipts/:id" element={<ReceiptDetailPage />} />
        <Route path="/warehouse/receipts/:id/edit" element={<ReceiptFormPage />} />
        <Route path="/warehouse/issues" element={<IssuesListPage />} />
        <Route path="/warehouse/issues/new" element={<IssueFormPage />} />
        <Route path="/warehouse/issues/:id/edit" element={<IssueFormPage />} />
        <Route path="/warehouse/kardex" element={<KardexPage />} />

        {/* Site Operations */}
        <Route path="/site-ops/daily-reports" element={<DailyReportsListPage />} />
        <Route path="/site-ops/daily-reports/new" element={<DailyReportFormPage />} />
        <Route path="/site-ops/daily-reports/:id" element={<DailyReportDetailPage />} />
        <Route path="/site-ops/daily-reports/:id/edit" element={<DailyReportFormPage />} />
        <Route path="/site-ops/failed-forwardings" element={<FailedForwardingsPage />} />

        {/* Payroll */}
        <Route path="/payroll/employees" element={<EmployeesListPage />} />
        <Route path="/payroll/employees/:id/card" element={<EmployeeCardPage />} />
        <Route path="/payroll/periods" element={<PayrollPeriodsPage />} />
        <Route path="/payroll/periods/:id" element={<PayrollPeriodDetailPage />} />
        <Route path="/payroll/attendance" element={<AttendancePage />} />
        <Route path="/payroll/work-logs" element={<WorkLogsPage />} />
        <Route path="/payroll/leave-requests" element={<LeaveRequestsPage />} />
        <Route path="/payroll/advance-requests" element={<AdvanceRequestsPage />} />
        <Route path="/payroll/subcontractor-statements" element={<StatementsListPage />} />
        <Route path="/payroll/subcontractor-statements/new" element={<StatementFormPage />} />
        <Route path="/payroll/subcontractor-statements/:id" element={<StatementDetailPage />} />
        <Route path="/payroll/subcontractor-statements/:id/edit" element={<StatementFormPage />} />
        <Route path="/payroll/worker-statements" element={<WorkerStatementsListPage />} />
        <Route path="/payroll/worker-statements/new" element={<WorkerStatementFormPage />} />
        <Route path="/payroll/worker-statements/:id" element={<WorkerStatementDetailPage />} />
        <Route path="/payroll/worker-statements/:id/edit" element={<WorkerStatementFormPage />} />

        {/* Settings */}
        <Route path="/settings/users" element={<UsersPage />} />
        <Route path="/settings/roles" element={<RolesPage />} />
        <Route path="/settings/units" element={<UnitsPage />} />
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/fiscal-years" element={<FiscalYearsPage />} />
        <Route path="/settings/period-lock" element={<PeriodLockPage />} />

        {/* Overhead Allocation */}
        <Route path="/overhead-allocations" element={<OverheadListPage />} />
        <Route path="/overhead-allocations/new" element={<OverheadFormPage />} />
        <Route path="/overhead-allocations/:id" element={<OverheadDetailPage />} />

        {/* Client Statement */}
        <Route path="/client-statements" element={<ClientStatementsListPage />} />
        <Route path="/client-statements/new" element={<ClientStatementFormPage />} />
        <Route path="/client-statements/:id" element={<ClientStatementDetailPage />} />
        <Route path="/client-statements/:id/edit" element={<ClientStatementFormPage />} />

        {/* WIP */}
        <Route path="/wip" element={<WipReportPage />} />
        <Route path="/wip/s-curve/:id" element={<SCurvePage />} />

        {/* Data I/O */}
        <Route path="/data-io" element={<DataIoPage />} />

        {/* Material Report */}
        <Route path="/material-report/consumption" element={<MaterialConsumptionPage />} />
        <Route path="/material-report/unit-cost" element={<WbsUnitCostPage />} />

        {/* Inventory Count */}
        <Route path="/inventory-counts" element={<InventoryCountsListPage />} />
        <Route path="/inventory-counts/new" element={<InventoryCountNewPage />} />
        <Route path="/inventory-counts/:id" element={<InventoryCountDetailPage />} />

        {/* Warehouse Transfer */}
        <Route path="/warehouse-transfers" element={<TransfersListPage />} />
        <Route path="/warehouse-transfers/new" element={<TransferFormPage />} />
        <Route path="/warehouse-transfers/:id" element={<TransferDetailPage />} />
        <Route path="/warehouse-transfers/:id/edit" element={<TransferFormPage />} />
        <Route path="/help/workflows" element={<WorkflowsGuidePage />} />

        {/* Partner Capital */}
        <Route path="/partner-capital/accounts" element={<CapitalAccountsPage />} />
        <Route path="/partner-capital/contributions" element={<ContributionsPage />} />
        <Route path="/partner-capital/withdrawals" element={<WithdrawalsPage />} />
        <Route path="/partner-capital/shares" element={<SharesPage />} />
        <Route path="/partner-capital/balance-sheet" element={<BalanceSheetPage />} />
        {/* Timeline */}
        <Route path="/timeline/permits" element={<PermitsPage />} />
        <Route path="/timeline/insurances" element={<InsurancesPage />} />
        <Route path="/timeline/guarantees" element={<GuaranteesPage />} />
        <Route path="/timeline/documents" element={<DocumentsPage />} />
        <Route path="/timeline/checklists" element={<ChecklistsPage />} />

        {/* Contracts */}
        <Route path="/contracts" element={<ContractsListPage />} />
        <Route path="/contracts/:id" element={<ContractViewPage />} />
        <Route path="/contracts/templates" element={<ContractTemplatesPage />} />

        {/* Sales */}
        <Route path="/sales/units" element={<SalesUnitsPage />} />
        <Route path="/sales/customers" element={<SalesCustomersPage />} />
        <Route path="/sales/contracts" element={<SalesContractsListPage />} />
        <Route path="/sales/contracts/new" element={<SalesContractFormPage />} />
        <Route path="/sales/contracts/:id/edit" element={<SalesContractFormPage />} />
        <Route path="/sales/contracts/:id" element={<SalesContractDetailPage />} />
        {/* Sales Invoices & Receipts */}
        <Route path="/sales/invoices" element={<SalesInvoicesListPage />} />
        <Route path="/sales/invoices/new" element={<SalesInvoiceFormPage />} />
        <Route path="/sales/invoices/:id" element={<SalesInvoiceDetailPage />} />
        <Route path="/sales/receipts" element={<SalesReceiptsPage />} />
        <Route path="/accounting/reports/ar-aging-detail" element={<ARAgingDetailPage />} />
        {/* Equipment - ماشین‌آلات و تجهیزات */}
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/new" element={<EquipmentFormPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />
        <Route path="/equipment/logs" element={<DailyLogsListPage />} />
        <Route path="/equipment/logs/new" element={<DailyLogFormPage />} />
        <Route path="/equipment/maintenances" element={<MaintenanceListPage />} />
        <Route path="/equipment/maintenances/new" element={<MaintenanceFormPage />} />
        <Route path="/equipment/reports/usage" element={<EquipmentReportPage />} />
                {/* Price List (BOQ) */}
        <Route path="/price-lists" element={<PriceListsPage />} />
        <Route path="/price-lists/new" element={<PriceListFormPage />} />
        <Route path="/price-lists/:id" element={<PriceListDetailPage />} />
        <Route path="/price-lists/:id/edit" element={<PriceListFormPage />} />
        <Route path="/projects/:projectId/boq-mapping" element={<WbsBoqMapperPage />} />
        <Route path="/audit" element={<AuditTrailPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/recycle-bin" element={<RecycleBinPage />} />
      </Route>


      <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </Suspense>
  );
}
