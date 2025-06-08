# GitTLDR - Restructured Architecture

## 🏗️ Updated Architecture

```
GitTLDR/
├── frontend/              # Next.js Full-Stack Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/       # API Routes (Auth, Billing, Repositories, Q&A)
│   │   │   ├── (pages)/   # UI Pages
│   │   │   └── globals.css
│   │   ├── components/    # React Components
│   │   ├── lib/          # Utilities, Database, Services
│   │   └── types/        # TypeScript Types
│   └── package.json
├── node-worker/          # Node.js Task Processor
│   ├── src/
│   │   ├── index.ts      # Main worker entry
│   │   ├── processors/   # Job processors
│   │   └── services/     # Redis, Queue management
│   └── package.json
└── python-worker/        # Python AI Processor
    ├── worker.py
    ├── processors/       # AI/ML processing
    └── services/         # Gemini, Qdrant clients
```

## 🔄 Data Flow & Security

### Credential Security
- **Frontend**: No AI service credentials (secure!)
- **Node Worker**: Database, GitHub, Stripe credentials
- **Python Worker**: Only AI service credentials (Gemini, Qdrant)

### Communication Flow
```
User Request → Next.js API → Node Worker → Python Worker → AI Services
                    ↓              ↓            ↓
              Database        Redis Queue   Gemini/Qdrant
```

## 🔄 Responsibilities

### Next.js Frontend (Full-Stack)
- **UI/UX**: All user interfaces and components
- **API Routes**: Authentication, billing, repository CRUD, Q&A endpoints
- **Database**: User management, repository metadata, billing
- **GitHub Integration**: OAuth, webhooks, repository fetching
- **State Management**: User sessions, application state

### Node.js Worker
- **Task Orchestration**: Receive heavy processing requests
- **Job Queuing**: Manage Redis queues for AI tasks
- **File Processing**: Prepare files for AI processing
- **Status Updates**: Report progress back to frontend

### Python Worker
- **AI Processing**: Gemini API calls for summarization
- **Vector Operations**: Embedding generation and storage
- **ML Tasks**: Meeting transcription processing

This architecture is much cleaner and follows modern full-stack patterns!
