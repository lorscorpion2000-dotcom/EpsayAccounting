-- AlterTable
ALTER TABLE "adjustment_calculations" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;
