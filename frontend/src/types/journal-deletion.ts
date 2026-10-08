export interface JournalDeletionLog {
  id: string;
  journalId: string;
  journalNo: string | null;
  journalDate: string | null;
  fiscalYearId: string | null;
  status: string | null;
  description: string | null;
  totalDebit: string | number | null;
  totalCredit: string | number | null;
  linesSnapshot: any;
  journalSnapshot: any;
  reason: string | null;
  deletedBy: string | null;
  deletedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}
