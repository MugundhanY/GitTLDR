-- CreateEnum
CREATE TYPE "QuestionFeedback" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "feedback" "QuestionFeedback",
ADD COLUMN     "feedback_at" TIMESTAMP(3);
