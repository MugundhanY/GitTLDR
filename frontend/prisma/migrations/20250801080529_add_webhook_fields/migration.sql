-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "has_webhook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhook_id" TEXT,
ADD COLUMN     "webhook_url" TEXT;
