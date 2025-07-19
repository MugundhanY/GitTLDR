/*
  Warnings:

  - You are about to drop the column `permission` on the `meeting_share_settings` table. All the data in the column will be lost.
  - You are about to drop the column `permission` on the `repository_share_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ACCESS_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCESS_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCESS_REQUEST_DENIED';

-- AlterTable
ALTER TABLE "meeting_share_settings" DROP COLUMN "permission";

-- AlterTable
ALTER TABLE "repository_share_settings" DROP COLUMN "permission";

-- DropEnum
DROP TYPE "SharePermission";

-- CreateTable
CREATE TABLE "repository_access_requests" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "repository_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_access_requests_repository_id_user_id_key" ON "repository_access_requests"("repository_id", "user_id");

-- AddForeignKey
ALTER TABLE "repository_access_requests" ADD CONSTRAINT "repository_access_requests_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_access_requests" ADD CONSTRAINT "repository_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_access_requests" ADD CONSTRAINT "repository_access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
