"""
Enhanced GitHub API client with user token support.
Implements rate limiting, retry logic, caching, and comprehensive error handling.
"""

import aiohttp
import asyncio
import hashlib
import json
import time
from typing import Dict, List, Optional, Any
from utils.logger import get_logger

logger = get_logger(__name__)


class GitHubClient:
    """
    Production-ready GitHub API client.
    
    Features:
    - User token authentication
    - Rate limit handling
    - Automatic retries with exponential backoff
    - Response caching
    - Comprehensive error handling
    """
    
    def __init__(self, user_token: Optional[str] = None):
        """
        Initialize GitHub client.
        
        Args:
            user_token: Optional GitHub access token for authenticated requests
        """
        self.user_token = user_token
        self.base_url = "https://api.github.com"
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.cache_ttl = 1800  # 30 minutes default
        self.max_retries = 3
        self.timeout = 30  # seconds
        
    async def _get_headers(self) -> Dict[str, str]:
        """
        Get request headers with authentication.
        
        Returns:
            Headers dict
        """
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitTLDR/2.0"
        }
        
        if self.user_token:
            headers["Authorization"] = f"token {self.user_token}"
        
        return headers
    
    def _get_cache_key(self, method: str, endpoint: str, params: Optional[Dict] = None) -> str:
        """
        Generate cache key for request.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            
        Returns:
            Cache key string
        """
        params_str = json.dumps(params or {}, sort_keys=True)
        key_str = f"{method}:{endpoint}:{params_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _get_cached_response(self, cache_key: str) -> Optional[Any]:
        """
        Get cached response if valid.
        
        Args:
            cache_key: Cache key
            
        Returns:
            Cached data or None
        """
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                logger.debug(f"Cache hit for {cache_key}")
                return data
            else:
                # Expired cache entry
                del self.cache[cache_key]
        
        return None
    
    def _cache_response(self, cache_key: str, data: Any) -> None:
        """
        Cache response data.
        
        Args:
            cache_key: Cache key
            data: Response data to cache
        """
        self.cache[cache_key] = (data, time.time())
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        use_cache: bool = True
    ) -> Any:
        """
        Make GitHub API request with retry and caching.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            params: Query parameters
            use_cache: Whether to use caching
            
        Returns:
            Response data
            
        Raises:
            Exception: On request failure after retries
        """
        cache_key = self._get_cache_key(method, endpoint, params)
        
        # Check cache
        if use_cache and method == "GET":
            cached = self._get_cached_response(cache_key)
            if cached is not None:
                return cached
        
        url = f"{self.base_url}/{endpoint}"
        headers = await self._get_headers()
        
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                timeout = aiohttp.ClientTimeout(total=self.timeout)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.request(
                        method,
                        url,
                        headers=headers,
                        params=params
                    ) as response:
                        # Success
                        if response.status == 200:
                            data = await response.json()
                            
                            # Cache successful GET requests
                            if method == "GET" and use_cache:
                                self._cache_response(cache_key, data)
                            
                            logger.debug(f"GitHub API request successful: {endpoint}")
                            return data
                        
                        # Rate limit exceeded
                        elif response.status == 403:
                            rate_limit_remaining = response.headers.get('X-RateLimit-Remaining')
                            rate_limit_reset = response.headers.get('X-RateLimit-Reset')
                            
                            logger.warning(f"GitHub rate limit hit. Remaining: {rate_limit_remaining}, Reset: {rate_limit_reset}")
                            
                            # Wait and retry
                            if attempt < self.max_retries - 1:
                                await asyncio.sleep(min(60, 2 ** attempt))
                                continue
                            else:
                                raise Exception(f"GitHub rate limit exceeded. Reset at: {rate_limit_reset}")
                        
                        # Not found
                        elif response.status == 404:
                            error_text = await response.text()
                            raise Exception(f"Resource not found: {endpoint} - {error_text}")
                        
                        # Unauthorized
                        elif response.status == 401:
                            raise Exception("GitHub authentication failed. Invalid or expired token.")
                        
                        # Other errors
                        else:
                            error_text = await response.text()
                            raise Exception(f"GitHub API error {response.status}: {error_text}")
                
            except asyncio.TimeoutError:
                last_exception = Exception(f"Request timeout after {self.timeout}s")
                logger.warning(f"GitHub API timeout on attempt {attempt + 1}/{self.max_retries}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
            
            except Exception as e:
                last_exception = e
                logger.error(f"GitHub API request error on attempt {attempt + 1}/{self.max_retries}: {str(e)}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                else:
                    break
        
        # All retries failed
        error_msg = f"GitHub API request failed after {self.max_retries} attempts: {str(last_exception)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    async def get_commits(
        self,
        owner: str,
        repo: str,
        author: Optional[str] = None,
        sha: Optional[str] = None,
        path: Optional[str] = None,
        since: Optional[str] = None,
        until: Optional[str] = None,
        per_page: int = 30
    ) -> List[Dict]:
        """
        Get commits from a repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            author: Filter by author (username or email)
            sha: SHA or branch to start listing commits from
            path: Only commits containing this file path
            since: ISO 8601 date string
            until: ISO 8601 date string
            per_page: Results per page (max 100)
            
        Returns:
            List of commit dicts
        """
        params = {"per_page": min(per_page, 100)}
        
        if author:
            params["author"] = author
        if sha:
            params["sha"] = sha
        if path:
            params["path"] = path
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        
        return await self._make_request("GET", f"repos/{owner}/{repo}/commits", params=params)
    
    async def get_commit(self, owner: str, repo: str, sha: str) -> Dict:
        """
        Get detailed commit information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            sha: Commit SHA
            
        Returns:
            Commit dict with files and diff
        """
        return await self._make_request("GET", f"repos/{owner}/{repo}/commits/{sha}")
    
    async def get_pull_requests(
        self,
        owner: str,
        repo: str,
        state: str = "open",
        head: Optional[str] = None,
        base: Optional[str] = None,
        sort: str = "created",
        direction: str = "desc",
        per_page: int = 30
    ) -> List[Dict]:
        """
        Get pull requests from repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            state: PR state (open, closed, all)
            head: Filter by head user or branch
            base: Filter by base branch
            sort: Sort by (created, updated, popularity, long-running)
            direction: Sort direction (asc, desc)
            per_page: Results per page
            
        Returns:
            List of PR dicts
        """
        params = {
            "state": state,
            "sort": sort,
            "direction": direction,
            "per_page": min(per_page, 100)
        }
        
        if head:
            params["head"] = head
        if base:
            params["base"] = base
        
        return await self._make_request("GET", f"repos/{owner}/{repo}/pulls", params=params)
    
    async def get_pull_request(self, owner: str, repo: str, pull_number: int) -> Dict:
        """
        Get detailed pull request information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            pull_number: PR number
            
        Returns:
            PR dict with details
        """
        return await self._make_request("GET", f"repos/{owner}/{repo}/pulls/{pull_number}")
    
    async def get_issues(
        self,
        owner: str,
        repo: str,
        state: str = "open",
        labels: Optional[str] = None,
        assignee: Optional[str] = None,
        creator: Optional[str] = None,
        mentioned: Optional[str] = None,
        sort: str = "created",
        direction: str = "desc",
        since: Optional[str] = None,
        per_page: int = 30
    ) -> List[Dict]:
        """
        Get issues from repository.
        
        Args:
            owner: Repository owner
            repo: Repository name
            state: Issue state (open, closed, all)
            labels: Comma-separated label names
            assignee: Filter by assignee
            creator: Filter by creator
            mentioned: Filter by mentioned user
            sort: Sort by (created, updated, comments)
            direction: Sort direction
            since: ISO 8601 date string
            per_page: Results per page
            
        Returns:
            List of issue dicts
        """
        params = {
            "state": state,
            "sort": sort,
            "direction": direction,
            "per_page": min(per_page, 100)
        }
        
        if labels:
            params["labels"] = labels
        if assignee:
            params["assignee"] = assignee
        if creator:
            params["creator"] = creator
        if mentioned:
            params["mentioned"] = mentioned
        if since:
            params["since"] = since
        
        return await self._make_request("GET", f"repos/{owner}/{repo}/issues", params=params)
    
    async def get_issue(self, owner: str, repo: str, issue_number: int) -> Dict:
        """
        Get detailed issue information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            issue_number: Issue number
            
        Returns:
            Issue dict
        """
        return await self._make_request("GET", f"repos/{owner}/{repo}/issues/{issue_number}")
    
    async def search_code(
        self,
        query: str,
        owner: str,
        repo: str,
        per_page: int = 30
    ) -> Dict:
        """
        Search code in repository.
        
        Args:
            query: Search query
            owner: Repository owner
            repo: Repository name
            per_page: Results per page
            
        Returns:
            Search results dict
        """
        full_query = f"{query} repo:{owner}/{repo}"
        params = {"q": full_query, "per_page": min(per_page, 100)}
        
        return await self._make_request("GET", "search/code", params=params)
    
    async def get_repository(self, owner: str, repo: str) -> Dict:
        """
        Get repository information.
        
        Args:
            owner: Repository owner
            repo: Repository name
            
        Returns:
            Repository dict
        """
        return await self._make_request("GET", f"repos/{owner}/{repo}")
    
    async def get_branches(self, owner: str, repo: str, per_page: int = 30) -> List[Dict]:
        """
        Get repository branches.
        
        Args:
            owner: Repository owner
            repo: Repository name
            per_page: Results per page
            
        Returns:
            List of branch dicts
        """
        params = {"per_page": min(per_page, 100)}
        return await self._make_request("GET", f"repos/{owner}/{repo}/branches", params=params)
    
    def clear_cache(self) -> None:
        """Clear the response cache."""
        self.cache.clear()
        logger.info("GitHub client cache cleared")
