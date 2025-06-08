import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface FileMetadata {
  repository_id?: string;
  repositoryId?: string; // Support both snake_case and camelCase
  path: string;
  name: string;
  type: string;
  size: number;
  language?: string;
  content?: string;
  file_url?: string;
  file_key?: string;
  uploaded_at?: string;
  upload_failed?: boolean;
}

/**
 * Process file metadata from Redis queue and store in PostgreSQL
 */
export class FileMetadataProcessor {
  private isProcessing = false;

  async start() {
    console.log('🗃️ Starting file metadata processor...');
    
    // Process files continuously
    setInterval(() => {
      if (!this.isProcessing) {
        this.processFileMetadata();
      }
    }, 2000); // Check every 2 seconds
  }

  private async processFileMetadata() {
    this.isProcessing = true;
    
    try {
      // Get file metadata from Redis queue
      const metadataJson = await redis.rpop('file_metadata_queue');
      
      if (!metadataJson) {
        this.isProcessing = false;
        return;
      }

      const metadata: FileMetadata = JSON.parse(metadataJson);
      console.log(`📁 Processing file metadata for: ${metadata.path}`);

      // Store file in database
      await this.storeFileInDatabase(metadata);
      
    } catch (error) {
      console.error('Error processing file metadata:', error);
    } finally {
      this.isProcessing = false;
    }
  }  private async storeFileInDatabase(metadata: FileMetadata) {
    try {
      // Normalize the repository ID field (support both formats)
      const repositoryId = metadata.repositoryId || metadata.repository_id;
      
      if (!repositoryId) {
        throw new Error('Missing repositoryId in file metadata');
      }

      // Check if repository exists, create if it doesn't
      await this.ensureRepositoryExists(repositoryId);

      // Create or update repository file
      const repositoryFile = await prisma.repositoryFile.upsert({
        where: {
          repositoryId_path: {
            repositoryId: repositoryId,
            path: metadata.path
          }
        },        create: {
          repositoryId: repositoryId,
          path: metadata.path,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          language: metadata.language || null,
          fileUrl: metadata.file_url || null,
          fileKey: metadata.file_key || null,
        },
        update: {
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          language: metadata.language || null,
          fileUrl: metadata.file_url || null,
          fileKey: metadata.file_key || null,
        }
      });

      console.log(`✅ Stored file in database: ${metadata.path} (ID: ${repositoryFile.id})`);

      // Update repository file count
      await this.updateRepositoryStats(repositoryId);

    } catch (error) {
      console.error(`❌ Failed to store file ${metadata.path}:`, error);
      
      // Put back in queue for retry (with limit)
      const retryKey = `file_retry:${metadata.repository_id}:${metadata.path}`;
      const retryCount = await redis.incr(retryKey);
      await redis.expire(retryKey, 3600); // Expire retry counter in 1 hour
      
      if (retryCount <= 3) {
        await redis.lpush('file_metadata_queue', JSON.stringify(metadata));
        console.log(`🔄 Retrying file storage (attempt ${retryCount}/3): ${metadata.path}`);
      } else {
        console.log(`💀 Max retries exceeded for file: ${metadata.path}`);
      }
    }
  }

  private async ensureRepositoryExists(repositoryId: string) {
    try {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId }
      });

      if (!repository) {
        console.log(`🏗️ Creating repository ${repositoryId} for file storage`);
        
        // Check if user exists, create if needed
        await this.ensureUserExists('system');
        
        // Create a basic repository record
        await prisma.repository.create({
          data: {
            id: repositoryId,
            name: repositoryId.split('/').pop() || repositoryId,
            fullName: repositoryId,
            owner: 'unknown',
            url: `https://github.com/${repositoryId}`,
            userId: 'system',
            processed: false,
            embeddingStatus: 'PENDING'
          }
        });
        
        console.log(`✅ Created repository: ${repositoryId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to ensure repository exists ${repositoryId}:`, error);
      throw error;
    }
  }

  private async ensureUserExists(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        await prisma.user.create({
          data: {
            id: userId,
            email: 'system@gittldr.com',
            name: 'System User',
            githubId: 'system'
          }
        });
        console.log(`✅ Created system user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to ensure user exists ${userId}:`, error);
      throw error;
    }
  }

  private async updateRepositoryStats(repositoryId: string) {
    try {
      // Count files for this repository
      const fileCount = await prisma.repositoryFile.count({
        where: { repositoryId }
      });

      // Calculate total size
      const sizeAgg = await prisma.repositoryFile.aggregate({
        where: { repositoryId },
        _sum: { size: true }
      });

      // Update repository
      await prisma.repository.update({
        where: { id: repositoryId },
        data: {
          fileCount,
          totalSize: sizeAgg._sum.size || 0
        }
      });

      console.log(`📊 Updated repository stats: ${fileCount} files, ${sizeAgg._sum.size || 0} bytes`);

    } catch (error) {
      console.error('Error updating repository stats:', error);
    }
  }

  async stop() {
    console.log('🛑 Stopping file metadata processor...');
    await prisma.$disconnect();
  }
}
