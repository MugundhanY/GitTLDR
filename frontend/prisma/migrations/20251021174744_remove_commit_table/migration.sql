/*
  Warnings:

  - You are about to drop the `commits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_repository_id_fkey";

-- DropTable
DROP TABLE "commits";
