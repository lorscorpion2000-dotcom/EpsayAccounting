-- AlterTable
ALTER TABLE "client_statements" ADD COLUMN     "pass_through_amount" DECIMAL(24,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "pass_through_closed_in_statement_id" UUID;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_pass_through_closed_in_statement_id_fkey" FOREIGN KEY ("pass_through_closed_in_statement_id") REFERENCES "client_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
