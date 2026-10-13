-- CreateEnum
CREATE TYPE "LegalContractKind" AS ENUM ('WORKER_EMPLOYMENT', 'CONTRACTOR_AGREEMENT', 'CLIENT_CONTRACT', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "LegalContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "LegalContractPartyKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "SalesUnitStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "LegalContractParty" (
    "id" TEXT NOT NULL,
    "kind" "LegalContractPartyKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "nationalId" TEXT,
    "economicCode" TEXT,
    "registrationNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "mobilePhone" TEXT,
    "landlinePhone" TEXT,
    "email" TEXT,
    "maritalStatus" "MaritalStatus",
    "childrenCount" INTEGER,
    "education" TEXT,
    "job" TEXT,
    "insuranceNumber" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankSheba" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalContractParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalContract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "LegalContractKind" NOT NULL,
    "status" "LegalContractStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationNumber" TEXT,
    "registrationDate" TIMESTAMP(3),
    "partyId" TEXT NOT NULL,
    "projectId" UUID,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "totalAmount" DECIMAL(18,0),
    "salaryMonthly" DECIMAL(18,0),
    "salaryDaily" DECIMAL(18,0),
    "salaryHourly" DECIMAL(18,0),
    "workHoursPerWeek" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationText" TEXT,
    "workLocation" TEXT,
    "guaranteeType" TEXT,
    "guaranteeNumber" TEXT,
    "guaranteeAmount" DECIMAL(18,0),
    "guaranteeBank" TEXT,
    "supervisorName" TEXT,
    "companySignerName" TEXT,
    "workerSignerName" TEXT,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalContractAttachment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalContractAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalContractTemplate" (
    "id" TEXT NOT NULL,
    "kind" "LegalContractKind" NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesUnit" (
    "id" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "block" TEXT,
    "floor" INTEGER,
    "area" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "parkingCount" INTEGER,
    "storageCount" INTEGER,
    "listPrice" DECIMAL(18,0),
    "status" "SalesUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCustomer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "mobilePhone" TEXT,
    "landlinePhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "bankSheba" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesContract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LegalContractStatus" NOT NULL DEFAULT 'DRAFT',
    "unitId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalPrice" DECIMAL(18,0) NOT NULL,
    "discountAmount" DECIMAL(18,0),
    "finalPrice" DECIMAL(18,0) NOT NULL,
    "downPayment" DECIMAL(18,0),
    "contractDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "bodyHtml" TEXT,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInstallment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,0) NOT NULL,
    "paidAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "status" "SalesPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amount" DECIMAL(18,0) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalContractParty_nationalId_key" ON "LegalContractParty"("nationalId");

-- CreateIndex
CREATE INDEX "LegalContractParty_fullName_idx" ON "LegalContractParty"("fullName");

-- CreateIndex
CREATE INDEX "LegalContractParty_nationalId_idx" ON "LegalContractParty"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalContract_code_key" ON "LegalContract"("code");

-- CreateIndex
CREATE INDEX "LegalContract_code_idx" ON "LegalContract"("code");

-- CreateIndex
CREATE INDEX "LegalContract_kind_idx" ON "LegalContract"("kind");

-- CreateIndex
CREATE INDEX "LegalContract_status_idx" ON "LegalContract"("status");

-- CreateIndex
CREATE INDEX "LegalContract_partyId_idx" ON "LegalContract"("partyId");

-- CreateIndex
CREATE INDEX "LegalContract_projectId_idx" ON "LegalContract"("projectId");

-- CreateIndex
CREATE INDEX "LegalContractAttachment_contractId_idx" ON "LegalContractAttachment"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalContractTemplate_kind_key" ON "LegalContractTemplate"("kind");

-- CreateIndex
CREATE INDEX "SalesUnit_projectId_idx" ON "SalesUnit"("projectId");

-- CreateIndex
CREATE INDEX "SalesUnit_status_idx" ON "SalesUnit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesUnit_projectId_unitNumber_block_key" ON "SalesUnit"("projectId", "unitNumber", "block");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCustomer_nationalId_key" ON "SalesCustomer"("nationalId");

-- CreateIndex
CREATE INDEX "SalesCustomer_fullName_idx" ON "SalesCustomer"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "SalesContract_code_key" ON "SalesContract"("code");

-- CreateIndex
CREATE INDEX "SalesContract_code_idx" ON "SalesContract"("code");

-- CreateIndex
CREATE INDEX "SalesContract_status_idx" ON "SalesContract"("status");

-- CreateIndex
CREATE INDEX "SalesContract_customerId_idx" ON "SalesContract"("customerId");

-- CreateIndex
CREATE INDEX "SalesContract_unitId_idx" ON "SalesContract"("unitId");

-- CreateIndex
CREATE INDEX "SalesInstallment_contractId_idx" ON "SalesInstallment"("contractId");

-- CreateIndex
CREATE INDEX "SalesInstallment_status_idx" ON "SalesInstallment"("status");

-- CreateIndex
CREATE INDEX "SalesPayment_contractId_idx" ON "SalesPayment"("contractId");

-- CreateIndex
CREATE INDEX "SalesPayment_paidAt_idx" ON "SalesPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "LegalContract" ADD CONSTRAINT "LegalContract_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "LegalContractParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalContract" ADD CONSTRAINT "LegalContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalContractAttachment" ADD CONSTRAINT "LegalContractAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LegalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesUnit" ADD CONSTRAINT "SalesUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesContract" ADD CONSTRAINT "SalesContract_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SalesUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesContract" ADD CONSTRAINT "SalesContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SalesCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInstallment" ADD CONSTRAINT "SalesInstallment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SalesContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "SalesContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
