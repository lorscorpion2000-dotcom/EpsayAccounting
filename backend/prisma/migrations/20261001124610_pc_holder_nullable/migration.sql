-- DropForeignKey
ALTER TABLE "petty_cash_accounts" DROP CONSTRAINT "petty_cash_accounts_holder_id_fkey";

-- AlterTable
ALTER TABLE "petty_cash_accounts" ALTER COLUMN "holder_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
