"""
Configuration management for GitTLDR Python Worker.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""    # API Keys (optional for development)
    gemini_api_key: str = "your-gemini-api-key"
    deepseek_api_key: Optional[str] = None
    github_token: Optional[str] = None
    qdrant_api_key: Optional[str] = None
      # Service URLs
    redis_url: str = "redis://localhost:6379"
    qdrant_url: str = "http://localhost:6333"
    database_url: str = "postgresql://user:password@localhost:5432/gittldr"
    
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
    
    # B2 Storage Configuration
    b2_application_key_id: Optional[str] = None
    b2_application_key: Optional[str] = None
    b2_bucket_name: Optional[str] = None
    b2_endpoint_url: Optional[str] = None
    b2_region: Optional[str] = None
    
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
