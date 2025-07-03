-- CreateTable
CREATE TABLE "meeting_qa" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION DEFAULT 0.0,
    "timestamp" DOUBLE PRECISION,
    "related_segments" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_qa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_qa_meeting_id_idx" ON "meeting_qa"("meeting_id");

-- CreateIndex
CREATE INDEX "meeting_qa_user_id_idx" ON "meeting_qa"("user_id");

-- AddForeignKey
ALTER TABLE "meeting_qa" ADD CONSTRAINT "meeting_qa_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_qa" ADD CONSTRAINT "meeting_qa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
