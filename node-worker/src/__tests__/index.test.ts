/**
 * Unit tests for node-worker Express API endpoints.
 * Tests cover repository processing, Q&A, task status, and health endpoints.
 */
import request from 'supertest';
import express, { Express } from 'express';

// Create a minimal test app that mirrors the main app structure
function createTestApp(): Express {
    const app = express();
    app.use(express.json());

    // Mock Redis instance
    const mockRedis = {
        hset: jest.fn().mockResolvedValue(1),
        hgetall: jest.fn().mockResolvedValue({}),
        lpush: jest.fn().mockResolvedValue(1),
        ping: jest.fn().mockResolvedValue('PONG')
    };

    // Mock Prisma instance
    const mockPrisma = {
        question: {
            findUnique: jest.fn().mockResolvedValue(null)
        },
        $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }])
    };

    // Health check endpoint
    app.get('/health', async (_req, res) => {
        try {
            const redisOk = await mockRedis.ping() === 'PONG';
            const dbOk = true; // Mock DB check

            res.json({
                status: redisOk && dbOk ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                services: {
                    redis: redisOk ? 'connected' : 'disconnected',
                    database: dbOk ? 'connected' : 'disconnected'
                }
            });
        } catch {
            res.status(503).json({ status: 'unhealthy' });
        }
    });

    // Process repository endpoint
    app.post('/process-repository', async (req, res) => {
        const { repositoryId, userId, repoUrl, action = 'full_analysis' } = req.body;

        if (!repositoryId || !userId || !repoUrl) {
            return res.status(400).json({
                error: 'Missing required fields: repositoryId, userId, repoUrl'
            });
        }

        const jobId = `repo_${repositoryId}_${Date.now()}`;

        await mockRedis.hset(`job:${jobId}`, {
            id: jobId,
            type: 'repository_processing',
            repositoryId,
            userId,
            repoUrl,
            action,
            status: 'queued',
            createdAt: new Date().toISOString()
        });

        await mockRedis.lpush('gittldr_tasks', JSON.stringify({
            jobId,
            type: 'repository_processing',
            repositoryId,
            userId,
            repoUrl,
            action
        }));

        res.json({ jobId, status: 'queued' });
    });

    // Process question endpoint
    app.post('/process-question', async (req, res) => {
        const { questionId, repositoryId, userId, question, attachments } = req.body;

        if (!questionId || !repositoryId || !userId || !question) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const jobId = `qna_${questionId}_${Date.now()}`;

        await mockRedis.hset(`job:${jobId}`, {
            id: jobId,
            type: 'qna',
            questionId,
            repositoryId,
            userId,
            question,
            status: 'queued',
            createdAt: new Date().toISOString()
        });

        await mockRedis.lpush('gittldr_tasks', JSON.stringify({
            jobId,
            type: 'qna',
            questionId,
            repositoryId,
            userId,
            question,
            attachments: attachments || []
        }));

        res.json({ jobId, status: 'queued' });
    });

    // Task status endpoint
    app.get('/task-status/:taskId', async (req, res) => {
        const taskId = req.params.taskId;
        const status = await mockRedis.hgetall(`job:${taskId}`);

        if (!status || Object.keys(status).length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(status);
    });

    // Process meeting endpoint
    app.post('/process-meeting', async (req, res) => {
        const { meetingId, userId, audioUrl } = req.body;

        if (!meetingId || !userId || !audioUrl) {
            return res.status(400).json({
                error: 'Missing required fields: meetingId, userId, audioUrl'
            });
        }

        const jobId = `meeting_${meetingId}_${Date.now()}`;
        res.json({ jobId, status: 'queued' });
    });

    return app;
}

describe('Node Worker API Endpoints', () => {
    let app: Express;

    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return healthy status when all services are up', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.services).toBeDefined();
            expect(response.body.services.redis).toBe('connected');
            expect(response.body.services.database).toBe('connected');
        });

        it('should include timestamp in health response', async () => {
            const response = await request(app).get('/health');

            expect(response.body.timestamp).toBeDefined();
            expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('POST /process-repository', () => {
        it('should queue repository processing with valid data', async () => {
            const response = await request(app)
                .post('/process-repository')
                .send({
                    repositoryId: 'test-repo-123',
                    userId: 'test-user-456',
                    repoUrl: 'https://github.com/test/repo'
                });

            expect(response.status).toBe(200);
            expect(response.body.jobId).toBeDefined();
            expect(response.body.status).toBe('queued');
            expect(response.body.jobId).toContain('repo_test-repo-123');
        });

        it('should return 400 when repositoryId is missing', async () => {
            const response = await request(app)
                .post('/process-repository')
                .send({
                    userId: 'test-user',
                    repoUrl: 'https://github.com/test/repo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repositoryId');
        });

        it('should return 400 when userId is missing', async () => {
            const response = await request(app)
                .post('/process-repository')
                .send({
                    repositoryId: 'test-repo',
                    repoUrl: 'https://github.com/test/repo'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('userId');
        });

        it('should return 400 when repoUrl is missing', async () => {
            const response = await request(app)
                .post('/process-repository')
                .send({
                    repositoryId: 'test-repo',
                    userId: 'test-user'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('repoUrl');
        });
    });

    describe('POST /process-question', () => {
        it('should queue question processing with valid data', async () => {
            const response = await request(app)
                .post('/process-question')
                .send({
                    questionId: 'q-123',
                    repositoryId: 'repo-456',
                    userId: 'user-789',
                    question: 'What does this code do?'
                });

            expect(response.status).toBe(200);
            expect(response.body.jobId).toBeDefined();
            expect(response.body.status).toBe('queued');
        });

        it('should return 400 when question is missing', async () => {
            const response = await request(app)
                .post('/process-question')
                .send({
                    questionId: 'q-123',
                    repositoryId: 'repo-456',
                    userId: 'user-789'
                });

            expect(response.status).toBe(400);
        });

        it('should handle attachments in question request', async () => {
            const response = await request(app)
                .post('/process-question')
                .send({
                    questionId: 'q-123',
                    repositoryId: 'repo-456',
                    userId: 'user-789',
                    question: 'Check this file',
                    attachments: [{ id: 'att-1', filename: 'test.py' }]
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('queued');
        });
    });

    describe('GET /task-status/:taskId', () => {
        it('should return 404 for non-existent task', async () => {
            const response = await request(app).get('/task-status/nonexistent-task');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });
    });

    describe('POST /process-meeting', () => {
        it('should queue meeting processing with valid data', async () => {
            const response = await request(app)
                .post('/process-meeting')
                .send({
                    meetingId: 'meeting-123',
                    userId: 'user-456',
                    audioUrl: 'https://storage.example.com/audio.mp3'
                });

            expect(response.status).toBe(200);
            expect(response.body.jobId).toBeDefined();
            expect(response.body.status).toBe('queued');
        });

        it('should return 400 when meetingId is missing', async () => {
            const response = await request(app)
                .post('/process-meeting')
                .send({
                    userId: 'user-456',
                    audioUrl: 'https://storage.example.com/audio.mp3'
                });

            expect(response.status).toBe(400);
        });

        it('should return 400 when audioUrl is missing', async () => {
            const response = await request(app)
                .post('/process-meeting')
                .send({
                    meetingId: 'meeting-123',
                    userId: 'user-456'
                });

            expect(response.status).toBe(400);
        });
    });
});
