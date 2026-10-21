import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  onSyncClick?: () => void;
}

export const NetworkStatusBadge: React.FC<Props> = ({ isOnline, pendingCount, onSyncClick }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg text-xs font-medium transition-all" dir="rtl">
      {isOnline ? (
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Wifi className="w-3.5 h-3.5" />
          <span>اتصال برقرار است (برخط)</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>حالت آفلاین (ذخیره‌سازی محلی فعال است)</span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
          <span>{pendingCount} پیش‌نویس منتظر همگام‌سازی</span>
          {isOnline && onSyncClick && (
            <button
              onClick={onSyncClick}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline mr-1"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              همگام‌سازی الان
            </button>
          )}
        </div>
      )}
    </div>
  );
};