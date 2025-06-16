"""
Database service for Q&A functionality.
Handles retrieving repository and file data from PostgreSQL database.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
import asyncpg
from services.b2_storage_sdk_fixed import B2StorageService
from utils.logger import get_logger
from config.settings import get_settings

logger = get_logger(__name__)


class DatabaseService:
    """Service for retrieving repository and file data from database."""
    
    def __init__(self):
        """Initialize database service."""
        self.b2_storage = None
        self.connection_pool = None
        try:
            self.settings = get_settings()
        except Exception as e:
            logger.error(f"Failed to load settings: {str(e)}")
            self.settings = None
        self._initialize_b2()
    
    def _initialize_b2(self):
        """Initialize B2 storage service if credentials are available."""
        try:
            self.b2_storage = B2StorageService()
            logger.info("B2 storage service initialized for database service")
        except Exception as e:
            logger.warning(f"B2 storage not available: {str(e)}")
            self.b2_storage = None
    async def _get_connection_pool(self):
        """Get or create database connection pool."""
        if not self.connection_pool:
            try:
                if not self.settings or not hasattr(self.settings, 'database_url'):
                    raise ValueError("DATABASE_URL not configured in settings")
                    
                self.connection_pool = await asyncpg.create_pool(
                    self.settings.database_url,
                    min_size=1,
                    max_size=5
                )
                logger.info("Database connection pool created")
            except Exception as e:
                logger.error(f"Failed to create database connection pool: {str(e)}")
                raise
        return self.connection_pool
    
    async def get_repository_status(self, repository_id: str) -> Optional[Dict[str, Any]]:
        """
        Get repository processing status from database.
        
        Args:
            repository_id: Repository ID
            
        Returns:
            Repository status dict or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    SELECT id, name, embedding_status, processed, file_count, total_size
                    FROM repositories 
                    WHERE id = $1
                    """,
                    repository_id
                )
                
                if row:
                    return {
                        'id': row['id'],
                        'name': row['name'],
                        'embedding_status': row['embedding_status'],
                        'processed': row['processed'],
                        'file_count': row['file_count'],
                        'total_size': row['total_size']
                    }
                else:
                    logger.warning(f"Repository {repository_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get repository status: {str(e)}")
            return None
    
    async def get_repository_files(self, repository_id: str) -> List[Dict[str, Any]]:
        """
        Get all files for a repository from database.
        
        Args:
            repository_id: Repository ID
            
        Returns:
            List of file metadata
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                rows = await connection.fetch(
                    """
                    SELECT id, path, name, type, size, summary, language, 
                           file_key, file_url, created_at, updated_at
                    FROM repository_files 
                    WHERE repository_id = $1
                    ORDER BY path
                    """,
                    repository_id
                )
                
                files = []
                for row in rows:
                    file_dict = {
                        'id': row['id'],
                        'path': row['path'],
                        'name': row['name'],
                        'type': row['type'],
                        'size': row['size'],
                        'summary': row['summary'],
                        'language': row['language'],
                        'file_key': row['file_key'],
                        'file_url': row['file_url'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
                        'content': None  # Will be loaded on demand
                    }
                    files.append(file_dict)
                
                logger.info(f"Retrieved {len(files)} files from database for repository {repository_id}")
                return files
                
        except Exception as e:
            logger.error(f"Failed to get repository files: {str(e)}")
            return []
    
    async def load_file_contents(self, files_metadata: List[Dict[str, Any]], 
                                question_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Load file contents from B2 storage for relevant files.
        
        Args:
            files_metadata: List of file metadata from database
            question_analysis: Analysis of the question to prioritize files
            
        Returns:
            List of files with content loaded
        """
        files_with_content = []
        
        # Filter files based on question analysis
        relevant_files = self._filter_relevant_files(files_metadata, question_analysis)
        
        # Load content for relevant files (limit to avoid overwhelming the AI)
        max_files = 20
        for i, file_info in enumerate(relevant_files[:max_files]):
            try:
                content = await self._load_file_content(file_info)
                if content:
                    file_with_content = file_info.copy()
                    file_with_content['content'] = content
                    files_with_content.append(file_with_content)
                    
                    logger.debug(f"Loaded content for file: {file_info['path']} ({len(content)} chars)")
                    
            except Exception as e:
                logger.warning(f"Failed to load content for {file_info['path']}: {str(e)}")
                continue
        
        logger.info(f"Loaded content for {len(files_with_content)} files")
        return files_with_content
    
    def _filter_relevant_files(self, files_metadata: List[Dict[str, Any]], 
                              question_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Filter and prioritize files based on question analysis."""
        relevant_files = []
        
        # Score files based on relevance
        scored_files = []
        for file_info in files_metadata:
            score = self._calculate_file_relevance(file_info, question_analysis)
            if score > 0:
                scored_files.append((score, file_info))
        
        # Sort by score (highest first)
        scored_files.sort(key=lambda x: x[0], reverse=True)
        
        # Return top files
        relevant_files = [file_info for score, file_info in scored_files]
        
        logger.info(f"Filtered {len(relevant_files)} relevant files from {len(files_metadata)} total files")
        return relevant_files
    
    def _calculate_file_relevance(self, file_info: Dict[str, Any], 
                                 question_analysis: Dict[str, Any]) -> float:
        """Calculate relevance score for a file based on question analysis."""
        score = 0.0
        
        file_path = file_info.get('path', '').lower()
        file_name = file_info.get('name', '').lower()
        file_type = file_info.get('type', '')
        language = file_info.get('language', '').lower()
        
        # Question type specific scoring
        if question_analysis['type'] == 'file_specific':
            # Check if any specific files match this file
            for target_file in question_analysis.get('specific_files', []):
                if (target_file.lower() in file_path or 
                    target_file.lower() in file_name or
                    file_path.endswith(target_file.lower())):
                    score += 10.0
        
        elif question_analysis['type'] == 'folder_specific':
            # Check if file is in any of the target folders
            for target_folder in question_analysis.get('specific_folders', []):
                if target_folder.lower() in file_path:
                    score += 8.0
        
        elif question_analysis['type'] == 'configuration':
            # Prioritize config files
            config_extensions = ['.conf', '.config', '.ini', '.yaml', '.yml', '.json', '.toml']
            if any(file_path.endswith(ext) for ext in config_extensions):
                score += 7.0
        
        # Keyword matching in file path
        for keyword in question_analysis.get('keywords', []):
            if keyword in file_path:
                score += 2.0
            if keyword in file_name:
                score += 1.5
        
        # File type preferences
        if file_type == 'file':
            score += 1.0
        
        # Language preferences
        important_languages = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c']
        if language in important_languages:
            score += 1.0
        
        # Avoid binary files
        binary_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz']
        if any(file_path.endswith(ext) for ext in binary_extensions):
            score = 0.0
        
        # Size considerations (prefer files that aren't too small or too large)
        size = file_info.get('size', 0)
        if 100 < size < 100000:  # Between 100 bytes and 100KB
            score += 0.5
        elif size > 500000:  # Larger than 500KB
            score *= 0.5
        
        return score
    
    async def _load_file_content(self, file_info: Dict[str, Any]) -> Optional[str]:
        """Load file content from B2 storage."""
        if not self.b2_storage:
            logger.warning("B2 storage not available, cannot load file content")
            return None
        
        file_key = file_info.get('file_key')
        if not file_key:
            logger.warning(f"No file_key for file: {file_info.get('path', 'unknown')}")
            return None
        
        try:
            # Download file content from B2
            content = await self.b2_storage.download_file_content(file_key)
            
            # Try to decode as text
            if isinstance(content, bytes):
                try:
                    content = content.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        content = content.decode('latin-1')
                    except UnicodeDecodeError:
                        logger.warning(f"Could not decode file content for: {file_info.get('path')}")
                        return None
            
            return content
            
        except Exception as e:
            logger.error(f"Failed to load file content from B2: {str(e)}")
            return None
    
    async def close(self):
        """Close database connections."""
        if self.connection_pool:
            await self.connection_pool.close()
            logger.info("Database connection pool closed")


# Global instance
database_service = DatabaseService()
