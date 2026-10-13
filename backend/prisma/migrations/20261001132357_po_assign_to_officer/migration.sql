/*
  Warnings:

  - You are about to drop the column `employee_id` on the `petty_cash_accounts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "petty_cash_accounts" DROP CONSTRAINT "petty_cash_accounts_employee_id_fkey";

-- AlterTable
ALTER TABLE "petty_cash_accounts" DROP COLUMN "employee_id";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "purchasing_officer_id" UUID;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_to_id" UUID;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_purchasing_officer_id_fkey" FOREIGN KEY ("purchasing_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
