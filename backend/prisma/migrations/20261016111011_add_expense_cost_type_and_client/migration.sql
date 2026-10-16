-- CreateEnum
CREATE TYPE "ExpenseCostType" AS ENUM ('COMPANY', 'CLIENT_PASS_THROUGH');

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_pay_from_account_id_fkey";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "client_id" UUID,
ADD COLUMN     "cost_type" "ExpenseCostType" NOT NULL DEFAULT 'COMPANY',
ALTER COLUMN "pay_from_type" DROP NOT NULL,
ALTER COLUMN "pay_from_account_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_pay_from_account_id_fkey" FOREIGN KEY ("pay_from_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
