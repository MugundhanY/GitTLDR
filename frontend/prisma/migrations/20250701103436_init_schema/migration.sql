-- CreateEnum
CREATE TYPE "RepositoryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'USAGE');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "github_id" TEXT NOT NULL,
    "github_login" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "company" TEXT,
    "blog" TEXT,
    "twitter_username" TEXT,
    "public_repos" INTEGER,
    "public_gists" INTEGER,
    "followers" INTEGER,
    "following" INTEGER,
    "hireable" BOOLEAN,
    "github_created_at" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 150,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "github_access_token" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "embedding_status" "RepositoryStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT,
    "file_count" INTEGER,
    "total_size" INTEGER,
    "watchers_count" INTEGER,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_files" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "summary" TEXT,
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "repository_id" TEXT NOT NULL,
    "file_key" TEXT,
    "file_url" TEXT,

    CONSTRAINT "repository_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commits" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_avatar" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "files_changed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repository_id" TEXT NOT NULL,
    "status" "RepositoryStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "relevant_files" JSONB NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attachments" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "upload_url" TEXT NOT NULL,
    "backblaze_file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "question_id" TEXT,
    "repository_id" TEXT NOT NULL,

    CONSTRAINT "question_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "stripe_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "full_transcript" TEXT,
    "summary" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'UPLOADED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "language" TEXT,
    "raw_audio_path" TEXT,
    "num_segments" INTEGER,
    "participants" TEXT[],
    "user_id" TEXT,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_segments" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "segment_index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "segment_text" TEXT NOT NULL,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "embedding" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "answerId" TEXT,
    "stepId" TEXT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MeetingToRepository" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MeetingToRepository_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MeetingCreatedBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MeetingCreatedBy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "repository_files_repository_id_path_key" ON "repository_files"("repository_id", "path");

-- CreateIndex
CREATE UNIQUE INDEX "commits_sha_key" ON "commits"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_segments_meeting_id_segment_index_key" ON "meeting_segments"("meeting_id", "segment_index");

-- CreateIndex
CREATE INDEX "feedback_answerId_idx" ON "feedback"("answerId");

-- CreateIndex
CREATE INDEX "feedback_stepId_idx" ON "feedback"("stepId");

-- CreateIndex
CREATE INDEX "feedback_userId_idx" ON "feedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_answerId_userId_type_key" ON "feedback"("answerId", "userId", "type");

-- CreateIndex
CREATE INDEX "_MeetingToRepository_B_index" ON "_MeetingToRepository"("B");

-- CreateIndex
CREATE INDEX "_MeetingCreatedBy_B_index" ON "_MeetingCreatedBy"("B");

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_segments" ADD CONSTRAINT "meeting_segments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToRepository" ADD CONSTRAINT "_MeetingToRepository_A_fkey" FOREIGN KEY ("A") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToRepository" ADD CONSTRAINT "_MeetingToRepository_B_fkey" FOREIGN KEY ("B") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingCreatedBy" ADD CONSTRAINT "_MeetingCreatedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingCreatedBy" ADD CONSTRAINT "_MeetingCreatedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
