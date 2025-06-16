import { PrismaClient, RepositoryStatus } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface CommitSummaryResult {
  status: string;
  commit_sha: string;
  summary: string;
  files_changed: number;
}

/**
 * Process commit summaries and other results from Python worker
 */
export class ResultProcessor {
  private isProcessing = false;

  async start() {
    console.log('📊 Starting result processor...');
    
    // Process results continuously
    setInterval(() => {
      if (!this.isProcessing) {
        this.processResults();
      }
    }, 3000); // Check every 3 seconds
  }
  private async processResults() {
    this.isProcessing = true;
    
    try {
      // Process generic result queue first
      await this.processGenericResults();
      
      // Process commit summary results
      await this.processCommitSummaryResults();
      
      // Process QnA results
      await this.processQnAResults();
      
    } catch (error) {
      console.error('Error processing results:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processGenericResults() {
    try {
      // Get results from generic result queue
      const resultJson = await redis.rpop('result_queue');
      
      if (!resultJson) {
        return;
      }

      const result = JSON.parse(resultJson);
      console.log(`🔄 Processing generic result of type: ${result.type}`);

      // Route to appropriate handler based on type
      if (result.type === 'commit_summary') {
        await this.handleCommitSummaryResult(result);
      } else if (result.type === 'qna') {
        await this.handleQnAResult(result);
      } else {
        console.log(`⚠️ Unknown result type: ${result.type}`);
      }
      
    } catch (error) {
      console.error('Error processing generic results:', error);
    }
  }  private async handleCommitSummaryResult(result: any) {
    try {
      // Ensure repository exists
      await this.ensureRepositoryExists(result.repositoryId || result.repository_id);
        const repositoryId = result.repositoryId || result.repository_id;
      const commitSha = result.commitSha || result.commit_sha;
      const status = result.status === 'COMPLETED' ? RepositoryStatus.COMPLETED : 
                     result.status === 'PENDING' ? RepositoryStatus.PENDING : 
                     RepositoryStatus.COMPLETED; // Default to COMPLETED
      
      // Use upsert to create commit if it doesn't exist, or update if it does
      const commitData = {
        sha: commitSha,
        message: result.commitMessage || result.message || 'No commit message',
        authorName: result.author?.name || 'Unknown',
        authorEmail: result.author?.email || 'unknown@email.com',
        authorAvatar: result.author?.avatar || null,
        timestamp: result.timestamp ? new Date(result.timestamp) : new Date(),
        url: result.url || `https://github.com/${repositoryId}/commit/${commitSha}`,
        filesChanged: result.files?.length || result.files_changed || 0,
        repositoryId: repositoryId,
        summary: result.summary || (status === RepositoryStatus.PENDING ? 'Processing commit summary...' : null),
        status: status
      };

      const commit = await prisma.commit.upsert({
        where: { sha: commitSha },
        update: {
          summary: commitData.summary,
          status: commitData.status
        },
        create: commitData
      });

      if (result.summary) {
        console.log(`✅ Updated commit summary for SHA: ${commitSha}`);
      } else {
        console.log(`📝 Created/updated commit record for SHA: ${commitSha} with status: ${status}`);
      }

    } catch (error) {
      console.error(`❌ Failed to process commit for ${result.commitSha || result.commit_sha}:`, error);
      
      // Put back in queue for retry
      await redis.lpush('result_queue', JSON.stringify(result));
    }
  }
  private async handleQnAResult(result: any) {
    console.log(`📋 Processing Q&A result for question: ${result.question_id}`);
    
    try {
      // Store Q&A result in database
      await this.storeQnAResult(result);
    } catch (error) {
      console.error('Error handling Q&A result:', error);
      // Put back in queue for retry
      await redis.lpush('qna_results', JSON.stringify(result));
    }
  }

  private async processCommitSummaryResults() {
    try {
      // Get commit summary results from Redis queue
      const resultJson = await redis.rpop('commit_summary_results');
      
      if (!resultJson) {
        return;
      }

      const result: CommitSummaryResult = JSON.parse(resultJson);
      console.log(`📝 Processing commit summary result for: ${result.commit_sha}`);

      // Update commit summary in database
      await this.updateCommitSummary(result);
      
    } catch (error) {
      console.error('Error processing commit summary results:', error);
    }
  }  private async updateCommitSummary(result: CommitSummaryResult) {
    try {
      // Find and update commit summary
      const updated = await prisma.commit.updateMany({
        where: {
          sha: result.commit_sha,
          status: 'PENDING'
        },
        data: {
          summary: result.summary,
          status: 'COMPLETED',
        }
      });

      if (updated.count > 0) {
        console.log(`✅ Updated commit summary for SHA: ${result.commit_sha}`);
      } else {
        console.log(`⚠️ No pending commit found for SHA: ${result.commit_sha}`);
      }

    } catch (error) {
      console.error(`❌ Failed to update commit summary for ${result.commit_sha}:`, error);
      
      // Put back in queue for retry
      await redis.lpush('commit_summary_results', JSON.stringify(result));
    }
  }

  private async processQnAResults() {
    try {
      // Get QnA results from Redis queue
      const resultJson = await redis.rpop('qna_results');
      
      if (!resultJson) {
        return;
      }

      const result = JSON.parse(resultJson);
      console.log(`❓ Processing QnA result for question: ${result.question_id}`);

      // Store QnA result in database
      await this.storeQnAResult(result);
      
    } catch (error) {
      console.error('Error processing QnA results:', error);
    }
  }
  private async storeQnAResult(result: any) {
    try {
      // Ensure user exists or create a default one
      let userId = result.user_id;
      let user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.log(`User ${userId} not found, creating default user...`);
        user = await prisma.user.create({
          data: {
            id: userId,
            email: 'demo@example.com',
            name: 'Demo User',
            githubId: `github-${userId}`,
            githubLogin: `user-${userId}`
          }
        });
        console.log(`Created default user: ${user.id}`);
      }      // Create question record
      const now = new Date();
      const question = await prisma.question.create({
        data: {
          id: result.question_id,
          query: result.question,
          answer: result.answer,
          confidenceScore: result.confidence || 0.5,
          relevantFiles: result.relevant_files || [],
          userId: user.id,
          repositoryId: result.repository_id,
          createdAt: now,
          // Add AI-generated categorization data
          category: result.category || null,
          tags: result.tags || [],
        }
      });

      console.log(`✅ Stored QnA result with category '${result.category}': ${question.id}`);

    } catch (error) {
      console.error(`❌ Failed to store QnA result:`, error);
      
      // Put back in queue for retry
      await redis.lpush('qna_results', JSON.stringify(result));
    }
  }
  async stop() {
    console.log('🛑 Stopping result processor...');
    await prisma.$disconnect();
  }

  private async ensureRepositoryExists(repositoryId: string) {
    try {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId }
      });

      if (!repository) {
        console.log(`🏗️ Creating repository ${repositoryId} for result processing`);
        
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
}
