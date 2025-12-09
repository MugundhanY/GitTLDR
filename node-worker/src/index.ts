import express, { Request, Response } from 'express';
import Redis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { FileMetadataProcessor } from './processors/fileMetadataProcessor';
import { RepositoryCompletionProcessor } from './processors/repositoryCompletionProcessor';
import { ResultProcessor } from './processors/resultProcessor';
import { FileSummaryProcessor } from './processors/fileSummaryProcessor';
import { createMeetingRecord, updateMeetingStatus } from './processors/meetingProcessor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Redis connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Prisma client
const prisma = new PrismaClient();

// Subscribe to meeting status updates
subscriber.subscribe('meeting_status_updates');
subscriber.on('message', async (channel, message) => {
  if (channel === 'meeting_status_updates') {
    try {
      const statusUpdate = JSON.parse(message);
      const { meeting_id, status, ...result } = statusUpdate;

      console.log(`📅 Received meeting status update: ${meeting_id} -> ${status}`);

      // Update meeting status in database with full result data
      await updateMeetingStatus(`meeting_${meeting_id}_`, status, result);
    } catch (error) {
      console.error('Error processing meeting status update:', error);
    }
  }
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Health check with service status
app.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const services: Record<string, string> = {};

  // Check Redis connectivity
  try {
    await redis.ping();
    services.redis = 'connected';
  } catch {
    services.redis = 'disconnected';
  }

  // Check Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'connected';
  } catch {
    services.database = 'disconnected';
  }

  const allHealthy = Object.values(services).every(s => s === 'connected');
  const responseTime = Date.now() - startTime;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    version: process.env.npm_package_version || '0.1.0',
    services
  });
});

// Job status endpoint
app.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const status = await redis.hgetall(`job:${jobId}`);

    if (!status.id) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// Repository processing endpoint
app.post('/process-repository', async (req: Request, res: Response) => {
  try {
    const { repositoryId, userId, repoUrl, action = 'full_analysis' } = req.body;

    if (!repositoryId || !userId || !repoUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const jobId = `${action}_${repositoryId}_${Date.now()}`;

    // Create job record
    await redis.hset(`job:${jobId}`, {
      id: jobId,
      type: action,
      repositoryId,
      userId,
      repoUrl,
      status: 'queued',
      createdAt: new Date().toISOString(),
      progress: '0'
    });

    // Queue job for Python worker
    await redis.lpush(process.env.QUEUE_NAME || 'gittldr_tasks', JSON.stringify({
      jobId,
      type: action,
      repositoryId,
      userId,
      repoUrl,
      timestamp: new Date().toISOString()
    }));

    console.log(`📦 Queued ${action} job for repository ${repositoryId}`);

    res.json({ jobId, status: 'queued' });
  } catch (error) {
    console.error('Error processing repository:', error);
    res.status(500).json({ error: 'Failed to queue repository processing' });
  }
});

// QnA processing endpoint
app.post('/process-question', async (req: Request, res: Response) => {
  try {
    const { questionId, repositoryId, userId, question, attachments } = req.body;

    if (!questionId || !repositoryId || !userId || !question) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prioritize attachments from request body (which include content)
    // Only fall back to database if no attachments provided in request
    let allAttachments: any[] = [];

    if (attachments && attachments.length > 0) {
      // Use attachments from request body - they include the content field
      console.log(`📎 Using ${attachments.length} attachments from request body (with content)`);
      allAttachments = attachments;
    } else {
      // Fallback: Retrieve attachments from database if not provided in request
      try {
        const existingQuestion = await prisma.question.findUnique({
          where: { id: questionId },
          include: { questionAttachments: true }
        });

        if (existingQuestion && existingQuestion.questionAttachments) {
          allAttachments = existingQuestion.questionAttachments.map(att => ({
            fileName: att.backblazeFileId || att.fileName, // Use backblazeFileId as the B2 key
            originalFileName: att.originalFileName,
            fileType: att.fileType,
            fileSize: att.fileSize
          }));
          console.log(`📎 Retrieved ${allAttachments.length} attachments from database for question ${questionId}`);
        }
      } catch (dbError) {
        console.warn(`⚠️ Failed to retrieve attachments from database: ${(dbError as Error).message}`);
      }
    }

    const jobId = `qna_${questionId}_${Date.now()}`;

    // Create job record
    await redis.hset(`job:${jobId}`, {
      id: jobId,
      type: 'qna',
      questionId,
      repositoryId,
      userId,
      question,
      status: 'queued',
      createdAt: new Date().toISOString(),
      progress: '0'
    });

    // Queue job for Python worker
    await redis.lpush(process.env.QUEUE_NAME || 'gittldr_tasks', JSON.stringify({
      jobId,
      type: 'qna',
      questionId,
      repositoryId,
      userId,
      question,
      attachments: allAttachments,
      timestamp: new Date().toISOString()
    }));

    console.log(`❓ Queued QnA job for question ${questionId}${allAttachments.length > 0 ? ` with ${allAttachments.length} attachments` : ''}`);

    res.json({ jobId, status: 'queued' });
  } catch (error) {
    console.error('Error processing question:', error);
    res.status(500).json({ error: 'Failed to queue question processing' });
  }
});

// Meeting processing endpoint
app.post('/process-meeting', async (req: Request, res: Response) => {
  try {
    const { meetingId, userId, audioUrl, participants } = req.body;

    if (!meetingId || !userId || !audioUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const jobId = `meeting_${meetingId}_${Date.now()}`;

    // Create job record
    await redis.hset(`job:${jobId}`, {
      id: jobId,
      type: 'process_meeting',
      meetingId,
      userId,
      audioUrl,
      participants: JSON.stringify(participants || []),
      status: 'queued',
      createdAt: new Date().toISOString(),
      progress: '0'
    });

    // Queue job for Python worker
    await redis.lpush(process.env.QUEUE_NAME || 'gittldr_tasks', JSON.stringify({
      jobId,
      type: 'process_meeting',
      meetingId,
      userId,
      audioUrl,
      participants,
      timestamp: new Date().toISOString()
    }));

    console.log(`🎤 Queued meeting processing job for meeting ${meetingId}`);

    res.json({ jobId, status: 'queued' });
  } catch (error) {
    console.error('Error processing meeting:', error);
    res.status(500).json({ error: 'Failed to queue meeting processing' });
  }
});

// Task status endpoint for polling
app.get('/task-status/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const status = await redis.hgetall(`job:${taskId}`);

    if (!status.id) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Parse result if it exists
    if (status.result) {
      try {
        status.result = JSON.parse(status.result);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching task status:', error);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
});

// Endpoint to register a meeting audio after upload (using B2 pre-signed URL)
app.post('/register-meeting-audio', async (req: Request, res: Response) => {
  try {
    const { meetingId, userId, repositoryId, b2FileKey, participants, title, source } = req.body;
    if (!meetingId || !userId || !b2FileKey || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await createMeetingRecord({ meetingId, userId, repositoryId, b2FileKey, participants, title, source });
    const jobId = `meeting_${meetingId}_${Date.now()}`;
    await redis.hset(`job:${jobId}`, {
      id: jobId,
      type: 'process_meeting',
      meetingId,
      userId,
      repositoryId: repositoryId || '',
      b2FileKey,
      participants: JSON.stringify(participants || []),
      status: 'pending',
      createdAt: new Date().toISOString(),
      progress: '0'
    });
    await redis.lpush(process.env.QUEUE_NAME || 'gittldr_tasks', JSON.stringify({
      jobId,
      type: 'process_meeting',
      meetingId,
      userId,
      repositoryId,
      b2FileKey,
      participants,
      timestamp: new Date().toISOString()
    }));
    res.json({ jobId, status: 'pending', b2FileKey });
  } catch (error) {
    console.error('Error registering meeting audio:', error);
    res.status(500).json({ error: 'Failed to register meeting audio' });
  }
});

// Listen for job updates from Python worker and update DB (and Redis)
subscriber.subscribe('job_updates');
subscriber.on('message', async (channel, message) => {
  if (channel === 'job_updates') {
    try {
      const update = JSON.parse(message);
      const { jobId, status, progress, result, error } = update;
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      if (progress !== undefined) updateData.progress = progress;
      if (result) updateData.result = JSON.stringify(result);
      if (error) updateData.error = error;
      await redis.hset(`job:${jobId}`, updateData);

      // Handle different job types
      if (jobId.startsWith('qna_')) {
        // Extract questionId from jobId (format: qna_{questionId}_{timestamp})
        const parts = jobId.split('_');
        if (parts.length >= 2) {
          const questionId = parts[1];
          try {
            // Update question status in database
            await prisma.question.updateMany({
              where: { id: questionId },
              data: {
                updatedAt: new Date(),
                // Note: We don't set answer here, that's done by resultProcessor
              }
            });
            console.log(`📝 Updated question ${questionId} status to ${status}`);
          } catch (dbError) {
            console.error(`❌ Failed to update question ${questionId} status:`, dbError);
          }
        }
      } else if (jobId.startsWith('issue_fix_')) {
        // Update issue fix in database
        // Extract ID from format: issue_fix_{id}_{timestamp}
        const parts = jobId.split('_');
        const issueFixId = parts.slice(2, -1).join('_'); // Remove 'issue', 'fix', and timestamp

        if (!issueFixId) {
          console.error(`❌ Invalid issue_fix jobId format: ${jobId}`);
        } else {
          try {
            // Check if record exists first
            const existingIssueFix = await prisma.issueFix.findUnique({
              where: { id: issueFixId }
            });

            if (existingIssueFix) {
              // Map job status to IssueFixStatus enum
              const statusMapping: Record<string, any> = {
                'pending': 'PENDING',
                'analyzing': 'ANALYZING',
                'retrieving': 'RETRIEVING_CODE',
                'generating': 'GENERATING_FIX',
                'validating': 'VALIDATING',
                'ready': 'READY_FOR_REVIEW',
                'ready_for_review': 'READY_FOR_REVIEW',
                'creating_pr': 'CREATING_PR',
                'completed': 'COMPLETED',
                'failed': 'FAILED',
                'cancelled': 'CANCELLED'
              };

              const mappedStatus = statusMapping[status.toLowerCase()] || 'PENDING';

              // Update existing record
              await prisma.issueFix.update({
                where: { id: issueFixId },
                data: {
                  status: mappedStatus,
                  proposedFix: result ? result : null,
                  explanation: result?.explanation || null,
                  confidence: result?.confidence || null,
                  completedAt: status === 'completed' ? new Date() : null,
                  errorMessage: error || null,
                  updatedAt: new Date()
                }
              });
              console.log(`✅ Updated issue fix ${issueFixId} to status: ${mappedStatus} (from job status: ${status})`);
            } else {
              console.warn(`⚠️ Issue fix record not found: ${issueFixId} (jobId: ${jobId})`);
              console.warn(`   Status: ${status}, Result available: ${!!result}`);
            }
          } catch (dbError) {
            console.error(`❌ Failed to update issue fix ${issueFixId}:`, dbError);
          }
        }
      } else if (jobId.startsWith('meeting_')) {
        // Handle meeting jobs
        await updateMeetingStatus(jobId, status, result, error);
      } else {
        console.warn(`⚠️ Unknown job type for jobId: ${jobId}`);
      }

      console.log(`📊 Job ${jobId} updated: ${status} (${progress}%)`);
      if (status === 'completed' || status === 'failed') {
        console.log(`✅ Job ${jobId} finished with status: ${status}`);
      }
    } catch (error) {
      console.error('Error processing job update:', error);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker gracefully...');
  await redis.disconnect();
  await subscriber.disconnect();
  await prisma.$disconnect();

  // Stop processors
  await fileMetadataProcessor.stop();
  await repositoryCompletionProcessor.stop();
  await resultProcessor.stop();
  await fileSummaryProcessor.stop();

  process.exit(0);
});

// Initialize database processors
const fileMetadataProcessor = new FileMetadataProcessor();
const repositoryCompletionProcessor = new RepositoryCompletionProcessor();
const resultProcessor = new ResultProcessor();
const fileSummaryProcessor = new FileSummaryProcessor();

// Start processors
async function startProcessors() {
  try {
    await fileMetadataProcessor.start();
    await repositoryCompletionProcessor.start();
    await resultProcessor.start();
    await fileSummaryProcessor.start();
    console.log('✅ All database processors started successfully');
  } catch (error) {
    console.error('❌ Failed to start database processors:', error);
    process.exit(1);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`[SERVER] Node.js Task Manager running on port ${PORT}`);
  console.log(`📡 Connected to Redis: ${process.env.REDIS_URL}`);
  console.log(`🎯 Queue name: ${process.env.QUEUE_NAME || 'gittldr_tasks'}`);

  // Start database processors
  await startProcessors();
});

export default app;
