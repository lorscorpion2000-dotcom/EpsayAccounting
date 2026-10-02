import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
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
const UsersPage = lazy(() => import('@/modules/settings/pages/UsersPage'));
const RolesPage = lazy(() => import('@/modules/settings/pages/RolesPage'));
const FiscalYearsPage = lazy(() => import('@/modules/settings/pages/FiscalYearsPage'));
const PartnersListPage = lazy(() => import('@/modules/partners/pages/PartnersListPage'));
const ProjectsListPage = lazy(() => import('@/modules/projects/pages/ProjectsListPage'));
const ProjectFormPage = lazy(() => import('@/modules/projects/pages/ProjectFormPage'));
const ProjectDetailPage = lazy(() => import('@/modules/projects/pages/ProjectDetailPage'));
const ProjectInfoTab = lazy(() => import('@/modules/projects/pages/ProjectInfoTab'));
const ContractsTab = lazy(() => import('@/modules/projects/pages/ContractsTab'));
const ContractFormPage = lazy(() => import('@/modules/projects/pages/ContractFormPage'));
const WbsTab = lazy(() => import('@/modules/projects/pages/WbsTab'));
const BudgetsTab = lazy(() => import('@/modules/projects/pages/BudgetsTab'));
const ChartOfAccountsPage = lazy(() => import('@/modules/accounting/pages/ChartOfAccountsPage'));
const JournalsListPage = lazy(() => import('@/modules/accounting/pages/JournalsListPage'));
const JournalFormPage = lazy(() => import('@/modules/accounting/pages/JournalFormPage'));
const JournalViewPage = lazy(() => import('@/modules/accounting/pages/JournalViewPage'));
const TrialBalancePage = lazy(() => import('@/modules/accounting/pages/TrialBalancePage'));
const LedgerPage = lazy(() => import('@/modules/accounting/pages/LedgerPage'));
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
const EmployeesListPage = lazy(() => import('@/modules/payroll/pages/EmployeesListPage'));
const PayrollPeriodsPage = lazy(() => import('@/modules/payroll/pages/PayrollPeriodsPage'));
const PayrollPeriodDetailPage = lazy(() => import('@/modules/payroll/pages/PayrollPeriodDetailPage'));
const AttendancePage = lazy(() => import('@/modules/payroll/pages/AttendancePage'));
const WorkLogsPage = lazy(() => import('@/modules/payroll/pages/WorkLogsPage'));
const LeaveRequestsPage = lazy(() => import('@/modules/payroll/pages/LeaveRequestsPage'));
const AdvanceRequestsPage = lazy(() => import('@/modules/payroll/pages/AdvanceRequestsPage'));
const StatementsListPage = lazy(() => import('@/modules/payroll/pages/StatementsListPage'));
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
const PartyLedgerPage = lazy(() => import('@/modules/accounting/pages/PartyLedgerPage'));
const ProjectLedgerPage = lazy(() => import('@/modules/accounting/pages/ProjectLedgerPage'));
const ARAgingPage = lazy(() => import('@/modules/accounting/pages/ARAgingPage'));
const APAgingPage = lazy(() => import('@/modules/accounting/pages/APAgingPage'));
const ProfitLossPage = lazy(() => import('@/modules/accounting/pages/ProfitLossPage'));
const AccountingBalanceSheetPage = lazy(() => import('@/modules/accounting/pages/BalanceSheetPage'));
const DetailedTrialBalancePage = lazy(() => import('@/modules/accounting/pages/DetailedTrialBalancePage'));
const ProfilePage = lazy(() => import('@/modules/settings/pages/ProfilePage'));
const WorkflowsGuidePage = lazy(() => import('@/modules/help/pages/WorkflowsGuidePage'));

export default function AppRouter() {
  return (
    <Suspense fallback={<div style={{minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>در حال بارگذاری...</div>}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsHubPage />} />

        {/* Directory */}
        <Route path="/directory" element={<PartnersListPage />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />}>
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
        <Route path="/accounting/ledger" element={<LedgerPage />} />
        <Route path="/accounting/journal-book" element={<JournalBookPage />} />

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

        {/* Payroll */}
        <Route path="/payroll/employees" element={<EmployeesListPage />} />
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

        {/* Settings */}
        <Route path="/settings/users" element={<UsersPage />} />
        <Route path="/settings/roles" element={<RolesPage />} />
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/fiscal-years" element={<FiscalYearsPage />} />
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
      </Route>


      <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </Suspense>
  );
}
