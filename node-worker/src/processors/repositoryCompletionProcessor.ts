import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RepositoryCompletion {
  repositoryId?: string;
  repository_id?: string; // Support both formats
  embedding_status?: string;
  status?: string; // Support both formats  
  summary: string;
  file_count?: string;
  fileCount?: number; // Support both formats
  total_size?: string;
  totalSize?: number; // Support both formats
  updated_at?: string;
  completed_by?: string;
}

/**
 * Process repository completion data from Redis and update database
 */
export class RepositoryCompletionProcessor {
  private isProcessing = false;

  async start() {
    console.log('🎯 Starting repository completion processor...');
    
    // Listen for repository completion events
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    subscriber.subscribe('repository_updates');
    
    subscriber.on('message', async (channel, message) => {
      if (channel === 'repository_updates') {
        const [repositoryId, status] = message.split(':');
        if (status === 'COMPLETED') {
          await this.processRepositoryCompletion(repositoryId);
        }
      }
    });    // Also check periodically for completion data
    setInterval(() => {
      if (!this.isProcessing) {
        this.checkForCompletions();
      }
    }, 5000); // Check every 5 seconds

    // Also process queue-based completions
    setInterval(() => {
      if (!this.isProcessing) {
        this.processCompletionQueue();
      }
    }, 2000); // Check every 2 seconds
  }

  private async processCompletionQueue() {
    try {
      // Get completion data from queue
      const completionJson = await redis.rpop('repository_completion_queue');
      
      if (!completionJson) {
        return;
      }

      const completionData: RepositoryCompletion = JSON.parse(completionJson);
      const repositoryId = completionData.repositoryId || completionData.repository_id;
      
      if (!repositoryId) {
        console.error('❌ Missing repositoryId in completion data');
        return;
      }

      console.log(`🏁 Processing queued completion for repository: ${repositoryId}`);
      
      await this.updateRepositoryInDatabase(repositoryId, completionData);
      
    } catch (error) {
      console.error('Error processing completion queue:', error);
    }
  }

  private async checkForCompletions() {
    this.isProcessing = true;
    
    try {
      // Get all repository completion keys
      const keys = await redis.keys('repository_completion:*');
        for (const key of keys) {
        const repositoryId = key.replace('repository_completion:', '');
        const completionData = await redis.hgetall(key);
        
        if (completionData.embedding_status === 'COMPLETED') {
          await this.updateRepositoryInDatabase(repositoryId, completionData as unknown as RepositoryCompletion);
          
          // Remove processed completion data
          await redis.del(key);
        }
      }
      
    } catch (error) {
      console.error('Error checking for completions:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processRepositoryCompletion(repositoryId: string) {
    try {
      console.log(`🏁 Processing completion for repository: ${repositoryId}`);
      
      // Get completion data from Redis
      const completionData = await redis.hgetall(`repository_completion:${repositoryId}`);
        if (completionData.embedding_status === 'COMPLETED') {
        await this.updateRepositoryInDatabase(repositoryId, completionData as unknown as RepositoryCompletion);
        
        // Clean up Redis data
        await redis.del(`repository_completion:${repositoryId}`);
        await redis.del(`repository_status:${repositoryId}`);
        
        console.log(`✅ Repository ${repositoryId} marked as completed`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing repository completion for ${repositoryId}:`, error);
    }
  }
  private async updateRepositoryInDatabase(repositoryId: string, completionData: RepositoryCompletion) {
    try {
      // Normalize field values
      const fileCount = completionData.fileCount || 
                       (completionData.file_count ? parseInt(completionData.file_count) : 0);
      const totalSize = completionData.totalSize || 
                       (completionData.total_size ? parseInt(completionData.total_size) : 0);
      const status = completionData.status || completionData.embedding_status || 'COMPLETED';

      // Update repository with completion data
      await prisma.repository.update({
        where: { id: repositoryId },
        data: {
          embeddingStatus: 'COMPLETED',
          processed: true,
          summary: completionData.summary || null,
          fileCount: fileCount,
          totalSize: totalSize,
        }
      });

      console.log(`📝 Updated repository ${repositoryId}:`, {
        summary: completionData.summary ? `${completionData.summary.substring(0, 50)}...` : 'No summary',
        fileCount: fileCount,
        totalSize: totalSize
      });

    } catch (error) {
      console.error(`❌ Failed to update repository ${repositoryId} in database:`, error);
      
      // Put back completion data for retry (only for hash-based operations)
      if (completionData.embedding_status) {
        await redis.hset(`repository_completion:${repositoryId}`, completionData as any);
      }
    }
  }

  async stop() {
    console.log('🛑 Stopping repository completion processor...');
    await prisma.$disconnect();
  }
}
