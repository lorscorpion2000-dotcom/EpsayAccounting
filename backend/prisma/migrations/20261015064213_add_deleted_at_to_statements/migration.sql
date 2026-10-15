-- AlterTable
ALTER TABLE "client_statements" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "subcontractor_statements" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;
