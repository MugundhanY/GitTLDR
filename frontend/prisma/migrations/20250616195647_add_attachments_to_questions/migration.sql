-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';
