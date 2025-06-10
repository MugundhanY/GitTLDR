/*
  Warnings:

  - You are about to drop the column `content` on the `repository_files` table. All the data in the column will be lost.
  - You are about to drop the column `embedding_id` on the `repository_files` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[repository_id,path]` on the table `repository_files` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "file_count" INTEGER,
ADD COLUMN     "forks_count" INTEGER,
ADD COLUMN     "total_size" INTEGER,
ADD COLUMN     "watchers_count" INTEGER;

-- AlterTable
ALTER TABLE "repository_files" DROP COLUMN "content",
DROP COLUMN "embedding_id",
ADD COLUMN     "file_key" TEXT,
ADD COLUMN     "file_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "repository_files_repository_id_path_key" ON "repository_files"("repository_id", "path");
