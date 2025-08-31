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

  async start() {
    console.log('📄 Starting file summary processor...');
    
    // Use blocking Redis pop instead of polling
    this.processFileSummariesContinuously();
  }

  private async processFileSummariesContinuously() {
    while (true) {
      try {
        // Use BRPOP for blocking pop with 30 second timeout
        const result = await redis.brpop('file_summary_queue', 30);
        
        if (result) {
          const [, summaryJson] = result;
          const summary: FileSummaryUpdate = JSON.parse(summaryJson);
          console.log(`📄 Processing file summary for: ${summary.file_path}`);
          
          // Process the file summary
          await this.updateFileSummary(summary);
        }
        // If no result after 30 seconds, loop continues (no Redis writes)
        
      } catch (error) {
        console.error('Error in file summary processor:', error);
        // Wait 5 seconds before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
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
