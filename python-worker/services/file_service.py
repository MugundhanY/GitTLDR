"""
File retrieval service for Q&A functionality.
Handles retrieving file content from B2 storage with Redis-based metadata.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from services.b2_storage_sdk_fixed import B2StorageService
from services.redis_client import redis_client
from utils.logger import get_logger

logger = get_logger(__name__)


class FileRetrievalService:
    """Service for retrieving file content for Q&A context generation."""
    
    def __init__(self):
        """Initialize file retrieval service."""
        self.b2_storage = None
        self.redis_client = redis_client
        self._initialize_b2()
    
    def _initialize_b2(self):
        """Initialize B2 storage service if credentials are available."""
        try:
            self.b2_storage = B2StorageService()
            logger.info("B2 storage service initialized for file retrieval")
        except Exception as e:
            logger.warning(f"B2 storage not available, will use fallback: {str(e)}")
            self.b2_storage = None
    
    async def get_repository_files(self, repo_id: str) -> List[Dict[str, Any]]:
        """
        Get all files for a repository from Redis file metadata.
        
        Args:
            repo_id: Repository ID
            
        Returns:
            List of file metadata
        """
        try:            # Check if we have repository file data
            repo_files_key = f"repo_files:{repo_id}"
            repo_files_data = await redis_client.hgetall(repo_files_key)
            
            if not repo_files_data or not repo_files_data.get('file_paths'):
                logger.warning(f"No file metadata found in Redis for repository {repo_id}")
                
                # Fallback: Try to list files directly from B2 storage
                if self.b2_storage:
                    logger.info(f"Attempting to retrieve file list from B2 for repository {repo_id}")
                    b2_files = await self.b2_storage.list_repository_files(repo_id)
                    
                    # Convert B2 file list to expected format
                    file_list = []
                    for b2_file in b2_files:
                        file_dict = {
                            'id': f"b2_{repo_id}_{b2_file['file_path']}",
                            'path': b2_file['file_path'],
                            'name': b2_file['file_path'].split('/')[-1],
                            'type': 'file',
                            'size': b2_file['size'],
                            'language': self._detect_language_from_path(b2_file['file_path']),
                            'file_url': f"b2://{b2_file['file_key']}",
                            'file_key': b2_file['file_key'],
                            'content': None  # Will be loaded on demand from B2
                        }
                        file_list.append(file_dict)
                    
                    logger.info(f"Retrieved {len(file_list)} files from B2 for repository {repo_id}")
                    return file_list
                else:
                    logger.error(f"No file data available for repository {repo_id} (no Redis data, no B2 storage)")
                    return []
            
            # Parse file paths from Redis and retrieve individual file metadata
            try:
                file_paths = json.loads(repo_files_data['file_paths'])
            except (json.JSONDecodeError, KeyError):
                logger.error(f"Invalid file_paths data in Redis for repository {repo_id}")
                return []
            
            file_list = []            
            for file_path in file_paths:
                file_key = f"file:{repo_id}:{file_path}"
                file_metadata = await redis_client.hgetall(file_key)
                
                if file_metadata:
                    # Convert Redis hash data to expected format
                    file_dict = {
                        'id': f"redis_{repo_id}_{file_path}",
                        'path': file_metadata.get('path', file_path),
                        'name': file_metadata.get('name', file_path.split('/')[-1]),
                        'type': file_metadata.get('type', 'file'),
                        'size': int(file_metadata.get('size', 0)),
                        'language': file_metadata.get('language', ''),
                        'file_url': file_metadata.get('file_url'),
                        'file_key': file_metadata.get('file_key'),
                        'content': file_metadata.get('content')  # Fallback content for failed uploads
                    }
                    file_list.append(file_dict)
                else:
                    logger.warning(f"File metadata not found for {file_path} in repository {repo_id}")
            
            logger.info(f"Retrieved {len(file_list)} files from Redis for repository {repo_id}")
            return file_list
            
        except Exception as e:
            logger.error(f"Failed to get repository files: {str(e)}")
            return []
    
    def _detect_language_from_path(self, file_path: str) -> str:
        """Detect programming language from file path."""
        if not file_path:
            return 'unknown'
            
        extension = file_path.split('.')[-1].lower() if '.' in file_path else ''
        
        language_map = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'cs': 'csharp',
            'kt': 'kotlin',
            'swift': 'swift',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'md': 'markdown',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'sql': 'sql',            'sh': 'shell',
            'bash': 'shell',
            'dockerfile': 'dockerfile'        }
        
        return language_map.get(extension, 'unknown')
    
    async def get_file_content(self, repo_id: str, file_path: str) -> Optional[str]:
        """
        Get file content from Redis metadata, B2 storage, or fallback content.
        
        Args:
            repo_id: Repository ID
            file_path: File path within the repository
            
        Returns:
            File content as string or None if not available
        """
        try:
            # Try to get file metadata from Redis first
            file_key = f"file:{repo_id}:{file_path}"
            file_metadata = await self.redis_client.hgetall(file_key)
            
            if file_metadata:
                # Check if we have fallback content stored in Redis
                if file_metadata.get('content'):
                    logger.debug(f"Retrieved content from Redis metadata: {file_path}")
                    return file_metadata['content']
                
                # Try B2 storage if we have a file key
                if self.b2_storage and file_metadata.get('file_key'):
                    try:
                        content = await self.b2_storage.download_file_content(file_metadata['file_key'])
                        logger.debug(f"Retrieved content from B2 for file: {file_path}")
                        return content
                    except Exception as e:
                        logger.warning(f"Failed to retrieve file from B2: {file_path} - {str(e)}")
            
            # Fallback: try to list and find file in B2 directly
            if self.b2_storage:
                try:
                    b2_key = f"repositories/{repo_id}/files/{file_path}"
                    content = await self.b2_storage.download_file_content(b2_key)
                    logger.debug(f"Retrieved content from B2 fallback: {file_path}")
                    return content
                except Exception as e:
                    logger.debug(f"B2 fallback failed for file: {file_path} - {str(e)}")
            
            # No content available
            logger.warning(f"No content available for file: {file_path}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving file content: {file_path} - {str(e)}")
            return None
    
    async def get_files_for_context(self, repo_id: str, max_files: int = 50, 
                                   file_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get files for Q&A context generation with content.
        
        Args:
            repo_id: Repository ID
            max_files: Maximum number of files to retrieve
            file_types: Optional list of file types to filter by
            
        Returns:
            List of files with content suitable for Q&A context
        """
        try:
            # Get file metadata from database
            files = await self.get_repository_files(repo_id)
            
            # Filter by file types if specified
            if file_types:
                files = [f for f in files if f.get('language') in file_types]
            
            # Sort by importance (you can customize this logic)
            files = self._sort_files_by_importance(files)
            
            # Limit to max_files
            files = files[:max_files]
              # Retrieve content for each file
            files_with_content = []
            for file_record in files:
                content = await self.get_file_content(repo_id, file_record['path'])
                if content:
                    files_with_content.append({
                        'path': file_record['path'],
                        'name': file_record['name'],
                        'language': file_record.get('language', ''),
                        'size': file_record.get('size', 0),
                        'content': content
                    })
            
            logger.info(f"Retrieved {len(files_with_content)} files with content for Q&A context")
            return files_with_content
            
        except Exception as e:
            logger.error(f"Failed to get files for context: {str(e)}")
            return []
    
    def _sort_files_by_importance(self, files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sort files by importance for Q&A context.
        
        Args:
            files: List of file records
            
        Returns:
            Sorted list of files
        """
        def get_file_priority(file_record):
            """Calculate priority score for a file."""
            path = file_record.get('path', '').lower()
            name = file_record.get('name', '').lower()
            language = file_record.get('language', '').lower()
            
            priority = 0
            
            # High priority for documentation and config files
            if any(keyword in name for keyword in ['readme', 'license', 'changelog', 'contributing']):
                priority += 100
            
            # High priority for main entry points
            if any(keyword in name for keyword in ['main', 'index', 'app', '__init__']):
                priority += 80
            
            # Medium priority for common important files
            if any(keyword in name for keyword in ['config', 'setup', 'package.json', 'requirements.txt']):
                priority += 60
            
            # Language-based priority
            important_languages = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust']
            if language in important_languages:
                priority += 40
            
            # Penalize very large files (they might be generated or data files)
            size = file_record.get('size', 0)
            if size > 100000:  # 100KB
                priority -= 20
            
            # Penalize files in certain directories
            if any(dir_name in path for dir_name in ['test', 'tests', '__pycache__', 'node_modules']):
                priority -= 30
            
            return priority
        
        return sorted(files, key=get_file_priority, reverse=True)
    
    async def is_repository_processed(self, repo_id: str) -> bool:
        """
        Check if a repository has been processed and files are available for Q&A.
        
        Args:
            repo_id: Repository ID
            
        Returns:
            True if repository is processed and ready for Q&A
        """
        try:            # Check if repository has completion data in Redis
            completion_key = f"repository_completion:{repo_id}"
            completion_data = await redis_client.hgetall(completion_key)
            
            if completion_data and completion_data.get('embedding_status') == 'COMPLETED':
                return True
              # Check if repository has file metadata
            repo_files_key = f"repo_files:{repo_id}"
            repo_files_data = await redis_client.hgetall(repo_files_key)
            
            if repo_files_data and int(repo_files_data.get('file_count', 0)) > 0:
                return True
            
            # Check if files exist in B2 storage
            if self.b2_storage:
                b2_files = await self.b2_storage.list_repository_files(repo_id)
                return len(b2_files) > 0
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check repository processing status: {str(e)}")
            return False
    
    async def get_repository_processing_status(self, repo_id: str) -> Dict[str, Any]:
        """
        Get detailed processing status for a repository.
        
        Args:
            repo_id: Repository ID
            
        Returns:
            Dictionary with processing status information
        """
        try:
            status_info = {
                'processed': False,
                'file_count': 0,
                'processing_status': 'unknown',
                'last_updated': None,
                'error': None
            }
              # Check completion status
            completion_key = f"repository_completion:{repo_id}"
            completion_data = await redis_client.hgetall(completion_key)
            
            if completion_data:
                status_info['processed'] = completion_data.get('embedding_status') == 'COMPLETED'
                status_info['processing_status'] = completion_data.get('embedding_status', 'unknown')
                status_info['last_updated'] = completion_data.get('updated_at')
                status_info['file_count'] = int(completion_data.get('file_count', 0))
              # Check current processing status
            status_key = f"repository_status:{repo_id}"
            status_data = await redis_client.hgetall(status_key)
            
            if status_data:
                status_info['processing_status'] = status_data.get('embedding_status', 'unknown')
                if not status_info['last_updated']:
                    status_info['last_updated'] = status_data.get('updated_at')
              # Check file count from file metadata
            if status_info['file_count'] == 0:
                repo_files_key = f"repo_files:{repo_id}"
                repo_files_data = await redis_client.hgetall(repo_files_key)
                
                if repo_files_data:
                    status_info['file_count'] = int(repo_files_data.get('file_count', 0))
            
            return status_info
            
        except Exception as e:
            logger.error(f"Failed to get repository processing status: {str(e)}")
            return {
                'processed': False,
                'file_count': 0,
                'processing_status': 'error',
                'last_updated': None,
                'error': str(e)
            }
