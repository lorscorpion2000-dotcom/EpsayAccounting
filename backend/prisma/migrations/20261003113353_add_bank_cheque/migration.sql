-- CreateEnum
CREATE TYPE "ChequeDirection" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'PASSED', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "bank_name" VARCHAR(200),
    "branch_name" VARCHAR(200),
    "account_number" VARCHAR(64),
    "shaba_number" VARCHAR(64),
    "gl_account_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheques" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "direction" "ChequeDirection" NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "serial" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "description" VARCHAR(500),
    "bank_account_id" UUID,
    "partner_id" UUID,
    "project_id" UUID,
    "issued_journal_entry_id" UUID,
    "settled_journal_entry_id" UUID,
    "passed_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "note" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_code_key" ON "bank_accounts"("code");

-- CreateIndex
CREATE INDEX "bank_accounts_is_active_idx" ON "bank_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_code_key" ON "cheques"("code");

-- CreateIndex
CREATE INDEX "cheques_direction_idx" ON "cheques"("direction");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_due_date_idx" ON "cheques"("due_date");

-- CreateIndex
CREATE INDEX "cheques_partner_id_idx" ON "cheques"("partner_id");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_issued_journal_entry_id_fkey" FOREIGN KEY ("issued_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_settled_journal_entry_id_fkey" FOREIGN KEY ("settled_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
