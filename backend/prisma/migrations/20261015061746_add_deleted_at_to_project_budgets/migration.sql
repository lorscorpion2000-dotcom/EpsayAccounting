-- AlterTable
ALTER TABLE "project_budgets" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;
