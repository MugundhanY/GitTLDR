/*
  Warnings:

  - You are about to drop the column `forks_count` on the `repositories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "repositories" DROP COLUMN "forks_count";
