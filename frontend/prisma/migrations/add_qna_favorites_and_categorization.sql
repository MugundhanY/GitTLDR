-- Add favorites and categorization to questions
ALTER TABLE "questions" ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "questions" ADD COLUMN "tags" TEXT[];
ALTER TABLE "questions" ADD COLUMN "category" TEXT;
ALTER TABLE "questions" ADD COLUMN "notes" TEXT;
ALTER TABLE "questions" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
