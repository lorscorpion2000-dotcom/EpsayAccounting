export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'CANCELLED';
export type ExpensePayFromType = 'BANK' | 'CASH' | 'PETTY_CASH';

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  accountId: string | null;
  account?: { id: string; code: string; name: string } | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { expenses: number; children: number };
  children?: ExpenseCategory[];
}

export interface Expense {
  id: string;
  code: string;
  expenseDate: string;
  categoryId: string;
  category?: { id: string; code: string; name: string };
  projectId: string | null;
  project?: { id: string; code: string; name: string } | null;
  wbsItemId: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  costCenterId: string | null;
  costCenter?: { id: string; code: string; name: string } | null;
  supplierId: string | null;
  supplier?: { id: string; code: string; name: string } | null;
  amount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  description: string;
  payFromType: ExpensePayFromType;
  payFromAccountId: string;
  payFromAccount?: { id: string; code: string; name: string };
  expenseAccountId: string;
  expenseAccount?: { id: string; code: string; name: string };
  status: ExpenseStatus;
  approvedById: string | null;
  approvedBy?: { id: string; fullName: string } | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  journalEntryId: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  attachmentUrl: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateExpensePayload {
  expenseDate: string;
  categoryId: string;
  projectId?: string | null;
  wbsItemId?: string | null;
  costCenterId?: string | null;
  supplierId?: string | null;
  amount: number;
  taxAmount?: number;
  description: string;
  payFromType: ExpensePayFromType;
  payFromAccountId: string;
  expenseAccountId: string;
  attachmentUrl?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
}
