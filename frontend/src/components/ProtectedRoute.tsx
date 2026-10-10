import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  children: ReactNode;
}

/**
 * F1 — محافظت از مسیرهایی که نیاز به لاگین دارند.
 * اگر کاربر لاگین نباشد، به /login هدایت می‌شود و مسیر فعلی در state ذخیره می‌شود.
 */
export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
