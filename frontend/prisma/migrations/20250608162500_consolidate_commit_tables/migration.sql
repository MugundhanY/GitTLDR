-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "RepositoryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (add columns only if they don't exist)
DO $$ BEGIN
    ALTER TABLE "commits" ADD COLUMN "summary" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "commits" ADD COLUMN "status" "RepositoryStatus" NOT NULL DEFAULT 'PENDING';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Migrate data from commit_summaries to commits table (only if commit_summaries exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commit_summaries') THEN
        UPDATE "commits" 
        SET "summary" = cs."summary", 
            "status" = cs."status"
        FROM "commit_summaries" cs 
        WHERE "commits"."sha" = cs."commit_sha" 
          AND "commits"."repository_id" = cs."repository_id";
    END IF;
END $$;

-- Drop commit_summaries table (only if it exists)
DROP TABLE IF EXISTS "commit_summaries";
