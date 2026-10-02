// این فایل برای اطلاع شما ساخته می‌شود
// راهنمای استفاده در فایل router اصلی در پیام توضیح داده شده است
import CapitalAccountsPage from './pages/CapitalAccountsPage';
import ContributionsPage from './pages/ContributionsPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import SharesPage from './pages/SharesPage';
import BalanceSheetPage from './pages/BalanceSheetPage';

export const partnerCapitalRoutes = [
  { path: 'partner-capital/accounts', Component: CapitalAccountsPage },
  { path: 'partner-capital/contributions', Component: ContributionsPage },
  { path: 'partner-capital/withdrawals', Component: WithdrawalsPage },
  { path: 'partner-capital/shares', Component: SharesPage },
  { path: 'partner-capital/balance-sheet', Component: BalanceSheetPage },
];
