# GitTLDR Python Worker

AI-powered embed│   └── qdrant_client.py   # Vector database clienting and summarization worker for GitTLDR.

## Features

- Repository file processing
- AI-powered summarization using Gemini API
- Vector embedding generation
- Integration with Qdrant Cloud for vector storage
- Redis queue integration for task processing

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment configuration:**
   Create a `.env` file with:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   REDIS_URL=redis://localhost:6379   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key
   ```

3. **Run the worker:**
   ```bash
   python worker.py
   ```

## Architecture

```
python-worker/
├── worker.py              # Main worker entry point
├── processors/           
│   ├── embedding.py      # Embedding generation
│   ├── summarization.py  # Text summarization
│   └── file_processor.py # File content processing
├── services/
│   ├── gemini_client.py  # Gemini API integration
│   ├── quadrant_client.py # Vector database client
│   └── redis_client.py   # Redis queue client
├── utils/
│   ├── logger.py         # Logging utilities
│   └── helpers.py        # Common utilities
└── config/
    └── settings.py       # Configuration management
```

## Dependencies

- `google-generativeai`: Gemini API integration
- `redis`: Queue management
- `qdrant-client`: Vector database
- `python-dotenv`: Environment management
- `httpx`: HTTP client
- `numpy`: Numerical operations
- `tiktoken`: Token counting
