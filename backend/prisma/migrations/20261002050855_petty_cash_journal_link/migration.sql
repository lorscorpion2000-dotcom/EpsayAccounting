-- AlterTable
ALTER TABLE "petty_cash_accounts" ADD COLUMN     "account_id" UUID;

-- AlterTable
ALTER TABLE "petty_cash_transactions" ADD COLUMN     "journal_entry_id" UUID;

-- AddForeignKey
ALTER TABLE "petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
