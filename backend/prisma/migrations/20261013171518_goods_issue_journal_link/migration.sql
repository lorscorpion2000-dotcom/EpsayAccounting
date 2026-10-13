-- AlterTable
ALTER TABLE "goods_issues" ADD COLUMN     "journal_entry_id" UUID;

-- AddForeignKey
ALTER TABLE "goods_issues" ADD CONSTRAINT "goods_issues_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
