import { api } from '@/services/api';
import type { JournalDeletionLog } from '@/types/journal-deletion';

export const journalDeletionApi = {
  list: (limit = 100) =>
    api.get<JournalDeletionLog[]>('/journals/deletions', { params: { limit } })
      .then((r) => r.data),
};
