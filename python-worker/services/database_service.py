"""
Database service for Q&A functionality.
Handles retrieving repository and file data from PostgreSQL database.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
import asyncpg
from services.b2_singleton import get_b2_storage
from utils.logger import get_logger
from config.settings import get_settings

logger = get_logger(__name__)


class DatabaseService:
    """Service for retrieving repository and file data from database."""
    def __init__(self):
        """Initialize database service."""
        self.connection_pool = None
        try:
            self.settings = get_settings()
        except Exception as e:
            logger.error(f"Failed to load settings: {str(e)}")
            self.settings = None

    @property
    def b2_storage(self):
        """Get B2 storage instance using singleton."""
        return get_b2_storage()
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
                    SELECT id, name, url, embedding_status, processed, file_count, total_size
                    FROM repositories 
                    WHERE id = $1
                    """,
                    repository_id                
                )
                
                if row:
                    return {
                        'id': row['id'],
                        'name': row['name'],
                        'url': row['url'],
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
        
        # Get question type safely
        question_type = question_analysis.get('type', 'general')
        
        # Question type specific scoring
        if question_type == 'file_specific':
            # Check if any specific files match this file
            for target_file in question_analysis.get('specific_files', []):
                if (target_file.lower() in file_path or 
                    target_file.lower() in file_name or
                    file_path.endswith(target_file.lower())):
                    score += 10.0
        
        elif question_type == 'folder_specific':
            # Check if file is in any of the target folders
            for target_folder in question_analysis.get('specific_folders', []):
                if target_folder.lower() in file_path:
                    score += 8.0
        
        elif question_type == 'configuration':
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
    
    async def create_question(
        self, 
        repository_id: str,
        user_id: str,
        query: str,
        answer: str,
        confidence_score: float = 0.9,
        relevant_files: List[Dict[str, Any]] = None,
        category: str = "ai_generated"
    ) -> str:
        """
        Create a new question entry in the database.
        
        Args:
            repository_id: Repository ID
            user_id: User ID
            query: The question text
            answer: The answer text
            confidence_score: Confidence score for the answer
            relevant_files: List of relevant files
            category: Question category
            
        Returns:
            The created question ID
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Generate a CUID-like ID (since database default isn't working)
                import time
                import random
                import string
                
                # Generate a CUID-like identifier
                timestamp = str(int(time.time() * 1000))[-10:]  # Last 10 digits of timestamp
                random_chars = ''.join(random.choices(string.ascii_lowercase + string.digits, k=15))
                generated_id = f"q{timestamp}{random_chars}"
                
                # Insert the question with explicit ID
                question_id = await connection.fetchval(
                    """
                    INSERT INTO questions (
                        id, repository_id, user_id, query, answer, 
                        confidence_score, relevant_files, category,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
                    ) RETURNING id
                    """,
                    generated_id,
                    repository_id,
                    user_id,
                    query,
                    answer,
                    confidence_score,
                    json.dumps(relevant_files) if relevant_files else json.dumps([]),
                    category
                )
                
                logger.info(f"Created question in database with ID: {question_id}")
                return str(question_id)
                
        except Exception as e:
            logger.error(f"Failed to create question in database: {str(e)}")
            raise
    
    async def get_commits_by_query(self, repository_id: str, query: str) -> List[Dict[str, Any]]:
        """
        Get commits from repository based on query keywords.
        
        Args:
            repository_id: Repository ID
            query: Search query for commits
            
        Returns:
            List of commit data matching the query
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Search commits by message, author name, or SHA
                rows = await connection.fetch(
                    """
                    SELECT id, sha, message, author_name, author_email, author_avatar, 
                           timestamp, url, summary, files_changed, status, created_at
                    FROM commits 
                    WHERE repository_id = $1 
                    AND (
                        LOWER(message) LIKE LOWER($2) OR 
                        LOWER(author_name) LIKE LOWER($2) OR 
                        sha LIKE $2
                    )
                    ORDER BY timestamp DESC
                    LIMIT 20
                    """,
                    repository_id, f"%{query}%"
                )
                
                commits = []
                for row in rows:
                    commits.append({
                        'id': row['id'],
                        'sha': row['sha'],
                        'message': row['message'],
                        'author_name': row['author_name'],
                        'author_email': row['author_email'],
                        'author_avatar': row['author_avatar'],
                        'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                        'url': row['url'],
                        'summary': row['summary'],
                        'files_changed': row['files_changed'],
                        'status': row['status'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    })
                
                logger.info(f"Found {len(commits)} commits for query '{query}' in repository {repository_id}")
                return commits
                
        except Exception as e:
            logger.error(f"Failed to get commits by query: {str(e)}")
            return []

    async def get_latest_commits(self, repository_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get latest commits from repository.
        
        Args:
            repository_id: Repository ID
            limit: Number of commits to return
            
        Returns:
            List of latest commit data
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                rows = await connection.fetch(
                    """
                    SELECT id, sha, message, author_name, author_email, author_avatar, 
                           timestamp, url, summary, files_changed, status, created_at
                    FROM commits 
                    WHERE repository_id = $1 
                    ORDER BY timestamp DESC
                    LIMIT $2
                    """,
                    repository_id, limit
                )
                
                commits = []
                for row in rows:
                    commits.append({
                        'id': row['id'],
                        'sha': row['sha'],
                        'message': row['message'],
                        'author_name': row['author_name'],
                        'author_email': row['author_email'],
                        'author_avatar': row['author_avatar'],
                        'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                        'url': row['url'],
                        'summary': row['summary'],
                        'files_changed': row['files_changed'],
                        'status': row['status'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    })
                
                logger.info(f"Retrieved {len(commits)} latest commits from repository {repository_id}")
                return commits
                
        except Exception as e:
            logger.error(f"Failed to get latest commits: {str(e)}")
            return []

    async def get_commits_by_date(self, repository_id: str, start_date: str, end_date: str = None) -> List[Dict[str, Any]]:
        """
        Get commits from repository within a date range.
        
        Args:
            repository_id: Repository ID
            start_date: Start date (ISO format)
            end_date: End date (ISO format, optional)
            
        Returns:
            List of commit data within the date range
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                if end_date:
                    # Date range query
                    rows = await connection.fetch(
                        """
                        SELECT id, sha, message, author_name, author_email, author_avatar, 
                               timestamp, url, summary, files_changed, status, created_at
                        FROM commits 
                        WHERE repository_id = $1 
                        AND timestamp >= $2::timestamp 
                        AND timestamp <= $3::timestamp
                        ORDER BY timestamp DESC
                        LIMIT 50
                        """,
                        repository_id, start_date, end_date
                    )
                else:
                    # Single date query (commits on that day)
                    rows = await connection.fetch(
                        """
                        SELECT id, sha, message, author_name, author_email, author_avatar, 
                               timestamp, url, summary, files_changed, status, created_at
                        FROM commits 
                        WHERE repository_id = $1 
                        AND DATE(timestamp) = DATE($2::timestamp)
                        ORDER BY timestamp DESC
                        LIMIT 50
                        """,
                        repository_id, start_date
                    )
                
                commits = []
                for row in rows:
                    commits.append({
                        'id': row['id'],
                        'sha': row['sha'],
                        'message': row['message'],
                        'author_name': row['author_name'],
                        'author_email': row['author_email'],
                        'author_avatar': row['author_avatar'],
                        'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                        'url': row['url'],
                        'summary': row['summary'],
                        'files_changed': row['files_changed'],
                        'status': row['status'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    })
                
                date_range = f"{start_date} to {end_date}" if end_date else start_date
                logger.info(f"Found {len(commits)} commits for date range '{date_range}' in repository {repository_id}")
                return commits
                
        except Exception as e:
            logger.error(f"Failed to get commits by date: {str(e)}")
            return []

    async def get_commit_by_sha(self, repository_id: str, sha: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific commit by its SHA.
        
        Args:
            repository_id: Repository ID
            sha: Commit SHA (can be partial)
            
        Returns:
            Commit data or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Support both full and partial SHA
                row = await connection.fetchrow(
                    """
                    SELECT id, sha, message, author_name, author_email, author_avatar, 
                           timestamp, url, summary, files_changed, status, created_at
                    FROM commits 
                    WHERE repository_id = $1 
                    AND sha LIKE $2
                    ORDER BY timestamp DESC
                    LIMIT 1
                    """,
                    repository_id, f"{sha}%"
                )
                
                if row:
                    commit = {
                        'id': row['id'],
                        'sha': row['sha'],
                        'message': row['message'],
                        'author_name': row['author_name'],
                        'author_email': row['author_email'],
                        'author_avatar': row['author_avatar'],
                        'timestamp': row['timestamp'].isoformat() if row['timestamp'] else None,
                        'url': row['url'],
                        'summary': row['summary'],
                        'files_changed': row['files_changed'],
                        'status': row['status'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                    
                    logger.info(f"Found commit {row['sha']} for SHA '{sha}' in repository {repository_id}")
                    return commit
                else:
                    logger.warning(f"No commit found for SHA '{sha}' in repository {repository_id}")
                    return None
                
        except Exception as e:
            logger.error(f"Failed to get commit by SHA: {str(e)}")
            return None
    
    async def close(self):
        """Close database connections."""
        if self.connection_pool:
            await self.connection_pool.close()
            logger.info("Database connection pool closed")

    # ======== COMMIT ANALYSIS METHODS ========
    # Optimized for scalability with pagination, indexing, and caching
    
    async def get_recent_commits(
        self, 
        repository_id: str, 
        limit: int = 10, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get recent commits for a repository with pagination.
        Uses indexed query for optimal performance. Falls back if commit_files table is missing.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                query = """
                    SELECT c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions,
                           COUNT(cf.id) as files_changed
                    FROM commits c
                    LEFT JOIN commit_files cf ON c.id = cf.commit_id
                    WHERE c.repository_id = $1
                    GROUP BY c.id, c.sha, c.message, c.author_name, c.author_email, 
                             c.created_at, c.url, c.additions, c.deletions
                    ORDER BY c.created_at DESC
                    LIMIT $2 OFFSET $3
                """
                try:
                    rows = await conn.fetch(query, repository_id, limit, offset)
                except Exception as e:
                    if 'commit_files' in str(e):
                        logger.warning("commit_files table missing, falling back to legacy query for recent commits")
                        fallback_query = """
                            SELECT sha, message, author_name, author_email, created_at, url, additions, deletions
                            FROM commits
                            WHERE repository_id = $1
                            ORDER BY created_at DESC
                            LIMIT $2 OFFSET $3
                        """
                        rows = await conn.fetch(fallback_query, repository_id, limit, offset)
                        commits = []
                        for row in rows:
                            commit_data = dict(row)
                            commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                            commit_data['files_changed'] = None
                            commits.append(commit_data)
                        logger.info(f"[Fallback] Retrieved {len(commits)} recent commits for repository {repository_id}")
                        return commits
                    else:
                        raise
                commits = []
                for row in rows:
                    commit_data = dict(row)
                    commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                    commits.append(commit_data)
                logger.info(f"Retrieved {len(commits)} recent commits for repository {repository_id}")
                return commits
        except Exception as e:
            logger.error(f"Failed to get recent commits: {str(e)}")
            return []

    async def get_commits_by_date_range(
        self, 
        repository_id: str, 
        start_date: str = None, 
        end_date: str = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get commits within a date range with efficient date filtering.
        Supports flexible date queries like 'today', 'this week', etc. Falls back if commit_files table is missing.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                conditions = ["c.repository_id = $1"]
                params = [repository_id]
                param_count = 1
                if start_date:
                    param_count += 1
                    conditions.append(f"c.created_at >= ${param_count}")
                    params.append(start_date)
                if end_date:
                    param_count += 1
                    conditions.append(f"c.created_at <= ${param_count}")
                    params.append(end_date)
                param_count += 1
                params.append(limit)
                query = f"""
                    SELECT c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions,
                           COUNT(cf.id) as files_changed
                    FROM commits c
                    LEFT JOIN commit_files cf ON c.id = cf.commit_id
                    WHERE {' AND '.join(conditions)}
                    GROUP BY c.id, c.sha, c.message, c.author_name, c.author_email, 
                             c.created_at, c.url, c.additions, c.deletions
                    ORDER BY c.created_at DESC
                    LIMIT ${param_count}
                """
                try:
                    rows = await conn.fetch(query, *params)
                except Exception as e:
                    if 'commit_files' in str(e):
                        logger.warning("commit_files table missing, falling back to legacy query for date range commits")
                        fallback_conditions = ["repository_id = $1"]
                        fallback_params = [repository_id]
                        fallback_param_count = 1
                        if start_date:
                            fallback_param_count += 1
                            fallback_conditions.append(f"created_at >= ${fallback_param_count}")
                            fallback_params.append(start_date)
                        if end_date:
                            fallback_param_count += 1
                            fallback_conditions.append(f"created_at <= ${fallback_param_count}")
                            fallback_params.append(end_date)
                        fallback_param_count += 1
                        fallback_params.append(limit)
                        fallback_query = f"""
                            SELECT sha, message, author_name, author_email, created_at, url, additions, deletions
                            FROM commits
                            WHERE {' AND '.join(fallback_conditions)}
                            ORDER BY created_at DESC
                            LIMIT ${fallback_param_count}
                        """
                        rows = await conn.fetch(fallback_query, *fallback_params)
                        commits = []
                        for row in rows:
                            commit_data = dict(row)
                            commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                            commit_data['files_changed'] = None
                            commits.append(commit_data)
                        logger.info(f"[Fallback] Retrieved {len(commits)} commits by date range for repository {repository_id}")
                        return commits
                    else:
                        raise
                commits = []
                for row in rows:
                    commit_data = dict(row)
                    commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                    commits.append(commit_data)
                logger.info(f"Retrieved {len(commits)} commits by date range for repository {repository_id}")
                return commits
        except Exception as e:
            logger.error(f"Failed to get commits by date range: {str(e)}")
            return []

    async def get_commits_by_author(
        self, 
        repository_id: str, 
        author_pattern: str,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Get commits by author pattern with efficient text search. Falls back if commit_files table is missing.
        Uses ILIKE for case-insensitive pattern matching.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                query = """
                    SELECT c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions,
                           COUNT(cf.id) as files_changed
                    FROM commits c
                    LEFT JOIN commit_files cf ON c.id = cf.commit_id
                    WHERE c.repository_id = $1 
                    AND (c.author_name ILIKE $2 OR c.author_email ILIKE $2)
                    GROUP BY c.id, c.sha, c.message, c.author_name, c.author_email, 
                             c.created_at, c.url, c.additions, c.deletions
                    ORDER BY c.created_at DESC
                    LIMIT $3
                """
                search_pattern = f"%{author_pattern}%"
                try:
                    rows = await conn.fetch(query, repository_id, search_pattern, limit)
                except Exception as e:
                    if 'commit_files' in str(e):
                        logger.warning("commit_files table missing, falling back to legacy query for author commits")
                        fallback_query = """
                            SELECT sha, message, author_name, author_email, created_at, url, additions, deletions
                            FROM commits
                            WHERE repository_id = $1 AND (author_name ILIKE $2 OR author_email ILIKE $2)
                            ORDER BY created_at DESC
                            LIMIT $3
                        """
                        rows = await conn.fetch(fallback_query, repository_id, search_pattern, limit)
                        commits = []
                        for row in rows:
                            commit_data = dict(row)
                            commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                            commit_data['files_changed'] = None
                            commits.append(commit_data)
                        logger.info(f"[Fallback] Retrieved {len(commits)} commits by author '{author_pattern}' for repository {repository_id}")
                        return commits
                    else:
                        raise
                commits = []
                for row in rows:
                    commit_data = dict(row)
                    commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                    commits.append(commit_data)
                logger.info(f"Retrieved {len(commits)} commits by author '{author_pattern}' for repository {repository_id}")
                return commits
        except Exception as e:
            logger.error(f"Failed to get commits by author: {str(e)}")
            return []

    async def get_commit_by_sha(
        self, 
        repository_id: str, 
        commit_sha: str,
        include_files: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific commit by SHA with optional file details. Falls back if commit_files table is missing.
        Supports partial SHA matching (minimum 6 characters).
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                commit_query = """
                    SELECT c.id, c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions
                    FROM commits c
                    WHERE c.repository_id = $1 AND c.sha LIKE $2
                    ORDER BY c.created_at DESC
                    LIMIT 1
                """
                if len(commit_sha) < 6:
                    logger.warning(f"Commit SHA too short: {commit_sha}")
                    return None
                sha_pattern = f"{commit_sha}%"
                commit_row = await conn.fetchrow(commit_query, repository_id, sha_pattern)
                if not commit_row:
                    return None
                commit_data = dict(commit_row)
                commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                if include_files:
                    files_query = """
                        SELECT cf.filename, cf.status, cf.additions, cf.deletions
                        FROM commit_files cf
                        WHERE cf.commit_id = $1
                        ORDER BY cf.filename
                    """
                    try:
                        file_rows = await conn.fetch(files_query, commit_data['id'])
                        commit_data['files'] = [dict(row) for row in file_rows]
                        commit_data['files_changed'] = len(commit_data['files'])
                    except Exception as e:
                        if 'commit_files' in str(e):
                            logger.warning("commit_files table missing, falling back to commit without file details")
                            commit_data['files'] = []
                            commit_data['files_changed'] = None
                        else:
                            raise
                del commit_data['id']
                logger.info(f"Retrieved commit {commit_data['sha'][:8]} for repository {repository_id}")
                return commit_data
        except Exception as e:
            logger.error(f"Failed to get commit by SHA: {str(e)}")
            return None

    async def search_commits_by_message(
        self, 
        repository_id: str, 
        message_pattern: str,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Search commits by message content with full-text search capabilities. Falls back if commit_files table is missing.
        Uses efficient ILIKE for pattern matching with potential for future GIN indexing.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                query = """
                    SELECT c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions,
                           COUNT(cf.id) as files_changed
                    FROM commits c
                    LEFT JOIN commit_files cf ON c.id = cf.commit_id
                    WHERE c.repository_id = $1 AND c.message ILIKE $2
                    GROUP BY c.id, c.sha, c.message, c.author_name, c.author_email, 
                             c.created_at, c.url, c.additions, c.deletions
                    ORDER BY c.created_at DESC
                    LIMIT $3
                """
                search_pattern = f"%{message_pattern}%"
                try:
                    rows = await conn.fetch(query, repository_id, search_pattern, limit)
                except Exception as e:
                    if 'commit_files' in str(e):
                        logger.warning("commit_files table missing, falling back to legacy query for message search")
                        fallback_query = """
                            SELECT sha, message, author_name, author_email, created_at, url, additions, deletions
                            FROM commits
                            WHERE repository_id = $1 AND message ILIKE $2
                            ORDER BY created_at DESC
                            LIMIT $3
                        """
                        rows = await conn.fetch(fallback_query, repository_id, search_pattern, limit)
                        commits = []
                        for row in rows:
                            commit_data = dict(row)
                            commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                            commit_data['files_changed'] = None
                            commits.append(commit_data)
                        logger.info(f"[Fallback] Retrieved {len(commits)} commits matching message '{message_pattern}' for repository {repository_id}")
                        return commits
                    else:
                        raise
                commits = []
                for row in rows:
                    commit_data = dict(row)
                    commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                    commits.append(commit_data)
                logger.info(f"Retrieved {len(commits)} commits matching message '{message_pattern}' for repository {repository_id}")
                return commits
        except Exception as e:
            logger.error(f"Failed to search commits by message: {str(e)}")
            return []

    async def get_commits_affecting_file(
        self, 
        repository_id: str, 
        file_pattern: str,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Get commits that modified files matching a pattern. Falls back if commit_files table is missing.
        Efficient join with indexed commit_files table.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                query = """
                    SELECT DISTINCT c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions,
                           STRING_AGG(cf.filename, ', ') as matching_files
                    FROM commits c
                    INNER JOIN commit_files cf ON c.id = cf.commit_id
                    WHERE c.repository_id = $1 AND cf.filename ILIKE $2
                    GROUP BY c.id, c.sha, c.message, c.author_name, c.author_email, 
                             c.created_at, c.url, c.additions, c.deletions
                    ORDER BY c.created_at DESC
                    LIMIT $3
                """
                file_search_pattern = f"%{file_pattern}%"
                try:
                    rows = await conn.fetch(query, repository_id, file_search_pattern, limit)
                except Exception as e:
                    if 'commit_files' in str(e):
                        logger.warning("commit_files table missing, falling back to legacy query for file affecting commits")
                        fallback_query = """
                            SELECT sha, message, author_name, author_email, created_at, url, additions, deletions
                            FROM commits
                            WHERE repository_id = $1 AND message ILIKE $2
                            ORDER BY created_at DESC
                            LIMIT $3
                        """
                        rows = await conn.fetch(fallback_query, repository_id, file_search_pattern, limit)
                        commits = []
                        for row in rows:
                            commit_data = dict(row)
                            commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                            commit_data['matching_files'] = None
                            commits.append(commit_data)
                        logger.info(f"[Fallback] Retrieved {len(commits)} commits affecting files matching '{file_pattern}' for repository {repository_id}")
                        return commits
                    else:
                        raise
                commits = []
                for row in rows:
                    commit_data = dict(row)
                    commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                    commits.append(commit_data)
                logger.info(f"Retrieved {len(commits)} commits affecting files matching '{file_pattern}' for repository {repository_id}")
                return commits
        except Exception as e:
            logger.error(f"Failed to get commits affecting file: {str(e)}")
            return []

    async def get_commit_statistics(self, repository_id: str) -> Dict[str, Any]:
        """
        Get commit statistics for dashboard/summary purposes.
        Efficient aggregation queries with caching potential.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Multiple efficient aggregation queries
                stats_query = """
                    SELECT 
                        COUNT(*) as total_commits,
                        COUNT(DISTINCT author_name) as unique_authors,
                        MAX(created_at) as last_commit_date,
                        MIN(created_at) as first_commit_date,
                        SUM(additions) as total_additions,
                        SUM(deletions) as total_deletions
                    FROM commits 
                    WHERE repository_id = $1
                """
                
                # Recent activity query
                recent_query = """
                    SELECT 
                        DATE_TRUNC('day', created_at) as commit_date,
                        COUNT(*) as commits_count
                    FROM commits 
                    WHERE repository_id = $1 
                    AND created_at >= NOW() - INTERVAL '30 days'
                    GROUP BY DATE_TRUNC('day', created_at)
                    ORDER BY commit_date DESC
                """
                
                # Top authors query
                authors_query = """
                    SELECT 
                        author_name,
                        COUNT(*) as commit_count,
                        SUM(additions) as total_additions,
                        SUM(deletions) as total_deletions
                    FROM commits 
                    WHERE repository_id = $1
                    GROUP BY author_name
                    ORDER BY commit_count DESC
                    LIMIT 10
                """
                
                # Execute all queries concurrently for better performance
                stats_row, recent_rows, authors_rows = await asyncio.gather(
                    conn.fetchrow(stats_query, repository_id),
                    conn.fetch(recent_query, repository_id),
                    conn.fetch(authors_query, repository_id)
                )
                
                # Format the results
                stats = dict(stats_row) if stats_row else {}
                if stats.get('last_commit_date'):
                    stats['last_commit_date'] = stats['last_commit_date'].isoformat()
                if stats.get('first_commit_date'):
                    stats['first_commit_date'] = stats['first_commit_date'].isoformat()
                
                # Format recent activity
                recent_activity = []
                for row in recent_rows:
                    recent_activity.append({
                        'date': row['commit_date'].isoformat() if row['commit_date'] else None,
                        'commits': row['commits_count']
                    })
                
                # Format top authors
                top_authors = [dict(row) for row in authors_rows]
                
                result = {
                    'repository_id': repository_id,
                    'statistics': stats,
                    'recent_activity': recent_activity,
                    'top_authors': top_authors
                }
                
                logger.info(f"Retrieved commit statistics for repository {repository_id}")
                return result
                
        except Exception as e:
            logger.error(f"Failed to get commit statistics: {str(e)}")
            return {}
        
    async def get_commits_by_message(
        self, 
        repository_id: str, 
        message_pattern: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get commits by message pattern (for commit analysis Q&A).
        
        Args:
            repository_id: Repository ID
            message_pattern: Pattern to search in commit messages
            limit: Maximum number of commits to return
            
        Returns:
            List of commits matching the message pattern
        """
        if not self.pool:
            logger.warning("Database pool not initialized")
            return []
        
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT 
                        sha,
                        message,
                        author_name,
                        author_email,
                        created_at,
                        additions,
                        deletions,
                        files_changed,
                        url,
                        summary,
                        status
                    FROM commits 
                    WHERE repository_id = $1
                    AND (
                        message ILIKE $2 
                        OR message ILIKE $3
                    )
                    ORDER BY created_at DESC
                    LIMIT $4
                """
                
                # Create search patterns
                search_pattern = f"%{message_pattern}%"
                word_pattern = f"%{message_pattern.replace(' ', '%')}%"
                
                rows = await conn.fetch(query, repository_id, search_pattern, word_pattern, limit)
                
                commits = []
                for row in rows:
                    commit = dict(row)
                    commit['timestamp'] = commit['created_at'].isoformat() if commit['created_at'] else None
                    commits.append(commit)
                
                logger.info(f"Found {len(commits)} commits matching message pattern '{message_pattern}'")
                return commits
                
        except Exception as e:
            logger.error(f"Failed to get commits by message: {str(e)}")
            return []
    
    async def get_commits_by_file(
        self, 
        repository_id: str, 
        file_pattern: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get commits that affected specific files (for commit analysis Q&A).
        
        Args:
            repository_id: Repository ID
            file_pattern: File pattern to search for
            limit: Maximum number of commits to return
            
        Returns:
            List of commits that modified files matching the pattern
        """
        if not self.pool:
            logger.warning("Database pool not initialized")
            return []
        
        try:
            async with self.pool.acquire() as conn:
                # First, try to find commits through file changes table if it exists
                file_changes_query = """
                    SELECT DISTINCT 
                        c.sha,
                        c.message,
                        c.author_name,
                        c.author_email,
                        c.created_at,
                        c.additions,
                        c.deletions,
                        c.files_changed,
                        c.url,
                        c.summary,
                        c.status,
                        fc.filename,
                        fc.status as file_status
                    FROM commits c
                    JOIN file_changes fc ON c.sha = fc.commit_sha AND c.repository_id = fc.repository_id
                    WHERE c.repository_id = $1
                    AND fc.filename ILIKE $2
                    ORDER BY c.created_at DESC
                    LIMIT $3
                """
                
                search_pattern = f"%{file_pattern}%"
                rows = await conn.fetch(file_changes_query, repository_id, search_pattern, limit)
                
                commits = []
                for row in rows:
                    commit = dict(row)
                    commit['timestamp'] = commit['created_at'].isoformat() if commit['created_at'] else None
                    commit['affected_file'] = commit.get('filename')
                    commit['file_change_status'] = commit.get('file_status')
                    commits.append(commit)
                
                # If no results from file_changes table, fallback to simple message search
                if not commits:
                    fallback_query = """
                        SELECT 
                            sha,
                            message,
                            author_name,
                            author_email,
                            created_at,
                            additions,
                            deletions,
                            files_changed,
                            url,
                            summary,
                            status
                        FROM commits 
                        WHERE repository_id = $1
                        AND message ILIKE $2
                        ORDER BY created_at DESC
                        LIMIT $3
                    """
                    
                    rows = await conn.fetch(fallback_query, repository_id, search_pattern, limit)
                    
                    for row in rows:
                        commit = dict(row)
                        commit['timestamp'] = commit['created_at'].isoformat() if commit['created_at'] else None
                        commits.append(commit)
                
                logger.info(f"Found {len(commits)} commits affecting files matching '{file_pattern}'")
                return commits
                
        except Exception as e:
            logger.error(f"Failed to get commits by file: {str(e)}")
            return []

    async def get_files_with_content(self, repository_id: str) -> List[Dict[str, Any]]:
        """
        Get files with content for Q&A processing.
        This method retrieves files from the database and loads their content from B2 storage.
        Uses smart filtering to avoid loading too many files.
        
        Args:
            repository_id: Repository ID
            
        Returns:
            List of files with content loaded
        """
        try:
            # First get all file metadata from database
            files_metadata = await self.get_repository_files(repository_id)
            
            if not files_metadata:
                logger.warning(f"No files found in database for repository {repository_id}")
                return []
            
            # For general Q&A, we need to be smarter about which files to load
            # Create a basic question analysis for prioritization
            question_analysis = {
                'type': 'general',
                'specific_files': [],
                'specific_folders': [],
                'keywords': []
            }
            
            # Load content for relevant files using existing method
            files_with_content = await self.load_file_contents(files_metadata, question_analysis)
            
            logger.info(f"Successfully loaded content for {len(files_with_content)} files from repository {repository_id}")
            return files_with_content
            
        except Exception as e:
            logger.error(f"Failed to get files with content for repository {repository_id}: {str(e)}")
            return []

    async def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user information including GitHub token.
        
        Args:
            user_id: User ID
            
        Returns:
            User info dict containing github_token or None if not found
        """
        try:            
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    SELECT id, email, github_access_token as github_token, created_at
                    FROM users 
                    WHERE id = $1
                    """,
                    user_id
                )
                
                if row:
                    return {
                        'id': row['id'],
                        'email': row['email'],
                        'github_token': row['github_token'],
                        'created_at': row['created_at']
                    }
                else:
                    logger.warning(f"User {user_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get user info: {str(e)}")
            return None

# Global instance
database_service = DatabaseService()
