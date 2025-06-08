import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface FileSummaryUpdate {
  type: string;
  repository_id: string;
  file_path: string;
  summary: string;
  updated_at: string;
}

/**
 * Process file summary updates from Python worker
 */
export class FileSummaryProcessor {
  private isProcessing = false;

  async start() {
    console.log('📄 Starting file summary processor...');
    
    // Process file summaries continuously
    setInterval(() => {
      if (!this.isProcessing) {
        this.processFileSummaries();
      }
    }, 2000); // Check every 2 seconds
  }

  private async processFileSummaries() {
    this.isProcessing = true;
    
    try {
      // Get file summary update from Redis queue
      const updateJson = await redis.rpop('file_summary_queue');
      
      if (!updateJson) {
        this.isProcessing = false;
        return;
      }

      const update: FileSummaryUpdate = JSON.parse(updateJson);
      console.log(`📝 Processing file summary for: ${update.file_path}`);

      // Update file summary in database
      await this.updateFileSummary(update);
      
    } catch (error) {
      console.error('Error processing file summary:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async updateFileSummary(update: FileSummaryUpdate) {
    try {
      // Find and update the file record
      const updatedFile = await prisma.repositoryFile.updateMany({
        where: {
          repositoryId: update.repository_id,
          path: update.file_path
        },
        data: {
          summary: update.summary
        }
      });

      if (updatedFile.count > 0) {
        console.log(`✅ Updated summary for file: ${update.file_path}`);
      } else {
        console.log(`⚠️ File not found for summary update: ${update.file_path}`);
        
        // Put back in queue for retry
        await redis.lpush('file_summary_queue', JSON.stringify(update));
      }

    } catch (error) {
      console.error(`❌ Failed to update file summary for ${update.file_path}:`, error);
      
      // Put back in queue for retry
      await redis.lpush('file_summary_queue', JSON.stringify(update));
    }
  }

  async stop() {
    console.log('🛑 Stopping file summary processor...');
    await prisma.$disconnect();
  }
}
