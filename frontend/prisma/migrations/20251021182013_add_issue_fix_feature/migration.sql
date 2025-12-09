-- CreateEnum
CREATE TYPE "IssueFixStatus" AS ENUM ('PENDING', 'ANALYZING', 'RETRIEVING_CODE', 'GENERATING_FIX', 'VALIDATING', 'READY_FOR_REVIEW', 'CREATING_PR', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "issue_fixes" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "issue_title" TEXT NOT NULL,
    "issue_body" TEXT,
    "issue_url" TEXT NOT NULL,
    "analysis" JSONB,
    "relevant_files" JSONB,
    "proposed_fix" JSONB,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "IssueFixStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "pr_number" INTEGER,
    "pr_url" TEXT,
    "pr_created_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "issue_fixes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issue_fixes_repository_id_issue_number_key" ON "issue_fixes"("repository_id", "issue_number");

-- AddForeignKey
ALTER TABLE "issue_fixes" ADD CONSTRAINT "issue_fixes_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_fixes" ADD CONSTRAINT "issue_fixes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
