import { api } from '@/services/api';
import type { Expense, ExpenseCategory, CreateExpensePayload } from '@/types/expense';

interface ListParams {
  projectId?: string;
  categoryId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export const expensesApi = {
  list: (params?: ListParams) =>
    api.get<Expense[]>('/expenses', { params }).then((r) => r.data),
  get: (id: string) => api.get<Expense>(`/expenses/${id}`).then((r) => r.data),
  stats: (projectId?: string) =>
    api.get('/expenses/stats', { params: { projectId } }).then((r) => r.data),
  create: (data: CreateExpensePayload) =>
    api.post<Expense>('/expenses', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateExpensePayload>) =>
    api.patch<Expense>(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/expenses/${id}`).then((r) => r.data),
  submit: (id: string) => api.patch(`/expenses/${id}/submit`).then((r) => r.data),
  approve: (id: string) => api.patch(`/expenses/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) =>
    api.patch(`/expenses/${id}/reject`, { reason }).then((r) => r.data),
  cancel: (id: string) => api.patch(`/expenses/${id}/cancel`).then((r) => r.data),
};

export const expenseCategoriesApi = {
  list: (includeInactive = false) =>
    api.get<ExpenseCategory[]>('/expense-categories', { params: { includeInactive } }).then((r) => r.data),
  tree: () => api.get<ExpenseCategory[]>('/expense-categories/tree').then((r) => r.data),
  get: (id: string) => api.get<ExpenseCategory>(`/expense-categories/${id}`).then((r) => r.data),
  create: (data: Partial<ExpenseCategory>) =>
    api.post<ExpenseCategory>('/expense-categories', data).then((r) => r.data),
  update: (id: string, data: Partial<ExpenseCategory>) =>
    api.patch<ExpenseCategory>(`/expense-categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/expense-categories/${id}`).then((r) => r.data),
};
