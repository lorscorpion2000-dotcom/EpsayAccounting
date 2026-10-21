import { useState, useEffect, useCallback } from 'react';

export interface OfflineDailyReportDraft {
  id: string;
  projectId: string;
  reportDate: string;
  data: any;
  savedAt: string;
  status: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

const STORAGE_KEY = 'epsay_offline_daily_reports';

export function useOfflineDailyReport() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingDrafts, setPendingDrafts] = useState<OfflineDailyReportDraft[]>([]);

  // بارگذاری پیش‌نویس‌های ذخیره‌شده از حافظه محلی
  const loadDrafts = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPendingDrafts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('خطا در خواندن پیش‌نویس‌های آفلاین:', error);
    }
  }, []);

  useEffect(() => {
    loadDrafts();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadDrafts]);

  // ذخیره پیش‌نویس جدید در حالت آفلاین
  const saveDraftLocally = (projectId: string, reportDate: string, reportData: any) => {
    const newDraft: OfflineDailyReportDraft = {
      id: `draft_${Date.now()}`,
      projectId,
      reportDate,
      data: reportData,
      savedAt: new Date().toISOString(),
      status: 'PENDING_SYNC',
    };

    const updated = [...pendingDrafts, newDraft];
    setPendingDrafts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newDraft.id;
  };

  // حذف پیش‌نویس پس از همگام‌سازی موفق
  const removeDraft = (draftId: string) => {
    const updated = pendingDrafts.filter((d) => d.id !== draftId);
    setPendingDrafts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // همگام‌سازی خودکار با بک‌اند هنگام اتصال اینترنت
  const syncPendingDrafts = async (submitApiCall: (data: any) => Promise<any>) => {
    if (!isOnline || pendingDrafts.length === 0) return;

    for (const draft of pendingDrafts) {
      try {
        await submitApiCall(draft.data);
        removeDraft(draft.id);
      } catch (error) {
        console.error(`خطا در همگام‌سازی پیش‌نویس ${draft.id}:`, error);
      }
    }
  };

  return {
    isOnline,
    pendingDrafts,
    saveDraftLocally,
    removeDraft,
    syncPendingDrafts,
  };
}