-- AlterTable
ALTER TABLE "users" ADD COLUMN     "signature_updated_at" TIMESTAMP(3),
ADD COLUMN     "signature_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "company_profile" (
    "id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" VARCHAR(200) NOT NULL DEFAULT 'استودیو معماری اپسای',
    "stamp_url" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);
