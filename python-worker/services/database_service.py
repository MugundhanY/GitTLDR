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
    
    async def get_repository(self, repository_id: str) -> Optional[Dict[str, Any]]:
        """
        Get repository data from database.
        
        Args:
            repository_id: Repository ID
            
        Returns:
            Repository dict or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:                
                row = await connection.fetchrow(
                    """
                    SELECT id, name, full_name, owner, url, description, language, stars, 
                           avatar_url, embedding_status, processed, file_count, total_size,
                           created_at, updated_at
                    FROM repositories 
                    WHERE id = $1
                    """,
                    repository_id                
                )
                
                if row:
                    return {
                        'id': row['id'],
                        'name': row['name'],
                        'full_name': row['full_name'],
                        'owner_name': row['owner'],  # Map 'owner' to 'owner_name'
                        'owner': row['owner'],
                        'url': row['url'],
                        'description': row['description'],
                        'language': row['language'],
                        'stars': row['stars'],
                        'avatar_url': row['avatar_url'],
                        'embedding_status': row['embedding_status'],
                        'processed': row['processed'],
                        'file_count': row['file_count'],
                        'total_size': row['total_size'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    }
                else:
                    logger.warning(f"Repository {repository_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get repository: {str(e)}")
            return None
    
    async def get_repository_status(self, repository_id: str) -> Optional[Dict[str, Any]]:
        """
        Get repository processing status from database (alias for get_repository).
        
        Args:
            repository_id: Repository ID
            
        Returns:
            Repository status dict or None if not found
        """
        return await self.get_repository(repository_id)
    
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
            
            if content:
                logger.info(f"✅ Downloaded {file_info.get('path')}: {len(content)} chars. Preview: {content[:100]!r}")
            else:
                logger.warning(f"⚠️ Downloaded empty content for {file_info.get('path')}")
            
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
        category: str = "ai_generated",
        attachment_ids: List[str] = None  # ✅ NEW: Attachment IDs to link
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
            attachment_ids: List of attachment IDs to link to this question
            
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
                
                # ✅ NEW: Link attachments to this question
                if attachment_ids and len(attachment_ids) > 0:
                    logger.info(f"📎 Linking {len(attachment_ids)} attachments to question {question_id}")
                    for att_id in attachment_ids:
                        try:
                            await connection.execute(
                                """
                                UPDATE question_attachments 
                                SET question_id = $1, updated_at = NOW()
                                WHERE id = $2
                                """,
                                question_id,
                                att_id
                            )
                            logger.info(f"✅ Linked attachment {att_id} to question {question_id}")
                        except Exception as link_error:
                            logger.error(f"❌ Failed to link attachment {att_id}: {str(link_error)}")
                
                return str(question_id)
                
        except Exception as e:
            logger.error(f"Failed to create question in database: {str(e)}")
            raise
    
    async def update_question(
        self,
        question_id: str,
        answer: str = None,
        confidence_score: float = None,
        relevant_files: List[str] = None,
        status: str = None
    ) -> bool:
        """
        Update an existing question entry in the database.
        
        Args:
            question_id: Question ID to update
            answer: The answer text (optional)
            confidence_score: Confidence score for the answer (optional)
            relevant_files: List of relevant file paths (optional)
            status: Status of the question (optional, e.g. 'completed')
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Build dynamic update query
                updates = ["updated_at = NOW()"]
                params = []
                param_count = 0
                
                if answer is not None:
                    param_count += 1
                    updates.append(f"answer = ${param_count}")
                    params.append(answer)
                
                if confidence_score is not None:
                    param_count += 1
                    updates.append(f"confidence_score = ${param_count}")
                    params.append(confidence_score)
                
                if relevant_files is not None:
                    param_count += 1
                    updates.append(f"relevant_files = ${param_count}")
                    params.append(json.dumps(relevant_files))
                
                if status is not None:
                    param_count += 1
                    updates.append(f"status = ${param_count}")
                    params.append(status)
                
                # Add question_id as last parameter
                param_count += 1
                params.append(question_id)
                
                query = f"""
                    UPDATE questions 
                    SET {', '.join(updates)}
                    WHERE id = ${param_count}
                    RETURNING id
                """
                
                result = await connection.fetchval(query, *params)
                
                if result:
                    logger.info(f"Successfully updated question {question_id}")
                    return True
                else:
                    logger.warning(f"Question {question_id} not found for update")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to update question: {str(e)}")
            return False
    
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
        Uses indexed query for optimal performance.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Optimized query with index on (repository_id, created_at)
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
                
                rows = await conn.fetch(query, repository_id, limit, offset)
                
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
        Supports flexible date queries like 'today', 'this week', etc.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Build dynamic query based on date parameters
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
                
                rows = await conn.fetch(query, *params)
                
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
        Get commits by author pattern with efficient text search.
        Uses ILIKE for case-insensitive pattern matching.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Optimized query with index on (repository_id, author_name)
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
                
                # Add wildcards for pattern matching
                search_pattern = f"%{author_pattern}%"
                rows = await conn.fetch(query, repository_id, search_pattern, limit)
                
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
        Get specific commit by SHA with optional file details.
        Supports partial SHA matching (minimum 6 characters).
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Base commit query
                commit_query = """
                    SELECT c.id, c.sha, c.message, c.author_name, c.author_email, 
                           c.created_at, c.url, c.additions, c.deletions
                    FROM commits c
                    WHERE c.repository_id = $1 AND c.sha LIKE $2
                    ORDER BY c.created_at DESC
                    LIMIT 1
                """
                
                # Support partial SHA (minimum 6 chars for safety)
                if len(commit_sha) < 6:
                    logger.warning(f"Commit SHA too short: {commit_sha}")
                    return None
                
                sha_pattern = f"{commit_sha}%"
                commit_row = await conn.fetchrow(commit_query, repository_id, sha_pattern)
                
                if not commit_row:
                    return None
                
                commit_data = dict(commit_row)
                commit_data['created_at'] = commit_data['created_at'].isoformat() if commit_data['created_at'] else None
                
                # Optionally include changed files
                if include_files:
                    files_query = """
                        SELECT cf.filename, cf.status, cf.additions, cf.deletions
                        FROM commit_files cf
                        WHERE cf.commit_id = $1
                        ORDER BY cf.filename
                    """
                    
                    file_rows = await conn.fetch(files_query, commit_data['id'])
                    commit_data['files'] = [dict(row) for row in file_rows]
                    commit_data['files_changed'] = len(commit_data['files'])
                
                # Remove internal ID from response
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
        Search commits by message content with full-text search capabilities.
        Uses efficient ILIKE for pattern matching with potential for future GIN indexing.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Full-text search on commit messages
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
                rows = await conn.fetch(query, repository_id, search_pattern, limit)
                
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
        Get commits that modified files matching a pattern.
        Efficient join with indexed commit_files table.
        """
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                # Join with commit_files for file-specific commits
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
                rows = await conn.fetch(query, repository_id, file_search_pattern, limit)
                
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
        Loads content for ALL files to ensure hybrid retrieval has complete data.
        
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
            
            # ✅ CRITICAL FIX: Load content for ALL files, not just filtered subset
            # This ensures hybrid retrieval can access any file's content
            files_with_content = []
            for file_info in files_metadata:
                try:
                    content = await self._load_file_content(file_info)
                    if content:
                        file_with_content = file_info.copy()
                        file_with_content['content'] = content
                        files_with_content.append(file_with_content)
                    else:
                        # Even if content load fails, include file with empty content
                        # so it can still be used for path/metadata matching
                        file_with_content = file_info.copy()
                        file_with_content['content'] = ''
                        files_with_content.append(file_with_content)
                except Exception as e:
                    logger.warning(f"Failed to load content for {file_info.get('path')}: {str(e)}")
                    # Still include file with empty content
                    file_with_content = file_info.copy()
                    file_with_content['content'] = ''
                    files_with_content.append(file_with_content)
            
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
        
    async def get_meeting_info(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """
        Get meeting information from the database.
        
        Args:
            meeting_id: Meeting ID
            
        Returns:
            Meeting info dict or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Get meeting data with segments
                meeting_row = await connection.fetchrow(
                    """
                    SELECT 
                        id,
                        title,
                        full_transcript,
                        summary,
                        status,
                        created_at,
                        updated_at,
                        source,
                        language,
                        raw_audio_path,
                        num_segments,
                        meeting_length
                    FROM meetings 
                    WHERE id = $1
                    """,
                    meeting_id
                )
                
                if not meeting_row:
                    logger.warning(f"Meeting {meeting_id} not found in database")
                    return None
                
                # Get meeting segments
                segments_rows = await connection.fetch(
                    """
                    SELECT 
                        id,
                        segment_index,
                        title,
                        summary,
                        excerpt,
                        segment_text,
                        start_time,
                        end_time
                    FROM meeting_segments 
                    WHERE meeting_id = $1
                    ORDER BY segment_index
                    """,
                    meeting_id
                )
                
                # Format the response
                meeting_info = {
                    'id': meeting_row['id'],
                    'title': meeting_row['title'],
                    'full_transcript': meeting_row['full_transcript'],
                    'summary': meeting_row['summary'],
                    'status': meeting_row['status'],
                    'created_at': meeting_row['created_at'],
                    'updated_at': meeting_row['updated_at'],
                    'source': meeting_row['source'],
                    'language': meeting_row['language'],
                    'raw_audio_path': meeting_row['raw_audio_path'],
                    'num_segments': meeting_row['num_segments'],
                    'duration': meeting_row['meeting_length'],  # Use meeting_length as duration
                    'segments': []
                }
                
                # Add segments
                for segment_row in segments_rows:
                    meeting_info['segments'].append({
                        'id': segment_row['id'],
                        'segment_index': segment_row['segment_index'],
                        'title': segment_row['title'],
                        'summary': segment_row['summary'],
                        'excerpt': segment_row['excerpt'],
                        'segment_text': segment_row['segment_text'],
                        'start_time': segment_row['start_time'],
                        'end_time': segment_row['end_time']
                    })
                
                logger.info(f"Successfully retrieved meeting info for {meeting_id} with {len(meeting_info['segments'])} segments")
                return meeting_info
                
        except Exception as e:
            logger.error(f"Failed to get meeting info for {meeting_id}: {str(e)}")
            return None

    async def get_issue_fix(self, issue_fix_id: str) -> Optional[Dict[str, Any]]:
        """
        Get IssueFix record from database.
        
        Args:
            issue_fix_id: IssueFix ID
            
        Returns:
            IssueFix dict or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    SELECT 
                        id, repository_id, user_id, issue_number, issue_title, issue_body, issue_url,
                        analysis, relevant_files, proposed_fix, diff, explanation, confidence,
                        status, error_message,
                        pr_number, pr_url, pr_created_at,
                        created_at, updated_at, completed_at
                    FROM issue_fixes 
                    WHERE id = $1
                    """,
                    issue_fix_id
                )
                
                if row:
                    # Parse JSON fields
                    analysis = json.loads(row['analysis']) if row['analysis'] else None
                    relevant_files = json.loads(row['relevant_files']) if row['relevant_files'] else None
                    proposed_fix = json.loads(row['proposed_fix']) if row['proposed_fix'] else None
                    
                    return {
                        'id': row['id'],
                        'repository_id': row['repository_id'],
                        'user_id': row['user_id'],
                        'issue_number': row['issue_number'],
                        'issue_title': row['issue_title'],
                        'issue_body': row['issue_body'],
                        'issue_url': row['issue_url'],
                        'analysis': analysis,
                        'relevant_files': relevant_files,
                        'proposed_fix': proposed_fix,
                        'diff': row['diff'],  # Include diff field
                        'explanation': row['explanation'],
                        'confidence': float(row['confidence']) if row['confidence'] is not None else None,
                        'status': row['status'],
                        'error_message': row['error_message'],
                        'pr_number': row['pr_number'],
                        'pr_url': row['pr_url'],
                        'pr_created_at': row['pr_created_at'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at'],
                        'completed_at': row['completed_at']
                    }
                else:
                    logger.warning(f"IssueFix {issue_fix_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get IssueFix {issue_fix_id}: {str(e)}")
            return None

    async def update_issue_fix(
        self,
        issue_fix_id: str,
        status: str = None,
        analysis: Dict[str, Any] = None,
        relevant_files: List[Dict[str, Any]] = None,
        proposed_fix: Dict[str, Any] = None,
        diff: str = None,
        explanation: str = None,
        confidence: float = None,
        error_message: str = None,
        issue_body: str = None
    ) -> bool:
        """
        Update an IssueFix record in the database.
        
        Args:
            issue_fix_id: IssueFix ID to update
            status: New status
            analysis: Issue analysis JSON
            relevant_files: Relevant files JSON
            proposed_fix: Proposed fix JSON (LEGACY: operations format)
            diff: Unified diff patch (PRIMARY format)
            explanation: Human-readable explanation
            confidence: AI confidence score
            error_message: Error message if failed
            issue_body: Updated issue body (for clarification context)
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                # Build dynamic update query
                updates = ["updated_at = NOW()"]
                params = []
                param_count = 0
                
                if status is not None:
                    param_count += 1
                    updates.append(f"status = ${param_count}")
                    params.append(status)
                
                if analysis is not None:
                    param_count += 1
                    updates.append(f"analysis = ${param_count}")
                    params.append(json.dumps(analysis))
                
                if relevant_files is not None:
                    param_count += 1
                    updates.append(f"relevant_files = ${param_count}")
                    params.append(json.dumps(relevant_files))
                
                if proposed_fix is not None:
                    param_count += 1
                    updates.append(f"proposed_fix = ${param_count}")
                    params.append(json.dumps(proposed_fix))
                
                if diff is not None:
                    param_count += 1
                    updates.append(f"diff = ${param_count}")
                    params.append(diff)
                
                if explanation is not None:
                    param_count += 1
                    updates.append(f"explanation = ${param_count}")
                    params.append(explanation)
                
                if confidence is not None:
                    param_count += 1
                    updates.append(f"confidence = ${param_count}")
                    params.append(confidence)
                    logger.info(f"💾 Saving confidence: {confidence} (type: {type(confidence).__name__}) for issue_fix_id: {issue_fix_id}")
                
                if error_message is not None:
                    param_count += 1
                    updates.append(f"error_message = ${param_count}")
                    params.append(error_message)
                
                if issue_body is not None:
                    param_count += 1
                    updates.append(f"issue_body = ${param_count}")
                    params.append(issue_body)
                
                if status == 'COMPLETED':
                    updates.append("completed_at = NOW()")
                
                param_count += 1
                params.append(issue_fix_id)
                
                query = f"""
                    UPDATE issue_fixes
                    SET {', '.join(updates)}
                    WHERE id = ${param_count}
                """
                
                logger.info(f"🔍 SQL Query: {query}")
                logger.info(f"🔍 SQL Params: {params}")
                await connection.execute(query, *params)
                logger.info(f"✅ Updated IssueFix {issue_fix_id} with status={status}, confidence={'in update' if confidence is not None else 'not modified'}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to update IssueFix {issue_fix_id}: {str(e)}")
            return False
    
    async def get_file_content(
        self,
        repository_id: str,
        file_path: str
    ) -> Optional[str]:
        """
        Get file content from database or B2 storage.
        
        Args:
            repository_id: Repository ID
            file_path: File path within repository
            
        Returns:
            File content as string, or None if not found
        """
        try:
            pool = await self._get_connection_pool()
            
            async with pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    SELECT id, file_key, file_url, size
                    FROM repository_files
                    WHERE repository_id = $1 AND path = $2
                    """,
                    repository_id,
                    file_path
                )
                
                if not row:
                    logger.warning(f"File not found: {file_path} in repo {repository_id}")
                    return None
                
                # Load content from B2 storage
                if row['file_key']:
                    try:
                        content_bytes = await asyncio.to_thread(
                            self.b2_storage.download_file,
                            row['file_key']
                        )
                        content = content_bytes.decode('utf-8', errors='ignore')
                        return content
                    except Exception as e:
                        logger.error(f"Failed to load file from B2: {str(e)}")
                        return None
                else:
                    logger.warning(f"File {file_path} has no B2 key")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get file content: {str(e)}")
            return None
    
    async def search_files_by_keywords(
        self,
        repository_id: str,
        keywords: List[str],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search files by keywords using full-text search.
        
        Args:
            repository_id: Repository ID
            keywords: List of keywords to search for
            limit: Maximum number of results
            
        Returns:
            List of matching files with content
        """
        try:
            pool = await self._get_connection_pool()
            
            # Build keyword search query
            keyword_conditions = []
            for keyword in keywords[:10]:  # Limit to 10 keywords
                keyword_conditions.append(f"(path ILIKE '%{keyword}%' OR summary ILIKE '%{keyword}%')")
            
            if not keyword_conditions:
                return []
            
            query = f"""
                SELECT id, path, name, size, summary, language, file_key, file_url
                FROM repository_files
                WHERE repository_id = $1 AND ({' OR '.join(keyword_conditions)})
                ORDER BY size ASC
                LIMIT {limit}
            """
            
            async with pool.acquire() as connection:
                rows = await connection.fetch(query, repository_id)
                
                # Load file contents
                results = []
                for row in rows:
                    if row['file_key']:
                        try:
                            content_bytes = await asyncio.to_thread(
                                self.b2_storage.download_file,
                                row['file_key']
                            )
                            content = content_bytes.decode('utf-8', errors='ignore')
                            
                            results.append({
                                'file_path': row['path'],
                                'content': content[:10000],  # Limit to 10K chars
                                'match_score': 0.7  # Base score for keyword match
                            })
                        except Exception as e:
                            logger.warning(f"Failed to load {row['path']}: {str(e)}")
                            continue
                
                logger.info(f"Found {len(results)} files matching keywords")
                return results
                
        except Exception as e:
            logger.error(f"Failed to search files by keywords: {str(e)}")
            return []
    
    async def get_file_dependencies(
        self,
        repository_id: str,
        file_paths: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Get dependencies for files (imports, etc).
        
        Args:
            repository_id: Repository ID
            file_paths: List of file paths
            
        Returns:
            Dict mapping file paths to dependency info
        """
        try:
            # For now, return empty dict
            # TODO: Implement dependency analysis using Neo4j or code analysis
            logger.debug(f"Dependency analysis not implemented yet for {len(file_paths)} files")
            return {}
                
        except Exception as e:
            logger.error(f"Failed to get file dependencies: {str(e)}")
            return {}

# Global instance
database_service = DatabaseService()

