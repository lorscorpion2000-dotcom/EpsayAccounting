-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_expense_account_id_fkey";

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "expense_account_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
