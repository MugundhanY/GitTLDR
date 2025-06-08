import express, { Request, Response } from 'express';
import Redis from 'ioredis';
import cors from 'cors';
import dotenv from 'dotenv';
import { FileMetadataProcessor } from './processors/fileMetadataProcessor';
import { RepositoryCompletionProcessor } from './processors/repositoryCompletionProcessor';
import { ResultProcessor } from './processors/resultProcessor';
import { FileSummaryProcessor } from './processors/fileSummaryProcessor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Redis connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
    const { questionId, repositoryId, userId, question } = req.body;
    
    if (!questionId || !repositoryId || !userId || !question) {
      return res.status(400).json({ error: 'Missing required fields' });
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
      timestamp: new Date().toISOString()
    }));
    
    console.log(`❓ Queued QnA job for question ${questionId}`);
    
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
      type: 'meeting',
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
      type: 'meeting',
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

// Commit summarization endpoint
app.post('/process-commit-summary', async (req: Request, res: Response) => {
  try {
    const { taskId, repositoryId, userId, commitData, changes, type } = req.body;
    
    if (!taskId || !repositoryId || !userId || !commitData || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create job record
    await redis.hset(`job:${taskId}`, {
      id: taskId,
      type: 'summarize_commit',
      repositoryId,
      userId,
      commitSha: commitData.sha,
      status: 'queued',
      createdAt: new Date().toISOString(),
      progress: '0'
    });
    
    // Queue job for Python worker
    await redis.lpush(process.env.QUEUE_NAME || 'gittldr_tasks', JSON.stringify({
      id: taskId,
      type: 'summarize_commit',
      repositoryId,
      userId,
      commit: commitData,
      changes: changes || [],
      timestamp: new Date().toISOString()
    }));
    
    console.log(`📝 Queued commit summary job for commit ${commitData.sha}`);
    
    res.json({ taskId, status: 'queued' });
  } catch (error) {
    console.error('Error processing commit summary:', error);
    res.status(500).json({ error: 'Failed to queue commit summarization' });
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

// Listen for job updates from Python worker
subscriber.subscribe('job_updates');
subscriber.on('message', async (channel, message) => {
  if (channel === 'job_updates') {
    try {
      const update = JSON.parse(message);
      const { jobId, status, progress, result, error } = update;
      
      // Update job status in Redis
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (progress !== undefined) updateData.progress = progress;
      if (result) updateData.result = JSON.stringify(result);
      if (error) updateData.error = error;
      
      await redis.hset(`job:${jobId}`, updateData);
      
      console.log(`📊 Job ${jobId} updated: ${status} (${progress}%)`);
      
      // If job is complete, optionally notify frontend via webhook or WebSocket
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
  console.log(`🚀 Node.js Task Manager running on port ${PORT}`);
  console.log(`📡 Connected to Redis: ${process.env.REDIS_URL}`);
  console.log(`🎯 Queue name: ${process.env.QUEUE_NAME || 'gittldr_tasks'}`);
  
  // Start database processors
  await startProcessors();
});

export default app;
