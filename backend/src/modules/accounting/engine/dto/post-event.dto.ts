export interface PostEventPayload {
  amount: number | string;
  entryDate: string | Date;
  description?: string;
  reference?: string;

  // ─── context for auto-resolve ───
  partnerId?: string;
  projectId?: string;
  pettyCashId?: string;
  salesCustomerId?: string;
  bankAccountId?: string;

  // ─── explicit detail overrides ───
  debitDetailId?: string;
  creditDetailId?: string;

  userId?: string;
  sourceId?: string;
  // ─── explicit GL account override (بدون نیاز به detail) ───
  debitAccountId?: string;
  creditAccountId?: string;

  // B3.a: auto-post JE inside the caller's transaction
  autoPost?: boolean;

}
