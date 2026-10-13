-- CreateEnum
CREATE TYPE "PettyCashTxType" AS ENUM ('FUNDING', 'EXPENSE', 'SETTLEMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PettyCashTxStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PettyCashRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "petty_cash_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "holder_id" UUID NOT NULL,
    "project_id" UUID,
    "ceiling_per_tx" DECIMAL(20,2) NOT NULL DEFAULT 200000000,
    "weekly_limit" DECIMAL(20,2) NOT NULL DEFAULT 300000000,
    "balance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_transactions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "type" "PettyCashTxType" NOT NULL,
    "status" "PettyCashTxStatus" NOT NULL DEFAULT 'DRAFT',
    "tx_date" DATE NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "recipient" VARCHAR(200),
    "category" VARCHAR(100),
    "invoice_number" VARCHAR(64),
    "invoice_image" VARCHAR(500),
    "project_id" UUID,
    "wbs_item_id" UUID,
    "partner_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_requests" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "request_date" DATE NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "current_balance" DECIMAL(20,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "iban" VARCHAR(32),
    "status" "PettyCashRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_accounts_code_key" ON "petty_cash_accounts"("code");

-- CreateIndex
CREATE INDEX "petty_cash_accounts_holder_id_idx" ON "petty_cash_accounts"("holder_id");

-- CreateIndex
CREATE INDEX "petty_cash_accounts_project_id_idx" ON "petty_cash_accounts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_transactions_code_key" ON "petty_cash_transactions"("code");

-- CreateIndex
CREATE INDEX "petty_cash_transactions_account_id_idx" ON "petty_cash_transactions"("account_id");

-- CreateIndex
CREATE INDEX "petty_cash_transactions_tx_date_idx" ON "petty_cash_transactions"("tx_date");

-- CreateIndex
CREATE INDEX "petty_cash_transactions_status_idx" ON "petty_cash_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_requests_code_key" ON "petty_cash_requests"("code");

-- CreateIndex
CREATE INDEX "petty_cash_requests_account_id_idx" ON "petty_cash_requests"("account_id");

-- CreateIndex
CREATE INDEX "petty_cash_requests_status_idx" ON "petty_cash_requests"("status");

-- AddForeignKey
ALTER TABLE "petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "petty_cash_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "petty_cash_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
