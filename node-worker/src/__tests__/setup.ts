/**
 * Jest test setup file.
 * Runs before each test file to set up global mocks and configurations.
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.QUEUE_NAME = 'gittldr_tasks_test';

// Mock Redis - use explicit any type to avoid TypeScript errors
jest.mock('ioredis', () => {
    const mockRedis: any = {
        ping: jest.fn().mockResolvedValue('PONG' as any),
        get: jest.fn().mockResolvedValue(null as any),
        set: jest.fn().mockResolvedValue('OK' as any),
        hgetall: jest.fn().mockResolvedValue({} as any),
        hset: jest.fn().mockResolvedValue(1 as any),
        lpush: jest.fn().mockResolvedValue(1 as any),
        rpop: jest.fn().mockResolvedValue(null as any),
        publish: jest.fn().mockResolvedValue(1 as any),
        subscribe: jest.fn().mockResolvedValue(1 as any),
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK' as any),
        disconnect: jest.fn()
    };
    return jest.fn(() => mockRedis);
});

// Mock Prisma
jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            $connect: jest.fn().mockResolvedValue(undefined as any),
            $disconnect: jest.fn().mockResolvedValue(undefined as any),
            $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }] as any),
            repository: {
                findUnique: jest.fn().mockResolvedValue(null as any),
                findMany: jest.fn().mockResolvedValue([] as any),
                create: jest.fn().mockResolvedValue({ id: 'test-repo-id' } as any),
                update: jest.fn().mockResolvedValue({ id: 'test-repo-id' } as any)
            },
            question: {
                findUnique: jest.fn().mockResolvedValue(null as any),
                findMany: jest.fn().mockResolvedValue([] as any),
                create: jest.fn().mockResolvedValue({ id: 'test-question-id' } as any),
                update: jest.fn().mockResolvedValue({ id: 'test-question-id' } as any),
                updateMany: jest.fn().mockResolvedValue({ count: 1 } as any)
            },
            meeting: {
                findUnique: jest.fn().mockResolvedValue(null as any),
                findMany: jest.fn().mockResolvedValue([] as any),
                create: jest.fn().mockResolvedValue({ id: 'test-meeting-id' } as any),
                update: jest.fn().mockResolvedValue({ id: 'test-meeting-id' } as any)
            },
            issueFix: {
                findUnique: jest.fn().mockResolvedValue(null as any),
                update: jest.fn().mockResolvedValue({ id: 'test-issue-fix' } as any)
            }
        }))
    };
});

// Cleanup after all tests
afterAll(async () => {
    // Allow time for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
});
