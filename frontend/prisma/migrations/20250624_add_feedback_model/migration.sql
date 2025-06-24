-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "answerId" TEXT,
    "stepId" TEXT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quick lookup
CREATE INDEX "feedback_answerId_idx" ON "feedback" ("answerId");
CREATE INDEX "feedback_stepId_idx" ON "feedback" ("stepId");
CREATE INDEX "feedback_userId_idx" ON "feedback" ("userId");
