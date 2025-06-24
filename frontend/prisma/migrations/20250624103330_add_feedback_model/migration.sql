/*
  Warnings:

  - Made the column `createdAt` on table `feedback` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "feedback" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
