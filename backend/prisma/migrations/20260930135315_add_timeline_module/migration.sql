-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('DEMOLITION', 'CONSTRUCTION', 'NO_VIOLATION', 'COMPLETION', 'OTHER');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('PENDING', 'ISSUED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('THIRD_PARTY', 'ACCIDENT', 'FIRE', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "GuaranteeType" AS ENUM ('BANK_GUARANTEE', 'CHECK', 'DEPOSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ARCHITECTURE', 'STRUCTURE', 'MEP', 'SITE_PLAN', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentPhase" AS ENUM ('PHASE_1', 'PHASE_2', 'OTHER');

-- CreateEnum
CREATE TYPE "ChecklistType" AS ENUM ('REBAR_BEFORE_CONCRETE', 'FORMWORK', 'ELECTRICAL', 'PLUMBING', 'WATERPROOFING', 'OTHER');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "permits" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "PermitType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "number" VARCHAR(64),
    "authority" VARCHAR(200),
    "status" "PermitStatus" NOT NULL DEFAULT 'PENDING',
    "issue_date" DATE,
    "expiry_date" DATE,
    "attachment_url" VARCHAR(500),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID,
    "type" "InsuranceType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "insurer" VARCHAR(200),
    "policy_number" VARCHAR(64),
    "coverage_amount" DECIMAL(20,2),
    "premium_amount" DECIMAL(20,2),
    "start_date" DATE,
    "expiry_date" DATE,
    "attachment_url" VARCHAR(500),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guarantees" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID,
    "type" "GuaranteeType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200),
    "beneficiary" VARCHAR(200),
    "amount" DECIMAL(20,2) NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "attachment_url" VARCHAR(500),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_documents" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "phase" "DocumentPhase" NOT NULL DEFAULT 'PHASE_1',
    "title" VARCHAR(200) NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" DATE,
    "attachment_url" VARCHAR(500),
    "notes" VARCHAR(500),
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_checklists" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "type" "ChecklistType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "checklist_date" DATE NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL,
    "inspector_name" VARCHAR(200),
    "supervisor_name" VARCHAR(200),
    "approved_by_id" UUID,
    "approved_at" DATE,
    "rejected_reason" VARCHAR(500),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permits_code_key" ON "permits"("code");

-- CreateIndex
CREATE INDEX "permits_project_id_idx" ON "permits"("project_id");

-- CreateIndex
CREATE INDEX "permits_status_idx" ON "permits"("status");

-- CreateIndex
CREATE INDEX "permits_expiry_date_idx" ON "permits"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "insurances_code_key" ON "insurances"("code");

-- CreateIndex
CREATE INDEX "insurances_project_id_idx" ON "insurances"("project_id");

-- CreateIndex
CREATE INDEX "insurances_expiry_date_idx" ON "insurances"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "guarantees_code_key" ON "guarantees"("code");

-- CreateIndex
CREATE INDEX "guarantees_project_id_idx" ON "guarantees"("project_id");

-- CreateIndex
CREATE INDEX "guarantees_expiry_date_idx" ON "guarantees"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "technical_documents_code_key" ON "technical_documents"("code");

-- CreateIndex
CREATE INDEX "technical_documents_project_id_idx" ON "technical_documents"("project_id");

-- CreateIndex
CREATE INDEX "technical_documents_type_idx" ON "technical_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "phase_checklists_code_key" ON "phase_checklists"("code");

-- CreateIndex
CREATE INDEX "phase_checklists_project_id_idx" ON "phase_checklists"("project_id");

-- CreateIndex
CREATE INDEX "phase_checklists_status_idx" ON "phase_checklists"("status");

-- CreateIndex
CREATE INDEX "phase_checklists_checklist_date_idx" ON "phase_checklists"("checklist_date");

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantees" ADD CONSTRAINT "guarantees_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_documents" ADD CONSTRAINT "technical_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_checklists" ADD CONSTRAINT "phase_checklists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
