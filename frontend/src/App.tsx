import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppRouter from './app/router';
import { useAuthStore } from './store/auth.store';
import { HelpProvider } from '@/modules/help/components/HelpProvider';
import { useThemeStore } from '@/store/theme.store';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // راه‌اندازی پوسته رنگی
    useThemeStore.getState().init();

    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return (
    <HelpProvider>
      <AppRouter />
    </HelpProvider>
  );
}