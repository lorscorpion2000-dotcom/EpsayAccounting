-- CreateEnum
CREATE TYPE "CapitalContributionType" AS ENUM ('CASH', 'NON_CASH');

-- CreateEnum
CREATE TYPE "CapitalContributionCategory" AS ENUM ('CASH_DEPOSIT', 'BANK_TRANSFER', 'PETTY_CASH', 'LAND', 'MATERIALS', 'SERVICES', 'EQUIPMENT', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "CapitalTransactionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "project_partner_shares" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "share_percent" DECIMAL(5,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_partner_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_capital_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "partner_id" UUID NOT NULL,
    "project_id" UUID,
    "balance" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_capital_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_capital_contributions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "account_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "project_id" UUID,
    "type" "CapitalContributionType" NOT NULL DEFAULT 'CASH',
    "category" "CapitalContributionCategory" NOT NULL DEFAULT 'CASH_DEPOSIT',
    "amount" DECIMAL(24,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'IRR',
    "contribution_date" DATE NOT NULL,
    "description" VARCHAR(500),
    "valuation_notes" VARCHAR(500),
    "reference_code" VARCHAR(64),
    "status" "CapitalTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_capital_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_capital_withdrawals" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "account_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "project_id" UUID,
    "amount" DECIMAL(24,2) NOT NULL,
    "withdrawal_date" DATE NOT NULL,
    "reason" VARCHAR(500),
    "target_project_id" UUID,
    "transfer_to_contribution" BOOLEAN NOT NULL DEFAULT false,
    "status" "CapitalTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_capital_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_partner_shares_project_id_idx" ON "project_partner_shares"("project_id");

-- CreateIndex
CREATE INDEX "project_partner_shares_partner_id_idx" ON "project_partner_shares"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_capital_accounts_code_key" ON "partner_capital_accounts"("code");

-- CreateIndex
CREATE INDEX "partner_capital_accounts_partner_id_idx" ON "partner_capital_accounts"("partner_id");

-- CreateIndex
CREATE INDEX "partner_capital_accounts_project_id_idx" ON "partner_capital_accounts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_capital_accounts_partner_id_project_id_key" ON "partner_capital_accounts"("partner_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_capital_contributions_code_key" ON "partner_capital_contributions"("code");

-- CreateIndex
CREATE INDEX "partner_capital_contributions_account_id_idx" ON "partner_capital_contributions"("account_id");

-- CreateIndex
CREATE INDEX "partner_capital_contributions_partner_id_idx" ON "partner_capital_contributions"("partner_id");

-- CreateIndex
CREATE INDEX "partner_capital_contributions_project_id_idx" ON "partner_capital_contributions"("project_id");

-- CreateIndex
CREATE INDEX "partner_capital_contributions_status_idx" ON "partner_capital_contributions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partner_capital_withdrawals_code_key" ON "partner_capital_withdrawals"("code");

-- CreateIndex
CREATE INDEX "partner_capital_withdrawals_account_id_idx" ON "partner_capital_withdrawals"("account_id");

-- CreateIndex
CREATE INDEX "partner_capital_withdrawals_partner_id_idx" ON "partner_capital_withdrawals"("partner_id");

-- CreateIndex
CREATE INDEX "partner_capital_withdrawals_project_id_idx" ON "partner_capital_withdrawals"("project_id");

-- CreateIndex
CREATE INDEX "partner_capital_withdrawals_status_idx" ON "partner_capital_withdrawals"("status");

-- AddForeignKey
ALTER TABLE "project_partner_shares" ADD CONSTRAINT "project_partner_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_partner_shares" ADD CONSTRAINT "project_partner_shares_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_accounts" ADD CONSTRAINT "partner_capital_accounts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_accounts" ADD CONSTRAINT "partner_capital_accounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_contributions" ADD CONSTRAINT "partner_capital_contributions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "partner_capital_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_contributions" ADD CONSTRAINT "partner_capital_contributions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_withdrawals" ADD CONSTRAINT "partner_capital_withdrawals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "partner_capital_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_withdrawals" ADD CONSTRAINT "partner_capital_withdrawals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
