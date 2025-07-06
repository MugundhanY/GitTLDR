/*
  Warnings:

  - You are about to drop the `_MeetingCreatedBy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MeetingToRepository` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MeetingCreatedBy" DROP CONSTRAINT "_MeetingCreatedBy_A_fkey";

-- DropForeignKey
ALTER TABLE "_MeetingCreatedBy" DROP CONSTRAINT "_MeetingCreatedBy_B_fkey";

-- DropForeignKey
ALTER TABLE "_MeetingToRepository" DROP CONSTRAINT "_MeetingToRepository_A_fkey";

-- DropForeignKey
ALTER TABLE "_MeetingToRepository" DROP CONSTRAINT "_MeetingToRepository_B_fkey";

-- DropIndex
DROP INDEX "meeting_qa_meeting_id_idx";

-- DropIndex
DROP INDEX "meeting_qa_user_id_idx";

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "repository_id" TEXT;

-- DropTable
DROP TABLE "_MeetingCreatedBy";

-- DropTable
DROP TABLE "_MeetingToRepository";

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
