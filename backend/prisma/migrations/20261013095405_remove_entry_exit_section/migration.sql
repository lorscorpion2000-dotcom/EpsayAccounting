-- Remove ENTRY_EXIT section
-- This migration mirrors the changes that were applied earlier via prisma db push.
-- On a fresh DB (e.g. CI), migrations 1..51 recreate ENTRY_EXIT, and this migration removes it.

-- 1) Drop daily_report_entry_exits table
DROP TABLE IF EXISTS "daily_report_entry_exits";

-- 2) Remove any rows using ENTRY_EXIT before altering the enum
DELETE FROM "daily_report_sections" WHERE "section_type" = 'ENTRY_EXIT';
DELETE FROM "daily_report_forwardings" WHERE "section_type" = 'ENTRY_EXIT';
DELETE FROM "daily_report_attachments" WHERE "section_type" = 'ENTRY_EXIT';

-- 3) Recreate enum without ENTRY_EXIT
--    (PostgreSQL does not support dropping enum values directly)
ALTER TYPE "DailyReportSectionType" RENAME TO "DailyReportSectionType_old";
CREATE TYPE "DailyReportSectionType" AS ENUM ('HEADER', 'PROGRESS', 'WORKERS', 'EQUIPMENTS', 'MATERIALS', 'REQUESTS', 'EVENTS', 'ATTACHMENTS');

-- 4) Alter all three columns that reference the enum
ALTER TABLE "daily_report_sections"
  ALTER COLUMN "section_type" TYPE "DailyReportSectionType"
  USING ("section_type"::text::"DailyReportSectionType");

ALTER TABLE "daily_report_forwardings"
  ALTER COLUMN "section_type" TYPE "DailyReportSectionType"
  USING ("section_type"::text::"DailyReportSectionType");

ALTER TABLE "daily_report_attachments"
  ALTER COLUMN "section_type" TYPE "DailyReportSectionType"
  USING ("section_type"::text::"DailyReportSectionType");

-- 5) Drop the old type
DROP TYPE "DailyReportSectionType_old";
