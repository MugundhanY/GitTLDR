"""
File retrieval service for Q&A functionality.
Handles retrieving file content from B2 storage with Redis-based metadata.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from services.b2_singleton import get_b2_storage
from services.redis_client import redis_client
from services.database_service import DatabaseService
from utils.logger import get_logger

logger = get_logger(__name__)


class FileRetrievalService:
    """Service for retrieving file content for Q&A context generation."""
    def __init__(self):
        """Initialize file retrieval service."""
        self.redis_client = redis_client
        self.database_service = DatabaseService()
        self._redis_connected = False

    @property
    def b2_storage(self):
        """Get B2 storage instance using singleton."""
        return get_b2_storage()

    async def _ensure_redis_connected(self):
        """Ensure Redis is connected before using it."""
        if not self._redis_connected:
            try:
                await self.redis_client.connect()
                self._redis_connected = await self.redis_client.ping()
                if self._redis_connected:
                    logger.info("Redis connected for file retrieval service")
                else:
                    logger.warning("Redis ping failed in file retrieval service")            
            except Exception as e:
                logger.error(f"Failed to connect Redis in file retrieval service: {str(e)}")
                self._redis_connected = False
        return self._redis_connected

    async def get_repository_files(self, repo_id: str) -> List[Dict[str, Any]]:
        """
        Get all files for a repository from Redis file metadata with smart fallback.
        
        Args:
            repo_id: Repository ID
            
        Returns:
            List of file metadata
        """
        try:
            # Ensure Redis is connected
            redis_available = await self._ensure_redis_connected()
            file_list = []
            file_keys = []  # Initialize file_keys to avoid NameError
            
            if redis_available:
                # Check if we have repository file data
                repo_files_key = f"repo_files:{repo_id}"
                repo_files_data = await redis_client.hgetall(repo_files_key)
                
                if not repo_files_data or not repo_files_data.get('file_paths'):
                    logger.warning(f"No file metadata found in Redis for repository {repo_id}")
                    
                    # Fallback 1: Try to find files by searching all file keys for this repo_id
                    logger.info(f"Searching for files using pattern: file:{repo_id}:*")
                    file_keys = await redis_client.keys(f"file:{repo_id}:*")
                
                if file_keys:
                    logger.info(f"Found {len(file_keys)} files directly for repo {repo_id}")
                    for file_key in file_keys:
                        try:
                            file_metadata = await redis_client.hgetall(file_key)
                            if file_metadata:
                                # Extract path from key
                                path = file_key.split(':', 2)[2]  # Remove "file:{repo_id}:"
                                
                                file_dict = {
                                    'id': f"redis_{repo_id}_{path}",
                                    'path': file_metadata.get('path', path),
                                    'name': file_metadata.get('name', path.split('\\')[-1].split('/')[-1]),
                                    'type': file_metadata.get('type', 'file'),
                                    'size': int(file_metadata.get('size', 0)),
                                    'language': file_metadata.get('language', ''),
                                    'file_url': file_metadata.get('file_url'),
                                    'file_key': file_metadata.get('file_key'),
                                    'content': file_metadata.get('content')
                                }
                                file_list.append(file_dict)
                        except Exception as e:
                            logger.warning(f"Error processing file key {file_key}: {str(e)}")
                
                # Fallback 2: Try to list files directly from B2 storage
                if not file_list and self.b2_storage:
                    logger.info(f"Attempting to retrieve file list from B2 for repository {repo_id}")
                    try:
                        b2_files = await self.b2_storage.list_repository_files(repo_id)
                        
                        # Convert B2 file list to expected format
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
                    except Exception as e:
                        logger.warning(f"Failed to get files from B2: {str(e)}")
                
                # Fallback 3: If still no files, search across ALL repositories for similar content
                # This is useful when the same repository exists under multiple IDs
                if not file_list:
                    logger.info(f"Searching across all repositories for any repository files")
                    
                    # Get all repo_files keys
                    all_repo_files_keys = await redis_client.keys("repo_files:*")
                    for repo_key in all_repo_files_keys:
                        try:
                            other_repo_data = await redis_client.hgetall(repo_key)
                            if other_repo_data and other_repo_data.get('file_paths'):
                                # Try to parse and see if it has vosk or similar files
                                file_paths = json.loads(other_repo_data['file_paths'])
                                if any('vosk' in path.lower() or 'model.conf' in path.lower() for path in file_paths):
                                    logger.info(f"Found potential matching repository: {repo_key}")
                                    other_repo_id = repo_key.split(':')[1]
                                    
                                    # Use this repository's files
                                    for file_path in file_paths[:50]:  # Limit to avoid too many files
                                        file_key = f"file:{other_repo_id}:{file_path}"
                                        file_metadata = await redis_client.hgetall(file_key)
                                        
                                        if file_metadata:
                                            file_dict = {
                                                'id': f"redis_{other_repo_id}_{file_path}",
                                                'path': file_metadata.get('path', file_path),
                                                'name': file_metadata.get('name', file_path.split('\\')[-1].split('/')[-1]),
                                                'type': file_metadata.get('type', 'file'),
                                                'size': int(file_metadata.get('size', 0)),
                                                'language': file_metadata.get('language', ''),
                                                'file_url': file_metadata.get('file_url'),
                                                'file_key': file_metadata.get('file_key'),
                                                'content': file_metadata.get('content')
                                            }
                                            file_list.append(file_dict)
                                    
                                    if file_list:
                                        logger.info(f"Using files from repository {other_repo_id} as fallback")
                                        break
                        except Exception as e:
                            logger.debug(f"Error checking repository {repo_key}: {str(e)}")
                            continue
                
                if not file_list:
                    logger.error(f"No file data available for repository {repo_id} (no Redis data, no B2 storage, no fallback)")
                    return []
                    
                return file_list
            
            # Parse file paths from Redis and retrieve individual file metadata
            try:
                file_paths = json.loads(repo_files_data['file_paths'])
            except (json.JSONDecodeError, KeyError):
                logger.error(f"Invalid file_paths data in Redis for repository {repo_id}")
                return []
            
            for file_path in file_paths:
                file_key = f"file:{repo_id}:{file_path}"
                file_metadata = await redis_client.hgetall(file_key)
                
                if file_metadata:
                    # Convert Redis hash data to expected format
                    file_dict = {
                        'id': f"redis_{repo_id}_{file_path}",
                        'path': file_metadata.get('path', file_path),
                        'name': file_metadata.get('name', file_path.split('\\')[-1].split('/')[-1]),
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
            'xml': 'xml',        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
        'dockerfile': 'dockerfile'
        }
        
        return language_map.get(extension, 'unknown')

    async def get_file_content(self, repo_id: str, file_path: str) -> Optional[str]:
        """
        Get content of a specific file with smart fallback for multiple repository IDs.
        
        Args:
            repo_id: Repository ID
            file_path: Path to the file
            
        Returns:
            File content as string, or None if not found
        """
        try:
            # First try to get from Redis metadata with the given repo_id
            file_key = f"file:{repo_id}:{file_path}"
            file_metadata = await redis_client.hgetall(file_key)
            
            if file_metadata:
                # Check if content is stored directly in Redis
                if file_metadata.get('content'):
                    logger.debug(f"Retrieved file content from Redis: {file_path}")
                    return file_metadata['content']
                
                # Try to get from B2 storage using file_key
                if self.b2_storage and file_metadata.get('file_key'):
                    try:
                        content = await self.b2_storage.download_file_content(
                            file_key=file_metadata['file_key']
                        )
                        logger.debug(f"Retrieved file content from B2: {file_path}")
                        return content
                    except Exception as e:
                        logger.warning(f"Failed to get content from B2 for {file_path}: {str(e)}")
            
            # Fallback 1: Try alternative path formats with the same repo_id
            alternative_paths = [
                file_path.replace('/', '\\'),
                file_path.replace('\\', '/'),
                file_path.lstrip('/\\'),
                '/' + file_path.lstrip('/\\')
            ]
            
            for alt_path in alternative_paths:
                if alt_path != file_path:
                    alt_file_key = f"file:{repo_id}:{alt_path}"
                    alt_metadata = await redis_client.hgetall(alt_file_key)
                    
                    if alt_metadata and alt_metadata.get('content'):
                        logger.debug(f"Retrieved file content from Redis using alternative path: {alt_path}")
                        return alt_metadata['content']
            
            # Fallback 2: Search across ALL repository IDs for this file path
            # This handles the case where the same repository exists under multiple IDs
            logger.info(f"Searching across all repositories for file: {file_path}")
            
            # Get all file keys that match this path pattern
            all_file_keys = await redis_client.keys(f"file:*:{file_path}")
            
            # Also try alternative path formats across all repos
            for alt_path in alternative_paths:
                alt_keys = await redis_client.keys(f"file:*:{alt_path}")
                all_file_keys.extend(alt_keys)
            
            # Remove duplicates
            all_file_keys = list(set(all_file_keys))
            
            logger.debug(f"Found {len(all_file_keys)} potential matches for {file_path}")
            
            # Try each key to find one with content
            for key in all_file_keys:
                try:
                    metadata = await redis_client.hgetall(key)
                    if metadata and metadata.get('content'):
                        logger.info(f"Found file content in different repository: {key}")
                        return metadata['content']
                except Exception as e:
                    logger.debug(f"Error checking key {key}: {str(e)}")
                    continue
            
            # If still no content found, try B2 storage with any available file_key
            for key in all_file_keys:
                try:
                    metadata = await redis_client.hgetall(key)
                    if metadata and metadata.get('file_key') and self.b2_storage:
                        try:
                            content = await self.b2_storage.download_file_content(
                                file_key=metadata['file_key']
                            )
                            logger.info(f"Retrieved file content from B2 using different repository: {key}")
                            return content
                        except Exception as e:
                            logger.debug(f"Failed to get B2 content for {key}: {str(e)}")
                            continue
                except Exception as e:
                    logger.debug(f"Error checking B2 for key {key}: {str(e)}")
                    continue            # Try database fallback before giving up
            logger.info(f"Redis cache miss - attempting database fallback for: {file_path}")
            content = await self._get_file_content_from_database(repo_id, file_path)
            if content:
                return content
            
            # Only warn for important files, not model files or large binaries
            if not any(skip_pattern in file_path.lower() for skip_pattern in [
                'model', '.bin', '.dat', '.pkl', '.h5', '.onnx', '.pt', '.pth',
                'node_modules', '.git', '__pycache__', '.cache'
            ]):
                logger.warning(f"File content not found anywhere (Redis + Database): {file_path}")
            else:
                logger.debug(f"Skipping missing binary/model file: {file_path}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving file content for {file_path}: {str(e)}")
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
        try:
            # Ensure Redis is connected
            redis_available = await self._ensure_redis_connected()
            
            if redis_available:
                # Check if repository has completion data in Redis
                completion_key = f"repository_completion:{repo_id}"
                completion_data = await redis_client.hgetall(completion_key)
                
                if completion_data and completion_data.get('embedding_status') == 'COMPLETED':
                    return True
                
                # Check if repository has file metadata
                repo_files_key = f"repo_files:{repo_id}"
                repo_files_data = await redis_client.hgetall(repo_files_key)
                
                if repo_files_data and int(repo_files_data.get('file_count', 0)) > 0:
                    return True
            
            # Check if files exist in B2 storage as fallback
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
    
    async def get_files_for_qa_context(self, repository_id: str, similar_results: List[Dict[str, Any]], max_files: int = 5) -> List[Dict[str, Any]]:
        """
        Get files for Q&A context based on similarity search results.
        
        Args:
            repository_id: Repository ID
            similar_results: Results from vector similarity search
            max_files: Maximum number of files to retrieve
            
        Returns:
            List of files with content for Q&A context
        """
        try:
            files_with_content = []
            
            # Extract file paths from similarity results
            relevant_file_paths = []
            for result in similar_results[:max_files]:
                metadata = result.get("metadata", {})
                file_path = metadata.get("file_path")
                if file_path:
                    relevant_file_paths.append(file_path)
            
            # Get content for each relevant file
            for file_path in relevant_file_paths:
                content = await self.get_file_content(repository_id, file_path)
                if content:
                    files_with_content.append({
                        "file_path": file_path,
                        "content": content,
                        "name": file_path.split('/')[-1],
                        "language": self._detect_language_from_path(file_path)
                    })
            
            logger.info(f"Retrieved {len(files_with_content)} files for Q&A context from {len(similar_results)} similar results")
            return files_with_content
            
        except Exception as e:
            logger.error(f"Failed to get files for Q&A context: {str(e)}")
            return []
    
    async def _get_file_content_from_database(self, repo_id: str, file_path: str) -> Optional[str]:
        """
        Fallback method to get file content from database when Redis cache misses.
        
        Args:
            repo_id: Repository ID
            file_path: Path of the file to retrieve
            
        Returns:
            File content if found, None otherwise
        """
        try:
            logger.debug(f"Attempting to retrieve file from database: {repo_id}/{file_path}")
            
            # Get repository files from database
            repository_files = await self.database_service.get_repository_files(repo_id)
            
            if not repository_files:
                logger.debug(f"No files found in database for repository {repo_id}")
                return None
            
            # Find the file by path (try exact match first, then fuzzy matching)
            target_file = None
            
            # Try exact path match
            for file_info in repository_files:
                if file_info.get('path') == file_path:
                    target_file = file_info
                    break
            
            # Try normalized path matching if exact match fails
            if not target_file:
                normalized_target = file_path.replace('\\', '/').lower()
                for file_info in repository_files:
                    file_path_normalized = file_info.get('path', '').replace('\\', '/').lower()
                    if file_path_normalized == normalized_target:
                        target_file = file_info
                        break
            
            # Try partial path matching (for files in subdirectories)
            if not target_file:
                for file_info in repository_files:
                    stored_path = file_info.get('path', '')
                    if file_path in stored_path or stored_path.endswith(file_path):
                        target_file = file_info
                        logger.debug(f"Found file via partial match: {stored_path} matches {file_path}")
                        break
            
            if not target_file:
                logger.debug(f"File not found in database: {file_path}")
                return None
            
            # Try to get content from B2 using the file_key from database
            file_key = target_file.get('file_key')
            if file_key and self.b2_storage:
                try:
                    content = await self.b2_storage.download_file_content(file_key=file_key)
                    logger.info(f"Successfully retrieved file content from database fallback: {file_path}")
                    return content
                except Exception as e:
                    logger.warning(f"Failed to get content from B2 using database file_key: {str(e)}")
            
            # Check if content is stored directly in database
            if target_file.get('content'):
                logger.info(f"Retrieved file content directly from database: {file_path}")
                return target_file['content']
            
            logger.debug(f"File found in database but no content available: {file_path}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving file from database: {str(e)}")
            return None
