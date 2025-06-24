/*
  Warnings:

  - A unique constraint covering the columns `[answerId,userId,type]` on the table `feedback` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "feedback_answerId_userId_type_key" ON "feedback"("answerId", "userId", "type");
