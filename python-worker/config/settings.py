"""
Configuration management for GitTLDR Python Worker.
"""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Environment Configuration
    node_env: str = "production"
    
    # Processing Mode: "API" or "WORKER"
    # API mode: Direct HTTP processing via api_server.py (no Redis needed)
    # WORKER mode: Async processing via worker.py with Redis queue
    processing_mode: str = "WORKER"
    
    # Service URLs for CORS configuration
    frontend_url: str = "https://gittldr.vercel.app"
    node_worker_url: str = ""
    
    # API Keys (optional for development)
    gemini_api_key: str = "your-gemini-api-key"
    # Multiple Gemini API keys for rotation (comma-separated)
    gemini_api_keys: Optional[str] = None  # Format: "key1,key2,key3"
    qdrant_api_key: Optional[str] = None
    # AssemblyAI for cloud-based transcription (lightweight deployments)
    assemblyai_api_key: Optional[str] = None
    
    # Embedding Configuration
    use_gemini_embeddings: bool = False  # Set to True to use Gemini, False for local model
    
    # Redis Optimization Settings
    store_qna_results: bool = True  # Set to False to reduce Redis writes
    skip_intermediate_task_status: bool = False  # Set to True to reduce Redis writes
      # Service URLs
    redis_url: str = "redis://localhost:6379"
    qdrant_url: str = "http://localhost:6333"
    database_url: str = "postgresql://user:password@localhost:5432/gittldr"
    
    # Neo4j Configuration
    neo4j_uri: Optional[str] = None
    neo4j_username: Optional[str] = None
    neo4j_password: Optional[str] = None
    neo4j_database: Optional[str] = None
    
    # Feature Flags
    enable_graph_retrieval: bool = True  # Enable Neo4j graph-based retrieval
    enable_multi_step_retrieval: bool = True  # Enable iterative context gathering
    enable_hybrid_retrieval: bool = True  # Enable hybrid retrieval (embeddings + graph + summaries + smart context)
    
    # Queue Configuration
    queue_name: str = "gittldr_tasks"
    max_workers: int = 4
      # Processing Configuration
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    chunk_size: int = 8192  # 8KB chunks
    max_tokens: int = 100000  # Gemini context limit
    
    # Batch Commit Summarization Configuration
    batch_commit_summarize_count: int = 10  # Number of recent commits to summarize during repo processing
    
    # Embedding Configuration
    embedding_dimension: int = 768
    collection_name: str = "gittldr_embeddings"
    # Meeting Summarization Embedding Collection
    meeting_qdrant_collection: str = "meeting_segments"  # Only source of truth for meeting segment embeddings
    # Meeting Summarization Embedding Dimension
    embedding_dimension_meeting: int = 384  # Separate dimension for meeting segment embeddings
    
    # B2 Storage Configuration
    b2_application_key_id: Optional[str] = None
    b2_application_key: Optional[str] = None
    b2_bucket_name: Optional[str] = None
    b2_endpoint_url: Optional[str] = None
    b2_region: Optional[str] = None
    # Add B2 meeting audio bucket config
    b2_meeting_audio_bucket: str = "gittldr-meeting-audio"
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra environment variables


# Global settings instance
_settings = None


def get_settings() -> Settings:
    """Get application settings."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
