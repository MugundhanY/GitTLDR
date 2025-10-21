# GitTLDR Python Worker

The AI-powered backend service for GitTLDR that handles all the heavy lifting for code analysis, meeting summarization, and intelligent Q&A. Built with FastAPI and integrates multiple AI providers to turn raw GitHub data and meeting transcripts into actionable insights.

## What This Service Does

- **Meeting Summarization**: Processes audio transcripts from GitHub repository discussions and team meetings using Claude/GPT models
- **Code Embeddings**: Generates vector embeddings for code files and repository content for semantic search and Q&A
- **Intelligent Q&A**: Answers questions about repositories using RAG (Retrieval-Augmented Generation) with Qdrant vector database
- **Commit Analysis**: Analyzes GitHub commit patterns and generates insights about development velocity and code health
- **Multi-Modal Processing**: Handles text, audio transcripts, and code files with different AI models optimized for each content type

## Project Structure

```
python-worker/
├── api_server.py           # FastAPI application with all HTTP endpoints
├── worker.py              # Background task processor for long-running jobs
├── requirements.txt       # Python dependencies
├── api/                   # HTTP endpoint handlers
│   ├── attachments.py     # File upload and processing endpoints
│   ├── lightweight_thinking.py    # Quick response AI endpoints
│   ├── pure_thinking.py   # Core AI reasoning endpoints
│   └── thinking_context.py       # Context-aware AI responses
├── config/
│   └── settings.py        # Environment configuration and AI model settings
├── processors/            # Core AI processing modules
│   ├── embedding.py       # Vector embedding generation for code and text
│   ├── file_processor.py  # Repository file processing and analysis
│   ├── meeting_summarizer.py  # Meeting transcript analysis and summarization
│   └── summarization.py   # Repository and commit summarization
├── services/              # External service integrations
│   ├── gemini_client.py   # Google Gemini integration for AI tasks
│   ├── qdrant_client.py   # Vector database for embeddings storage
│   ├── redis_client.py    # Cache and session management
│   └── database_service.py # PostgreSQL integration for metadata
└── utils/
    └── logger.py          # Structured logging with correlation tracking
```

## Why These AI Models

- **Gemini for All AI Tasks**: We use Google's Gemini for all text generation, code analysis, summarization, and Q&A with multi-step reasoning. It's fast, reliable, has excellent chain-of-thought capabilities, and provides great rate limits.
- **Embedding Models**: We use sentence-transformers like `all-MiniLM-L6-v2` for creating vector embeddings because they work well for semantic search across code and documentation.
- **Qdrant Vector DB**: Handles vector similarity search much faster than traditional databases, crucial for real-time Q&A responses.

## Development Setup

### Prerequisites
- Python 3.11+
- pip or poetry
- Redis (for caching and job queues)
- Qdrant (vector database)
- PostgreSQL (shared with node-worker)
- Google Gemini API key

### Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Add your Gemini API key (GEMINI_API_KEY) and service URLs
   ```

3. Start services:
   ```bash
   # Start the FastAPI server
   uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload

   # In another terminal, start the background worker
   python worker.py
   ```

4. Verify it's working:
   ```bash
   curl http://localhost:8000/health
   # Should return {"status": "healthy"}
   ```

## Scripts

- `python api_server.py` – Start FastAPI server for HTTP requests
- `python worker.py` – Start background task processor
- `python -m pytest tests/` – Run test suite
- `python -m black .` – Format code
- `python -m flake8` – Lint code

## Environment Variables

```bash
# Environment Configuration
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gittldr

# Redis for job queue
REDIS_URL=redis://localhost:6379

# API Keys
GEMINI_API_KEY=your-gemini-api-key

# Qdrant Vector Database
QDRANT_URL=your-qdrant-cloud-url
QDRANT_API_KEY=your-qdrant-api-key

# Backblaze B2 Storage
B2_APPLICATION_KEY_ID=your-b2-application-key-id
B2_APPLICATION_KEY=your-b2-application-key
B2_BUCKET_NAME=your-b2-bucket-name
B2_ENDPOINT_URL=your-b2-endpoint-url
B2_REGION=your-b2-region

# Queue Configuration
QUEUE_NAME=gittldr_tasks

# Logging
LOG_LEVEL=info
```

## AI Processing Pipeline

### Meeting Analysis Flow
1. **Transcript Preprocessing**: Clean audio transcription, fix common speech-to-text errors
2. **Segmentation**: Break long meetings into logical chunks (by speaker, topic, or time)
3. **Summarization**: Generate executive summary, key decisions, action items, and participant insights
4. **Metadata Extraction**: Extract mentioned repositories, issues, pull requests, and deadlines
5. **Storage**: Save summary and create embeddings for future Q&A

### Code Analysis Flow
1. **Repository Ingestion**: Receive repository data from node-worker
2. **File Filtering**: Skip binary files, tests, and generated code based on gitignore patterns
3. **Chunking**: Split large files into manageable pieces while preserving context
4. **Embedding Generation**: Create vector representations using code-specific models
5. **Index Storage**: Store in Qdrant with metadata for retrieval

### Q&A Processing
1. **Query Understanding**: Parse natural language questions about repositories or meetings
2. **Context Retrieval**: Search vector database for relevant code snippets, commits, or meeting segments
3. **Context Assembly**: Combine retrieved content with repository metadata and recent activity
4. **Answer Generation**: Use AI models to generate accurate, contextual responses
5. **Citation**: Include references to specific files, lines, or meeting timestamps

## Performance Optimizations

- **Async Processing**: All AI calls are asynchronous to handle multiple requests concurrently
- **Batch Embedding**: Process multiple text chunks together to reduce API overhead
- **Response Caching**: Cache AI responses for common questions in Redis
- **Model Selection**: Route requests to the most appropriate AI model based on content type and complexity
- **Connection Pooling**: Reuse database and AI service connections

## AI Model Router

We use Google Gemini for all AI tasks with multi-step reasoning:

```python
# All tasks use Gemini with optimized prompts
if task_type == "complex_analysis":
    model = "gemini-2.0-flash-lite"
    use_reasoning = True  # Enable multi-step chain-of-thought
    
# Summarization tasks
elif task_type == "summarization":
    model = "gemini-2.0-flash-lite"
    
# Quick Q&A
elif task_type == "quick_qa":
    model = "gemini-2.0-flash-lite"
    
# Code analysis with reasoning steps
elif task_type == "code_analysis":
    model = "gemini-2.0-flash-lite"
    use_reasoning = True
```

## Error Handling

- **AI Service Failures**: Automatic fallback to alternative models if primary service is down
- **Rate Limiting**: Respect API rate limits with exponential backoff and request queuing
- **Partial Failures**: If processing a large repository fails partway through, save progress and retry from the last successful chunk
- **Validation**: Verify AI responses make sense before storing or returning to users

## Integration with Node Worker

The Python worker receives jobs through HTTP endpoints from the Node worker:

- `POST /analyze/repository` – Process repository content for Q&A
- `POST /summarize/meeting` – Generate meeting summaries from transcripts
- `POST /analyze/commits` – Analyze commit patterns and generate insights
- `GET /query/repository/{repo_id}` – Answer questions about specific repositories

All responses include confidence scores and citations so the frontend can show users how reliable the information is.

## Production Considerations

- **Horizontal Scaling**: Multiple worker instances can run concurrently, jobs are distributed via Redis
- **Model Versioning**: Track which AI model version generated each response for consistency
- **Cost Monitoring**: Log AI API usage and costs per repository/user for billing and optimization
- **Data Privacy**: Repository content is processed but not permanently stored; only embeddings and summaries are kept
