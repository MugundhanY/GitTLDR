import { PrismaClient, RepositoryStatus } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Process results from Python worker
 */
export class ResultProcessor {

  async start() {
    console.log('📊 Starting result processor...');
    
    // Use blocking Redis pop instead of polling
    this.processResultsContinuously();
  }

  private async processResultsContinuously() {
    while (true) {
      try {
        // Process multiple queues with blocking operations
        await Promise.race([
          this.processGenericResultsBlocking(),
          this.processQnAResultsBlocking()
        ]);
        
      } catch (error) {
        console.error('Error in result processor:', error);
        // Wait 5 seconds before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processGenericResultsBlocking() {
    const result = await redis.brpop('result_queue', 10);
    if (result) {
      const [, resultJson] = result;
      const resultData = JSON.parse(resultJson);
      console.log(`🔄 Processing generic result of type: ${resultData.type}`);

      // Route to appropriate handler based on type
      if (resultData.type === 'qna') {
        await this.handleQnAResult(resultData);
      } else {
        console.log(`⚠️ Unknown result type: ${resultData.type}`);
      }
    }
  }

  private async processQnAResultsBlocking() {
    const result = await redis.brpop('qna_results', 10);
    if (result) {
      const [, resultJson] = result;
      const qnaResult = JSON.parse(resultJson);
      console.log(`❓ Processing Q&A result for question: ${qnaResult.question_id}`);
      await this.handleQnAResult(qnaResult);
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
      if (result.type === 'qna') {
        await this.handleQnAResult(result);
      } else {
        console.log(`⚠️ Unknown result type: ${result.type}`);
      }
      
    } catch (error) {
      console.error('Error processing generic results:', error);
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
      }      // Check if question already exists (created as pending with attachments)
      const existingQuestion = await prisma.question.findUnique({
        where: { id: result.question_id },
        include: { questionAttachments: true }
      });

      const now = new Date();
      let question;
      if (existingQuestion) {
        // Update existing question to completed status
        question = await prisma.question.update({
          where: { id: result.question_id },
          data: {
            answer: result.answer,
            confidenceScore: result.confidence || 0.5,
            relevantFiles: result.relevant_files || [],
            // Add AI-generated categorization data
            category: result.category || null,
            tags: result.tags || [],
            updatedAt: now
          }
        });
        console.log(`✅ Updated existing question with attachments: ${question.id}`);
      } else {
        // Create new question record (no attachments case)
        question = await prisma.question.create({
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
        console.log(`✅ Created new question without attachments: ${question.id}`);
      }

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
