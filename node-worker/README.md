# GitTLDR Node Worker

This is the backend API service for GitTLDR, handling GitHub integration, repository analysis, and job orchestration. Built with Node.js, Express, and TypeScript, it manages the heavy lifting between the frontend and AI services.

## What This Service Does

- **GitHub API Integration**: Handles OAuth, webhooks, repository cloning, and commit analysis using Octokit
- **Queue Management**: Processes repository analysis jobs asynchronously using Redis lists and pub/sub
- **Database Operations**: Manages all data persistence through Prisma ORM with PostgreSQL
- **Inter-service Communication**: Coordinates with the Python AI worker for summarization and embeddings
- **Webhook Processing**: Receives and processes GitHub repository events for real-time updates
- **Authentication**: JWT-based auth with secure session management

## Project Structure

```
node-worker/
├── src/
│   ├── index.ts         # Express server setup and middleware configuration
│   └── processors/      # Queue job processors for different tasks
├── prisma/              # Database schema and migrations
└── package.json         # Dependencies and scripts
```

## Key Technical Decisions

- **Redis for Job Processing**: Repository analysis can take minutes for large repos, so we use Redis lists and pub/sub to avoid blocking HTTP requests. This allows the frontend to show progress and handle failures gracefully.
- **Prisma for Database**: Type-safe database operations were critical for reliability. Prisma generates TypeScript types from the schema, catching database-related bugs at compile time.
- **Octokit for GitHub**: Official GitHub SDK handles authentication, rate limiting, and API versioning automatically. Much more reliable than building custom HTTP clients.
- **Express Middleware Architecture**: Clean separation of concerns with dedicated middleware for auth, validation, error handling, and logging.

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+ or yarn
- PostgreSQL 14+
- Redis 6.2+
- GitHub App credentials

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in GitHub App credentials, database URL, Redis URL
   ```

3. Set up database:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. Start development server:
   ```bash
   npm run dev
   # API at http://localhost:3001
   ```

## Scripts

- `npm run dev` – Start with nodemon and hot reload
- `npm run build` – Compile TypeScript to JavaScript
- `npm run start` – Run compiled production server
- `npm run type-check` – Validate TypeScript without building

## Environment Variables

```bash
# Environment Configuration  
NODE_ENV=development  
PORT=3001  
  
# Database  
DATABASE_URL="postgresql://username:password@localhost:5432/gittldr?schema=public"

# Redis  
REDIS_URL="redis://localhost:6379" 
```

## Queue Architecture

We use Redis lists for different job types:

```typescript
// Different Redis queues for different operations
const queues = {
  'result_queue': 'Generic processing results',
  'commit_summary_results': 'Commit analysis results',
  'qna_results': 'Q&A processing results',
  'meeting_status_updates': 'Meeting processing updates'
}
```

Jobs are processed using Redis RPOP/LPUSH operations. Failed jobs are retried by pushing them back to the front of the queue. We use Redis pub/sub for real-time status updates between services.

## GitHub Integration

- **Rate Limiting**: GitHub allows 5000 requests/hour for authenticated apps. We track usage and implement backoff when approaching limits.
- **Webhook Security**: All webhook payloads are verified using HMAC signatures to prevent spoofing.
- **Repository Access**: We only request the minimum permissions needed—repository metadata and commit history, not code content.
- **OAuth Flow**: Standard GitHub OAuth with proper state validation and PKCE where supported.

## Communication with Python Worker

Repository content and meeting transcripts are sent to the Python worker for AI processing. We use HTTP with retry logic and circuit breakers—if the AI service is down, jobs are queued for later processing rather than failing permanently.

Results (summaries and embeddings) are stored in the database and cached in Redis for quick access.

## Production Considerations

- **Health Checks**: `/health` endpoint reports database, Redis, and GitHub API connectivity
- **Graceful Shutdown**: Server waits for in-flight requests to complete before shutting down
- **Error Logging**: Structured JSON logs with correlation IDs for request tracing
- **Rate Limiting**: Per-user rate limits prevent abuse of GitHub API quotas
