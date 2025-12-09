# GitTLDR Python Worker

The AI-powered backend service for GitTLDR that handles heavy lifting for code analysis, intelligent Q&A, automated GitHub issue fixing, and meeting summarization. Built with FastAPI and integrates Google Gemini AI to transform raw GitHub data into actionable insights.

## What This Service Does

### Core Features

- **Automated GitHub Issue Fixing** 🔧  
  Analyzes GitHub issues, retrieves relevant code using vector embeddings, generates validated fixes using Tree-of-Thought reasoning, and creates pull requests automatically.

- **Intelligent Q&A** 💬  
  Answers questions about repositories using RAG (Retrieval-Augmented Generation) with Qdrant vector database and Gemini AI.

- **Meeting Transcription & Summarization** 🎤  
  Processes audio transcripts from team meetings, generates summaries with action items, and links decisions to repository context.

- **Repository Analysis** 📊  
  Generates embeddings for code files, builds knowledge graphs with Neo4j, and enables semantic search across entire codebases.

- **GitHub Function Calling** 🔌  
  Integrates with GitHub API to fetch commits, PRs, issues, and diffs in response to natural language questions.

## Architecture

```
python-worker/
├── main.py                  # Combined entry point (API + Worker)
├── api_server.py            # FastAPI HTTP endpoints (port 8001)
├── worker.py                # Background job processor (Redis queue)
├── agents/                  # AI agents for issue fixing
│   ├── meta_controller.py   # Orchestrates the fix generation pipeline
│   ├── tree_of_thought_generator.py  # ToT reasoning for code generation
│   ├── multi_layer_validator.py      # Validates generated fixes
│   ├── precision_retrieval_agent.py  # Retrieves relevant code context
│   └── confidence_gated_pr_creator.py # Creates PRs with confidence scoring
├── processors/              # Task processors
│   ├── embedding.py         # Vector embedding generation
│   ├── file_processor.py    # Repository file analysis
│   ├── issue_fix_processor.py # Issue fix processing
│   └── meeting_summarizer.py # Meeting transcript processing
├── services/                # External integrations
│   ├── gemini_client.py     # Google Gemini AI (with key rotation)
│   ├── qdrant_client.py     # Vector database
│   ├── database_service.py  # PostgreSQL operations
│   ├── redis_client.py      # Job queue management
│   └── neo4j_client.py      # Knowledge graph database
└── config/
    └── settings.py          # Environment configuration
```

## How It Works

### Issue Fix Pipeline (RATFV Architecture)

1. **Retrieval** - PrecisionRetrievalAgent fetches relevant code from Qdrant vector store
2. **Analysis** - DeepUnderstandingAgent analyzes the issue and code context
3. **Thinking** - TreeOfThoughtGenerator uses multi-path reasoning to generate fixes
4. **Fix** - CompleteFileGenerator produces complete file modifications
5. **Validation** - MultiLayerValidator checks syntax, logic, and security

### Q&A Processing

1. **Query Understanding** - Detects if question needs GitHub API data
2. **Context Retrieval** - Searches vector database for relevant code/docs
3. **Function Calling** - Executes GitHub tools if needed (commits, PRs, issues)
4. **Answer Generation** - Gemini generates contextual response with citations

## Development Setup

### Prerequisites
- Python 3.11+
- Redis (for job queue)
- PostgreSQL (shared with node-worker)
- Qdrant (vector database)
- Google Gemini API key

### Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in your API keys and service URLs
   ```

3. **Start the services:**
   ```bash
   # Option 1: Combined mode (recommended for deployment)
   python main.py
   
   # Option 2: Separate processes (for development)
   # Terminal 1 - API server
   python api_server.py
   
   # Terminal 2 - Background worker
   python worker.py
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:8001/health
   # Returns: {"status": "healthy", "services": {...}}
   ```

## Environment Variables

```bash
# AI Services
GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_KEYS=key1,key2,key3  # Multiple keys for rotation

# Database
DATABASE_URL=postgresql://user:pass@host:5432/gittldr

# Redis (job queue)
REDIS_URL=redis://localhost:6379
QUEUE_NAME=gittldr_tasks

# Qdrant (vector database)
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-key

# Neo4j (optional, for knowledge graphs)
NEO4J_URI=neo4j+s://your-instance.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Feature flags
ENABLE_GRAPH_RETRIEVAL=true
ENABLE_MULTI_STEP_RETRIEVAL=true
USE_GEMINI_EMBEDDINGS=true
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/qna` | POST | Process Q&A question |
| `/debug/gemini-status` | GET | Gemini API status |
| `/debug/reset-circuit-breakers` | POST | Reset rate limiters |
| `/api/attachments/upload` | POST | Upload file attachments |
| `/api/clarification/*` | POST | Handle fix clarifications |

## Testing

```bash
# Install test dependencies
pip install -r requirements-test.txt

# Run tests
pytest -v

# Run with coverage
pytest --cov=tests --cov-report=html
```

See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed test results.

## Deployment

### Render (Free Tier)

The `main.py` entry point runs both the API server and background worker in a single process, which works on Render's free web service tier.

```bash
# Dockerfile uses main.py
CMD ["python", "main.py"]
```

### Docker

```bash
docker build -t gittldr-python-worker .
docker run -p 8001:8001 --env-file .env gittldr-python-worker
```

## Performance Notes

- **API Key Rotation**: Supports multiple Gemini API keys for higher throughput
- **Async Processing**: All AI calls are asynchronous for concurrent handling
- **Connection Pooling**: Reuses database and service connections
- **Circuit Breakers**: Automatic fallback when rate limits are hit
- **Exponential Backoff**: Worker uses adaptive polling when queue is empty

---

*Port: 8001 | Framework: FastAPI | AI: Google Gemini*
