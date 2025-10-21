-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "tool_executions" JSONB,
ADD COLUMN     "github_data_used" BOOLEAN NOT NULL DEFAULT false;
