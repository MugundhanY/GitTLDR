"""
Scalable Commit Analysis Service for GitTLDR Q&A.
Handles intelligent commit question detection, caching, and context formatting.
Uses GitHub API for real-time commit data instead of limited database storage.

NOTE: This service is for Q&A RETRIEVAL only. It does NOT interfere with the existing
SummarizationProcessor.summarize_commit() method used during repository creation.
"""
import re
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from services.database_service import database_service
from services.github_commit_service import GitHubCommitService
from services.redis_client import redis_client
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class CommitQueryParams:
    """Structured parameters for commit queries."""
    question_type: str  # 'recent', 'date_range', 'author', 'sha', 'message', 'file'
    limit: int = 10
    author_pattern: Optional[str] = None
    message_pattern: Optional[str] = None
    file_pattern: Optional[str] = None
    commit_sha: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    include_files: bool = False


class CommitAnalysisService:
    """
    Scalable service for analyzing commit-related questions and retrieving relevant commit data.
    
    PURPOSE: Q&A retrieval and analysis ONLY.
    DOES NOT interfere with existing SummarizationProcessor used during repo creation.
    
    Features:
    - Intelligent commit question detection
    - Efficient database queries with caching
    - Context formatting for AI Q&A
    - Scalable pattern matching
    """    
    # Scalability settings
    MAX_COMMITS_PER_QUERY = 50  # Reasonable limit for AI context
    GITHUB_API_PAGE_SIZE = 30   # GitHub's default page size
    RATE_LIMIT_DELAY = 1.0      # Delay between API calls

    def __init__(self):
        """Initialize the commit analysis service."""
        self.cache_ttl = 3600  # 1 hour cache for commit data (increased)
        self.question_patterns = self._build_question_patterns()
        self._api_call_count = 0
        self._last_api_call = 0

    def _build_question_patterns(self) -> Dict[str, List[str]]:
        """Build comprehensive patterns for commit question detection."""
        return {
            'recent': [
                r'\b(last|latest|recent|newest)\s+(commit|commits?)\b',
                r'\bwhat.*(last|latest|recent)\s+commit\b',
                r'\bshow.*recent\s+commit\b',
                r'\bwhat.*happened.*recently\b',
                r'\blatest\s+\d+\s+commits?\b',
                r'\bwhat.*latest.*\d+.*commits?\b'
            ],            'first': [
                r'\b(first|earliest|initial|oldest)\s+(commit|commits?)\b',
                r'\bwhat.*(first|earliest|initial)\s+commit\b',
                r'\bshow.*first\s+commit\b',
                r'\bwhat.*happened.*first\b',
                r'\bwhen.*(did|started|start)\b',
                r'\binitial\s+commit\b',
                r'\boriginal\s+commit\b',
                r'\bfirst\s+\d+\s+commits?\b',
                r'\bshow.*first\s+few\s+commits?\b',
                r'\bfirst\s+few\s+commits?\b'
            ],
            'date_range': [
                r'\bcommits?\s+(on|from|since|before|after|during)\s+(\d{4}-\d{2}-\d{2}|\w+day|\w+week|\w+month)\b',
                r'\b(today|yesterday|this\s+week|last\s+week|this\s+month).*commit\b',
                r'\bcommits?\s+(in|from)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b',
                r'\bcommits?\s+.*\b(yesterday|today|this week|last week|this month|last month)\b',
                r'\bwhat.*commits?.*\b(yesterday|today|this week|last week|this month)\b'
            ],
            'author': [
                r'\bcommits?\s+(by|from|authored by)\s+([a-zA-Z\s]+)\b',
                r'\bwho.*commit\b',
                r'\b([a-zA-Z\s]+).*(commit|committed)\b',
                r'\bmy\s+commits?\b'
            ],
            'sha': [
                r'\bcommit\s+([a-f0-9]{6,40})\b',
                r'\bshow.*commit\s+([a-f0-9]{6,40})\b',
                r'\b([a-f0-9]{6,40}).*commit\b'
            ],
            'message': [
                r'\bcommit.*["\']([^"\']+)["\']\b',
                r'\bcommit.*(?:with|containing|about|titled)\s+(.+)\b',
                r'\bcommits?.*(?:fix|bug|feature|add|remove|update)\b'
            ],
            'file': [
                r'\bcommits?\s+(?:that\s+)?(?:changed|modified|affected|touched)\s+([^\s]+\.[a-zA-Z0-9]+)\b',
                r'\bwho\s+(?:last\s+)?(?:changed|modified)\s+([^\s]+\.[a-zA-Z0-9]+)\b',
                r'\b([^\s]+\.[a-zA-Z0-9]+).*(?:commit|changed|modified)\b',
                r'\bwhat.*changed.*(?:in|to)\s+([^\s]+\.[a-zA-Z0-9]+)\b',
                r'\bchanges?.*(?:in|to|for)\s+(?:file\s+)?([^\s]+\.[a-zA-Z0-9]+)\b'
            ]
        }
    
    async def analyze_question(self, question: str) -> Tuple[bool, Optional[CommitQueryParams]]:
        """
        Analyze if a question is commit-related and extract query parameters.
        
        Returns:
            Tuple of (is_commit_question, query_params)
        """
        question_lower = question.lower()        # Quick keyword check for performance
        commit_keywords = ['commit', 'commits', 'committed', 'sha', 'hash', 'author', 'change', 'modified', 'repository', 'start', 'started']
        if not any(keyword in question_lower for keyword in commit_keywords):
            return False, None
        
        # Detailed pattern matching
        for question_type, patterns in self.question_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, question_lower, re.IGNORECASE)
                if match:
                    params = await self._extract_query_params(question_type, question, match)
                    if params:
                        logger.info(f"Detected {question_type} commit question: {question}")
                        return True, params
        
        return False, None

    async def _extract_query_params(self, question_type: str, question: str, match: re.Match) -> Optional[CommitQueryParams]:
        """Extract specific query parameters based on question type and regex match."""
        try:
            if question_type == 'recent':
                return CommitQueryParams(
                    question_type='recent',
                    limit=5
                )
            
            elif question_type == 'first':
                return CommitQueryParams(
                    question_type='first',
                    limit=5  # Return first few commits
                )
            
            elif question_type == 'date_range':
                start_date, end_date = self._extract_date_range(question)
                return CommitQueryParams(
                    question_type='date_range',
                    start_date=start_date,
                    end_date=end_date,
                    limit=20
                )
            
            elif question_type == 'author':
                author_pattern = self._extract_author_pattern(question, match)
                return CommitQueryParams(
                    question_type='author',
                    author_pattern=author_pattern,
                    limit=15
                )
            
            elif question_type == 'sha':
                commit_sha = match.group(1) if match.groups() else None
                return CommitQueryParams(
                    question_type='sha',
                    commit_sha=commit_sha,
                    limit=1,
                    include_files=True
                )
            
            elif question_type == 'message':
                message_pattern = self._extract_message_pattern(question, match)
                return CommitQueryParams(
                    question_type='message',
                    message_pattern=message_pattern,
                    limit=10
                )
            
            elif question_type == 'file':
                file_pattern = match.group(1) if match.groups() else None
                return CommitQueryParams(
                    question_type='file',
                    file_pattern=file_pattern,
                    limit=10,
                    include_files=True
                )
            
            return None
            
        except Exception as e:
            logger.warning(f"Failed to extract query params for {question_type}: {str(e)}")
            return None
    
    def _extract_date_range(self, question: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract date range from question."""
        question_lower = question.lower()
        today = datetime.now()
        
        if 'yesterday' in question_lower:
            yesterday = today - timedelta(days=1)
            return yesterday.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')
        
        elif 'today' in question_lower:
            return today.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
        
        elif 'this week' in question_lower:
            start_of_week = today - timedelta(days=today.weekday())
            return start_of_week.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
        
        elif 'last week' in question_lower:
            end_of_last_week = today - timedelta(days=today.weekday() + 1)
            start_of_last_week = end_of_last_week - timedelta(days=6)
            return start_of_last_week.strftime('%Y-%m-%d'), end_of_last_week.strftime('%Y-%m-%d')
        
        elif 'this month' in question_lower:
            start_of_month = today.replace(day=1)
            return start_of_month.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
        
        # Try to extract specific dates (YYYY-MM-DD format)
        date_pattern = r'(\d{4}-\d{2}-\d{2})'
        dates = re.findall(date_pattern, question)
        if dates:
            if len(dates) == 1:
                return dates[0], dates[0]
            else:
                return dates[0], dates[1]
        
        return None, None
    
    def _extract_author_pattern(self, question: str, match: re.Match) -> Optional[str]:
        """Extract author pattern from question."""
        # Try to get from regex match first
        if match.groups():
            for group in match.groups():
                if group and len(group.strip()) > 1:
                    return group.strip()
        
        # Fallback: look for names after keywords
        author_patterns = [
            r'by\s+([A-Za-z\s]+?)(?:\s|$|,|\.|;)',
            r'from\s+([A-Za-z\s]+?)(?:\s|$|,|\.|;)',
            r'author\s+([A-Za-z\s]+?)(?:\s|$|,|\.|;)'
        ]
        
        for pattern in author_patterns:
            matches = re.findall(pattern, question, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        
        return None
    
    def _extract_message_pattern(self, question: str, match: re.Match) -> Optional[str]:
        """Extract message pattern from question."""
        # Try to get from regex match first
        if match.groups():
            for group in match.groups():
                if group and len(group.strip()) > 2:
                    return group.strip()
          # Look for keywords that might be in commit messages
        keywords = ['fix', 'bug', 'feature', 'add', 'remove', 'update', 'implement', 'refactor']
        for keyword in keywords:
            if keyword in question.lower():
                return keyword
        
        return None
    
    async def get_commits_for_question(self, repository_id: str, params: CommitQueryParams, user_id: str = None) -> List[Dict[str, Any]]:
        """
        Retrieve commits based on query parameters with caching.
        
        Args:
            repository_id: Repository ID
            params: Query parameters
            user_id: User ID to get GitHub token
            
        Returns:
            List of relevant commits
        """
        # Generate cache key
        cache_key = f"commit_query:{repository_id}:{hash(str(asdict(params)))}"
        
        # Try to get from cache first
        try:
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for commit query: {params.question_type}")
                return json.loads(cached_result)        
        except Exception as e:
            logger.debug(f"Cache miss for commit query: {str(e)}")
          # Query database
        commits = await self._query_database_for_commits(repository_id, params, user_id)
          # Cache the result
        try:
            await redis_client.setex(cache_key, self.cache_ttl, json.dumps(commits))
        except Exception as e:
            logger.debug(f"Failed to cache commit query result: {str(e)}")
        
        logger.info(f"Retrieved {len(commits)} commits for {params.question_type} query")
        return commits
    
    async def get_commits_for_question_github_api(self, repository_id: str, params: CommitQueryParams, github_token: str = None) -> list[dict]:
        """
        Always fetch commit info from GitHub API using the provided token, never from DB.
        Returns normalized commit dicts for Q&A context (with 'files' key for compatibility).
        Ensures that for each commit, the 'files' array is present by fetching full commit details by SHA if needed.
        """
        try:
            repo_owner, repo_name = await self._get_repository_github_info(repository_id)
            if not repo_owner or not repo_name:
                logger.error(f"[GitHub API] Could not determine GitHub repo for {repository_id}")
                return []

            github_service = GitHubCommitService(user_github_token=github_token)
            await self._check_rate_limit()
            effective_limit = min(params.limit, self.MAX_COMMITS_PER_QUERY)
            commits = []

            # Fetch commit list (may not include file changes)
            if params.question_type == 'recent':
                commits = await github_service.get_recent_commits(repo_owner, repo_name, limit=effective_limit)
            elif params.question_type == 'first':
                commits = await github_service.get_earliest_commits(repo_owner, repo_name, limit=effective_limit)
            elif params.question_type == 'date_range':
                commits = await github_service.get_commits_by_date_range(repo_owner, repo_name, params.start_date, params.end_date, limit=effective_limit)
            elif params.question_type == 'author':
                commits = await github_service.get_commits_by_author(repo_owner, repo_name, params.author_pattern, limit=effective_limit)
            elif params.question_type == 'sha':
                commit = await github_service.get_commit_by_sha(repo_owner, repo_name, params.commit_sha, include_files=True)
                commits = [commit] if commit else []
            elif params.question_type == 'message':
                commits = await github_service.search_commits_by_message(repo_owner, repo_name, params.message_pattern, limit=effective_limit)
            elif params.question_type == 'file':
                commits = await github_service.get_commits_affecting_file(repo_owner, repo_name, params.file_pattern, limit=effective_limit)
            else:
                logger.warning(f"[GitHub API] Unknown commit question type: {params.question_type}")
                commits = []

            # For each commit, fetch full details (with files) if not already present
            detailed_commits = []
            for commit in commits:
                sha = commit.get('sha')
                files = commit.get('files_changed') or commit.get('files')
                # If files are missing or empty, fetch full commit details
                if not files or not isinstance(files, list) or len(files) == 0:
                    try:
                        full_commit = await github_service.get_commit_by_sha(repo_owner, repo_name, sha, include_files=True)
                        if full_commit:
                            files = full_commit.get('files_changed') or full_commit.get('files') or []
                            commit = dict(commit)
                            commit['files'] = files
                    except Exception as e:
                        logger.warning(f"[GitHub API] Could not fetch full details for commit {sha}: {str(e)}")
                        commit = dict(commit)
                        commit['files'] = []
                else:
                    commit = dict(commit)
                    commit['files'] = files
                detailed_commits.append(commit)

            if github_service.session and not github_service.session.closed:
                await github_service.session.close()

            logger.info(f"[GitHub API] get_commits_for_question_github_api: Returning {len(detailed_commits)} commits for {params.question_type}")
            return detailed_commits
        except Exception as e:
            logger.error(f"[GitHub API] Error in get_commits_for_question_github_api: {str(e)}")
            return []

    async def _query_database_for_commits(self, repository_id: str, params: CommitQueryParams, user_id: str = None) -> List[Dict[str, Any]]:
        """Query GitHub API for commits with scalability and rate limiting."""
        try:
            # Get user's GitHub service with their token
            github_service = await self._get_github_service(user_id) if user_id else GitHubCommitService()
            
            # Check rate limiting
            await self._check_rate_limit()
            
            # Get GitHub repository info
            repo_owner, repo_name = await self._get_repository_github_info(repository_id)
            if not repo_owner or not repo_name:
                logger.error(f"Could not determine GitHub repository for {repository_id}")
                return []
            
            # Apply intelligent limits based on question type
            effective_limit = min(params.limit, self.MAX_COMMITS_PER_QUERY)
            
            logger.info(f"Fetching up to {effective_limit} commits from GitHub: {repo_owner}/{repo_name}")
            
            # Use hybrid approach: try database first for recent commits, then GitHub API
            commits = []
            if params.question_type == 'recent':
                # For recent commits, try database first (fast), then supplement with GitHub
                commits = await self._get_recent_commits_hybrid(repository_id, repo_owner, repo_name, effective_limit, github_service)
            
            elif params.question_type == 'first':
                # For first/earliest commits, get all commits and return the oldest ones
                commits = await github_service.get_earliest_commits(
                    repo_owner, repo_name, limit=effective_limit
                )
            
            elif params.question_type == 'date_range':
                commits = await github_service.get_commits_by_date_range(
                    repo_owner, repo_name, params.start_date, params.end_date, limit=effective_limit
                )
            
            elif params.question_type == 'author':
                commits = await github_service.get_commits_by_author(
                    repo_owner, repo_name, params.author_pattern, limit=effective_limit
                )
            
            elif params.question_type == 'sha':
                commit = await github_service.get_commit_by_sha(
                    repo_owner, repo_name, params.commit_sha
                )
                commits = [commit] if commit else []
            
            elif params.question_type == 'message':
                commits = await github_service.search_commits_by_message(
                    repo_owner, repo_name, params.message_pattern, limit=effective_limit
                )
            
            elif params.question_type == 'file':
                commits = await github_service.get_commits_affecting_file(
                    repo_owner, repo_name, params.file_pattern, limit=effective_limit
                )
            
            # Clean up the GitHub service session
            if github_service.session and not github_service.session.closed:
                await github_service.session.close()
            
            # Track API usage
            self._api_call_count += 1
            logger.info(f"API call #{self._api_call_count} completed, retrieved {len(commits)} commits")
            return commits
            
        except Exception as e:
            logger.error(f"Failed to query commits for {params.question_type}: {str(e)}")
            return []
    
    def format_commits_for_context(self, commits: List[Dict[str, Any]], question: str) -> List[str]:
        """
        Format commits for AI context with intelligent summarization.
        
        Args:
            commits: List of commit data
            question: Original question for context
            
        Returns:
            List of formatted commit strings for AI context
        """
        if not commits:
            return []
        
        formatted_commits = [
            "=" * 60,
            "🔄 COMMIT ANALYSIS",
            "=" * 60,
            f"Found {len(commits)} relevant commits for question: {question}",
            ""
        ]
        
        for i, commit in enumerate(commits[:10], 1):  # Limit to 10 commits for context size
            # Extract author information from different possible formats
            author_name = "Unknown"
            author_email = ""
            
            # Try different author data formats
            if commit.get('author') and isinstance(commit['author'], dict):
                author_name = commit['author'].get('name', author_name)
                author_email = commit['author'].get('email', author_email)
            elif commit.get('author_name'):
                author_name = commit['author_name']
                author_email = commit.get('author_email', author_email)
            
            commit_lines = [
                f"COMMIT {i}: {commit.get('sha', 'unknown')[:8]}",
                f"Message: {commit.get('message', 'No message')}",
                f"Author: {author_name} <{author_email}>",
                f"Date: {commit.get('created_at', commit.get('timestamp', 'Unknown'))}",
            ]
            
            # Add file changes if available - handle both old and new format
            files_info = []
            
            # New format: files_changed as list of objects
            if commit.get('files_changed') and isinstance(commit['files_changed'], list):
                for file_info in commit['files_changed']:
                    if isinstance(file_info, dict):
                        filename = file_info.get('filename', 'unknown')
                        status = file_info.get('status', 'modified')
                        additions = file_info.get('additions', 0)
                        deletions = file_info.get('deletions', 0)
                        files_info.append(f"{filename} ({status}: +{additions}/-{deletions})")
                    else:
                        files_info.append(str(file_info))
            
            # Old format: files_changed as string
            elif commit.get('files_changed') and isinstance(commit['files_changed'], str):
                files_info.append(commit['files_changed'])
            
            # Alternative key: files
            elif commit.get('files'):
                if isinstance(commit['files'], list):
                    for file_info in commit['files']:
                        if isinstance(file_info, dict):
                            filename = file_info.get('filename', 'unknown')
                            status = file_info.get('status', 'modified')
                            files_info.append(f"{filename} ({status})")
                        else:
                            files_info.append(str(file_info))
                else:
                    files_info.append(str(commit['files']))
            
            # Alternative: extract from author info (sometimes used)
            elif commit.get('author') and isinstance(commit['author'], dict):
                # Check for author-level file info (less common)
                pass  # Skip for now
            
            if files_info:
                commit_lines.append(f"Files Changed: {', '.join(files_info[:5])}{'...' if len(files_info) > 5 else ''}")
            else:
                commit_lines.append("Files Changed: No file change information available")
            
            # Add commit stats if available
            if commit.get('stats'):
                stats = commit['stats']
                if isinstance(stats, dict):
                    total_add = stats.get('additions', 0)
                    total_del = stats.get('deletions', 0)
                    total_files = stats.get('total', 0)
                    if total_add or total_del or total_files:
                        commit_lines.append(f"Changes: {total_files} files, +{total_add}/-{total_del} lines")
            
            # Add existing AI summary if available (from SummarizationProcessor)
            if commit.get('summary'):
                commit_lines.append(f"AI Summary: {commit['summary']}")
            
            # Add URL if available
            if commit.get('url'):
                commit_lines.append(f"GitHub URL: {commit['url']}")
            elif commit.get('html_url'):
                commit_lines.append(f"GitHub URL: {commit['html_url']}")
            
            formatted_commits.extend(commit_lines)
            formatted_commits.append("-" * 40)
        
        formatted_commits.extend([
            "",
            "End of commit analysis.",
            "=" * 60,
            ""
        ])
        
        return ["\n".join(formatted_commits)]
    
    async def _get_repository_github_info(self, repository_id: str) -> Optional[Tuple[str, str]]:
        """Get GitHub repository owner and name from database."""
        try:
            repo_status = await database_service.get_repository_status(repository_id)
            if not repo_status:
                logger.warning(f"Repository {repository_id} not found in database")
                return None, None
            
            # Extract GitHub info from repository URL or name
            repo_name = repo_status.get('name', '')
            repo_url = repo_status.get('url', '')
            
            # Try to parse from URL first
            if repo_url and 'github.com' in repo_url:
                # Create a temporary service instance for parsing
                temp_service = GitHubCommitService()
                owner, name = temp_service.parse_repository_from_url(repo_url)
                if owner and name:
                    return owner, name
            
            # Try to parse from name (format: owner/repo)
            if '/' in repo_name:
                parts = repo_name.split('/')
                if len(parts) >= 2:
                    return parts[-2], parts[-1]  # Get last two parts
            
            logger.warning(f"Could not extract GitHub info for repository {repository_id}")
            return None, None
            
        except Exception as e:
            logger.error(f"Failed to get repository GitHub info: {str(e)}")
            return None, None
    
    async def _check_rate_limit(self):
        """Check and enforce rate limiting for GitHub API calls."""
        import time
        current_time = time.time()
        
        # Enforce minimum delay between API calls
        time_since_last_call = current_time - self._last_api_call
        if time_since_last_call < self.RATE_LIMIT_DELAY:
            delay = self.RATE_LIMIT_DELAY - time_since_last_call
            logger.debug(f"Rate limiting: waiting {delay:.2f}s before next API call")
            await asyncio.sleep(delay)
        
        self._last_api_call = time.time()
    
    async def _get_recent_commits_hybrid(self, repository_id: str, repo_owner: str, repo_name: str, limit: int, github_service: GitHubCommitService) -> List[Dict[str, Any]]:
        """Get recent commits using hybrid approach: database + GitHub API."""
        commits = []
        
        try:
            # First, try to get recent commits from database (fast)
            db_commits = await database_service.get_recent_commits(repository_id, limit=min(limit, 10))
            if db_commits:
                commits.extend(db_commits)
                logger.info(f"Found {len(db_commits)} recent commits in database")
                
                # If we have enough from database, return early
                if len(commits) >= limit:
                    return commits[:limit]
              # Supplement with GitHub API if needed
            remaining_limit = limit - len(commits)
            if remaining_limit > 0:
                logger.info(f"Fetching {remaining_limit} additional commits from GitHub API")
                github_commits = await github_service.get_recent_commits(
                    repo_owner, repo_name, limit=remaining_limit
                )
                
                # Merge commits, avoiding duplicates by SHA
                existing_shas = {commit.get('sha') for commit in commits if commit.get('sha')}
                for commit in github_commits:
                    if commit.get('sha') not in existing_shas:
                        commits.append(commit)
                
                logger.info(f"Added {len(github_commits)} commits from GitHub API")
            
            return commits[:limit]
            
        except Exception as e:
            logger.error(f"Error in hybrid commit retrieval: {str(e)}")            # Fallback to GitHub API only
            github_service = await self._get_github_service(None)  # No user_id in fallback
            return await github_service.get_recent_commits(repo_owner, repo_name, limit=limit)
    
    async def _get_github_service(self, user_id: str) -> GitHubCommitService:
        """Get a GitHub service instance with the user's token."""
        try:
            # Get user's GitHub token from database
            user_info = await database_service.get_user_info(user_id)
            user_github_token = user_info.get('github_token') if user_info else None
            
            if not user_github_token:
                logger.warning(f"No GitHub token found for user {user_id}, using unauthenticated requests")
            
            return GitHubCommitService(user_github_token=user_github_token)
            
        except Exception as e:
            logger.error(f"Failed to get user GitHub token for {user_id}: {str(e)}")
            logger.warning("Falling back to unauthenticated GitHub service")
            return GitHubCommitService()

# Global instance
commit_analysis_service = CommitAnalysisService()
