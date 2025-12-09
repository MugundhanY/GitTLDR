# GitTLDR

<div align="center">
  <img src="frontend/public/GitTLDR_logo.png" alt="GitTLDR Logo" width="120" />
</div>

GitTLDR transforms how development teams understand and collaborate on code repositories. Built from frustration with lengthy code reviews and scattered repository insights, this platform combines AI-powered analysis with real-time team coordination to make repository management actually efficient.

## What GitTLDR Does

### AI-Powered Repository Intelligence
Extract meaningful insights from your repositories without drowning in documentation. Our AI analyzes commit patterns, identifies code relationships, and generates summaries that actually help developers understand what's happening.

### Automated GitHub Issue Fixing 
Transform GitHub issues into working code automatically. Our AI analyzes issue descriptions, understands your codebase context through vector embeddings, generates validated fixes using Tree-of-Thought reasoning, and creates pull requests with confidence scoring.

### Intelligent Q&A
Ask questions about your codebase in natural language. Get answers with citations to specific files and lines, powered by RAG (Retrieval-Augmented Generation) and Google Gemini AI.

### Meeting Integration & Transcription
Connect your development meetings to repository context. Record team discussions, automatically transcribe them, and link decisions back to specific code changes or repository events.

### Real-Time Team Coordination
See who's working on what, track changes as they happen, and get notified about relevant updates.

## Repository Structure

```
GitTLDR/
├── frontend/        # Next.js 15 dashboard and web interface (port 3000)
├── node-worker/     # Express.js API server and task orchestration (port 3001)
├── python-worker/   # FastAPI AI processing and embeddings (port 8001)
└── load-tests/      # k6 performance testing scripts
```

### Service Responsibilities

- **Frontend**: User interface, authentication, real-time updates via WebSocket
- **Node Worker**: GitHub integration, webhooks, queue management, database operations
- **Python Worker**: AI summarization, vector embeddings, semantic search, issue fix generation

## Core Features

### Repository Analysis
- Automatic commit history analysis and pattern detection
- Code relationship mapping across files and contributors
- Integration health monitoring and dependency tracking

### AI-Powered Insights
- Intelligent code and documentation summarization using Google Gemini
- Vector-based semantic search across repositories and meeting transcripts
- Context-aware explanations for complex code changes
- **Automated issue analysis and fix generation**

### Team Collaboration
- Real-time notifications for relevant repository events
- Meeting transcription with automatic linking to repository context
- Shared workspace for repository insights and team coordination

### Automated Issue Resolution
- AI-powered analysis of GitHub issue descriptions
- Precision code retrieval using vector embeddings and AST parsing
- Multi-layer validation with confidence scoring
- Automatic PR creation with detailed change explanations

## Technology Choices

| Component | Technology | Why We Chose It |
|-----------|------------|--------------------|
| **Frontend** | Next.js 15, React 19, TypeScript | Server-side rendering, excellent TypeScript support |
| **API Layer** | Node.js, Express, Prisma | Familiar ecosystem, great GitHub API integration |
| **AI Processing** | Python, FastAPI, Google Gemini | Best-in-class ML libraries, async processing |
| **Database** | PostgreSQL, Redis, Qdrant | ACID transactions, fast caching, vector search |
| **Knowledge Graph** | Neo4j | Code relationship mapping |
| **Infrastructure** | Docker, Render, Vercel | Simple deployment, automatic scaling |

## Getting Started Locally

### Prerequisites
- Node.js 18+ and Python 3.11+
- PostgreSQL and Redis instances
- GitHub OAuth application
- Google Gemini API key

### Quick Setup

1. **Clone and configure:**
   ```bash
   git clone https://github.com/MugundhanY/GitTLDR.git
   cd GitTLDR
   
   cp frontend/.env.example frontend/.env
   cp node-worker/.env.example node-worker/.env  
   cp python-worker/.env.example python-worker/.env
   ```

2. **Install dependencies:**
   ```bash
   cd frontend && npm install && cd ..
   cd node-worker && npm install && cd ..
   cd python-worker && pip install -r requirements.txt && cd ..
   ```

3. **Set up database:**
   ```bash
   cd frontend
   npx prisma migrate dev
   npx prisma generate
   cd ..
   ```

4. **Start all services** (in separate terminals):
   ```bash
   # Frontend (http://localhost:3000)
   cd frontend && npm run dev
   
   # Node worker (http://localhost:3001)  
   cd node-worker && npm run dev
   
   # Python worker (http://localhost:8001)
   # Option 1: Combined mode (API + background worker)
   cd python-worker && python main.py
   
   # Option 2: Separate processes
   cd python-worker && python api_server.py  # API only
   cd python-worker && python worker.py      # Worker only
   ```

## Key Environment Variables

**GitHub Integration**
```
GITHUB_CLIENT_ID=your_github_app_client_id
GITHUB_CLIENT_SECRET=your_github_app_secret
```

**AI Services**
```
GEMINI_API_KEY=your_gemini_key
GEMINI_API_KEYS=key1,key2,key3  # Multiple keys for rotation
```

**Infrastructure**
```
DATABASE_URL=postgresql://user:password@localhost:5432/gittldr
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
```

## Architecture Decisions

### Microservices Approach
Independent scaling of AI processing (CPU/GPU intensive) versus web traffic (memory/network intensive). Node.js handles GitHub API rate limits, while Python excels at AI/ML workloads.

### Queue-Based Processing  
Repository analysis can take minutes for large repos. Redis lists and pub/sub process work asynchronously with real-time progress updates.

### Vector Search Integration
Semantic search using Qdrant that understands context and relationships, not just keywords.

## Testing

```bash
# Python Worker (25 tests)
cd python-worker && pip install -r requirements-test.txt && pytest -v

# Node Worker (13 tests)
cd node-worker && npm install && npm test
```

Test results:
- [python-worker/TEST_RESULTS.md](./python-worker/TEST_RESULTS.md)
- [node-worker/TEST_RESULTS.md](./node-worker/TEST_RESULTS.md)

### Load Testing

```bash
# Install k6: https://k6.io/docs/get-started/installation/
cd load-tests

# Quick test (services must be running)
k6 run --vus 2 --duration 10s k6-health.js

# Test deployed services
k6 run -e PYTHON_URL=https://your-app.onrender.com -e NODE_URL=https://your-node.onrender.com k6-health.js
```

## CI/CD Pipeline

GitHub Actions runs on every push:
- Python tests (pytest)
- Node tests (Jest)
- Frontend build verification
- Deployment to Render/Vercel on main branch

See [.github/workflows/ci.yml](./.github/workflows/ci.yml)

## Deployment

**Recommended: Render + Vercel (Free Tier)**
- Backend services on Render using `render.yaml` Blueprint
- Frontend on Vercel (global CDN)
- Neon for PostgreSQL, Upstash for Redis, Qdrant Cloud for vectors

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

**Alternative: Railway**
- $5 free credit, supports background workers
- Better for full functionality

---

**Documentation**: Each service directory contains detailed setup instructions, API documentation, and deployment guides.
