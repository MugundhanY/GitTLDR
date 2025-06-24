"""
GitHub Commit Service for real-time commit fetching.
Fetches commits directly from GitHub API instead of relying on limited database storage.
"""
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from urllib.parse import quote
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class GitHubCommitService:
    """Service for fetching commits directly from GitHub API."""
      # Scalability settings
    MAX_COMMITS_PER_QUERY = 50  # Maximum commits to fetch in one query
    RATE_LIMIT_DELAY = 0.5      # Delay between API calls to avoid rate limits
    CACHE_TTL = 1800            # 30 minutes cache for commit data
    
    def __init__(self, user_github_token: str = None):
        """Initialize GitHub commit service with user's GitHub token."""
        self.settings = get_settings()
        self.user_github_token = user_github_token  # User's personal GitHub token
        self.base_url = "https://api.github.com"
        self.session = None
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with GitHub token."""
        if self.session is None or self.session.closed:
            headers = {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "GitTLDR-CommitAnalyzer/1.0"
            }
              # Add authorization header only if user's GitHub token is available
            if self.user_github_token:
                headers["Authorization"] = f"token {self.user_github_token}"
                logger.info("Using user's GitHub token for authenticated API requests")
            else:
                logger.warning("No user GitHub token provided - using unauthenticated requests (rate limited)")
                logger.warning("This may result in limited access to private repositories and lower rate limits")
                
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self.session
    
    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def get_repository_info(self, repo_owner: str, repo_name: str) -> Optional[Dict[str, Any]]:
        """Get basic repository information from GitHub."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    logger.warning(f"Repository {repo_owner}/{repo_name} not found")
                    return None
                else:
                    logger.error(f"GitHub API error {response.status} for repo info")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get repository info: {str(e)}")
            return None
    
    async def get_recent_commits(
        self, 
        repo_owner: str, 
        repo_name: str, 
        limit: int = 50,
        branch: str = None
    ) -> List[Dict[str, Any]]:
        """Get recent commits from GitHub API."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits"
            
            params = {
                "per_page": min(limit, 100),  # GitHub API limit is 100 per page
                "page": 1
            }
            
            if branch:
                params["sha"] = branch
                
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    commits = await response.json()
                    return self._format_commits(commits)
                elif response.status == 404:
                    logger.warning(f"Repository {repo_owner}/{repo_name} not found")
                    return []
                else:
                    logger.error(f"GitHub API error {response.status} for recent commits")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get recent commits: {str(e)}")
            return []
    
    async def get_commits_by_date_range(
        self,
        repo_owner: str,
        repo_name: str,
        start_date: str,
        end_date: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get commits within a date range."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits"
            
            params = {
                "since": start_date,
                "per_page": min(limit, 100),
                "page": 1
            }
            
            if end_date:
                params["until"] = end_date
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    commits = await response.json()
                    return self._format_commits(commits)
                else:
                    logger.error(f"GitHub API error {response.status} for date range commits")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get commits by date range: {str(e)}")
            return []
    
    async def get_commits_by_author(
        self,
        repo_owner: str,
        repo_name: str,
        author: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get commits by a specific author."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits"
            
            params = {
                "author": author,
                "per_page": min(limit, 100),
                "page": 1
            }
                
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    commits = await response.json()
                    return self._format_commits(commits)
                else:
                    logger.error(f"GitHub API error {response.status} for author commits")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get commits by author: {str(e)}")
            return []
    
    async def get_commit_by_sha(
        self,
        repo_owner: str,
        repo_name: str,
        sha: str,
        include_files: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get a specific commit by SHA with optional file details."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits/{sha}"
                
            async with session.get(url) as response:
                if response.status == 200:
                    commit = await response.json()
                    formatted_commit = self._format_commit(commit)
                    
                    # If files are not included and we want them, try to get them
                    if include_files and formatted_commit and not formatted_commit.get("files_changed"):
                        try:
                            # For initial commits, try to get file tree information
                            tree_files = await self._get_commit_tree_files(repo_owner, repo_name, sha)
                            if tree_files:
                                formatted_commit["files_changed"] = tree_files
                                logger.info(f"Enhanced commit {sha} with {len(tree_files)} files from tree API")
                        except Exception as e:
                            logger.warning(f"Could not enhance commit {sha} with tree files: {str(e)}")
                    
                    return formatted_commit
                elif response.status == 404:
                    logger.warning(f"Commit {sha} not found")
                    return None
                else:
                    logger.error(f"GitHub API error {response.status} for commit {sha}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get commit by SHA: {str(e)}")
            return None

    async def _get_commit_tree_files(
        self,
        repo_owner: str,
        repo_name: str,
        sha: str
    ) -> List[Dict[str, Any]]:
        """Get files from commit tree (useful for initial commits)."""
        try:
            session = await self._get_session()
            
            # First get the commit to find the tree SHA
            commit_url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits/{sha}"
            async with session.get(commit_url) as response:
                if response.status != 200:
                    return []
                commit_data = await response.json()
                tree_sha = commit_data.get("commit", {}).get("tree", {}).get("sha")
                
            if not tree_sha:
                return []
                
            # Get the tree with recursive files
            tree_url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/git/trees/{tree_sha}"
            params = {"recursive": "1"}
            
            async with session.get(tree_url, params=params) as response:
                if response.status == 200:
                    tree_data = await response.json()
                    files = []
                    
                    for item in tree_data.get("tree", []):
                        if item.get("type") == "blob":  # Only files, not directories
                            files.append({
                                "filename": item.get("path"),
                                "status": "added",  # For initial commit, all files are added
                                "additions": 0,     # We don't have line count data from tree API
                                "deletions": 0,
                                "changes": 0
                            })
                    
                    return files
                else:
                    logger.warning(f"Could not fetch tree for commit {sha}")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get commit tree files: {str(e)}")
            return []
    
    async def get_commits_affecting_file(
        self,
        repo_owner: str,
        repo_name: str,
        file_path: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get commits that affected a specific file."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits"
            
            params = {
                "path": file_path,
                "per_page": min(limit, 100),
                "page": 1
            }
                
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    commits = await response.json()
                    return self._format_commits(commits)
                else:
                    logger.error(f"GitHub API error {response.status} for file commits")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to get commits affecting file: {str(e)}")
            return []
    
    async def search_commits_by_message(
        self,
        repo_owner: str,
        repo_name: str,
        query: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search commits by message content using GitHub Search API."""
        try:
            session = await self._get_session()
            
            # Use GitHub Search API for commit messages
            search_query = f'repo:{repo_owner}/{repo_name} {query}'
            url = f"{self.base_url}/search/commits"
            
            params = {
                "q": search_query,
                "per_page": min(limit, 100),
                "page": 1
            }
            
            # Search API requires different Accept header
            headers = {
                "Accept": "application/vnd.github.cloak-preview"
            }
                
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    commits = result.get("items", [])
                    return self._format_commits(commits)
                else:
                    logger.error(f"GitHub Search API error {response.status} for commit search")
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to search commits by message: {str(e)}")
            return []
    
    def _format_commits(self, commits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format GitHub API commit data for consistent usage."""
        formatted_commits = []
        
        for commit in commits:
            formatted_commit = self._format_commit(commit)
            if formatted_commit:
                formatted_commits.append(formatted_commit)
                
        return formatted_commits
    
    def _format_commit(self, commit: Dict[str, Any]) -> Dict[str, Any]:
        """Format a single commit from GitHub API."""
        try:
            commit_data = commit.get("commit", {})
            author_data = commit_data.get("author", {})
            committer_data = commit_data.get("committer", {})
            
            # Extract file changes if available
            files_changed = []
            if "files" in commit:
                for file_info in commit["files"]:
                    files_changed.append({
                        "filename": file_info.get("filename"),
                        "status": file_info.get("status"),
                        "additions": file_info.get("additions", 0),
                        "deletions": file_info.get("deletions", 0),
                        "changes": file_info.get("changes", 0)
                    })
            
            return {
                "sha": commit.get("sha"),
                "message": commit_data.get("message", ""),
                "author": {
                    "name": author_data.get("name"),
                    "email": author_data.get("email"),
                    "date": author_data.get("date")
                },
                "committer": {
                    "name": committer_data.get("name"),
                    "email": committer_data.get("email"),
                    "date": committer_data.get("date")
                },
                "url": commit.get("html_url"),
                "api_url": commit.get("url"),
                "files_changed": files_changed,
                "stats": commit.get("stats", {}),
                "timestamp": author_data.get("date"),
                "created_at": author_data.get("date")
            }
            
        except Exception as e:
            logger.error(f"Failed to format commit: {str(e)}")
            return None
    
    def parse_repository_from_url(self, repository_url: str) -> tuple[str, str]:
        """Parse repository owner and name from GitHub URL."""
        try:
            # Handle different GitHub URL formats
            if "github.com" in repository_url:
                # Extract from URL like https://github.com/owner/repo
                parts = repository_url.replace("https://", "").replace("http://", "").replace(".git", "").split("/")
                if len(parts) >= 3 and parts[0] == "github.com":
                    return parts[1], parts[2]
              # Handle direct owner/repo format
            if "/" in repository_url and len(repository_url.split("/")) == 2:
                return repository_url.split("/")
            
            logger.error(f"Could not parse repository URL: {repository_url}")
            return None, None
            
        except Exception as e:
            logger.error(f"Failed to parse repository URL: {str(e)}")
            return None, None

    async def get_earliest_commits(
        self, 
        repo_owner: str, 
        repo_name: str, 
        limit: int = 50,
        branch: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get earliest commits from GitHub API.
        
        Note: This method attempts to find the earliest commits by fetching 
        a larger set and reversing them. For very large repositories, this
        may not get the truly first commits, but will get early ones.
        """
        try:
            session = await self._get_session()
            url = f"{self.base_url}/repos/{repo_owner}/{repo_name}/commits"
            
            # To get earliest commits, we'll fetch a larger set and reverse
            # This is not perfect for very large repos, but works well for most cases
            fetch_limit = min(500, limit * 10)  # Fetch more to find earlier commits
            
            all_commits = []
            page = 1
            per_page = 100  # GitHub's max per page
            
            while len(all_commits) < fetch_limit:
                params = {
                    "per_page": per_page,
                    "page": page
                }
                
                if branch:
                    params["sha"] = branch
                    
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        page_commits = await response.json()
                        if not page_commits:  # No more commits
                            break
                        all_commits.extend(page_commits)
                        page += 1
                        
                        # If we got fewer than requested, we've reached the end
                        if len(page_commits) < per_page:
                            break
                    elif response.status == 404:
                        logger.warning(f"Repository {repo_owner}/{repo_name} not found")
                        return []
                    else:
                        logger.error(f"GitHub API error {response.status} for earliest commits")
                        break
            
            # Reverse to get earliest first, then take the requested limit
            all_commits.reverse()
            earliest_commits = all_commits[:limit]
            
            logger.info(f"Retrieved {len(earliest_commits)} earliest commits from {repo_owner}/{repo_name}")
            return self._format_commits(earliest_commits)
                    
        except Exception as e:
            logger.error(f"Failed to get earliest commits: {str(e)}")
            return []

    async def _make_github_request(
        self,
        endpoint: str,
        params: Dict[str, Any] = None,
        method: str = "GET"
    ) -> Optional[Dict[str, Any]]:
        """Make a generic GitHub API request."""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/{endpoint}"
            
            if method.upper() == "GET":
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 404:
                        logger.warning(f"GitHub API endpoint not found: {endpoint}")
                        return None
                    else:
                        logger.error(f"GitHub API error {response.status} for {endpoint}")
                        return None
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None                
        except Exception as e:
            logger.error(f"Failed to make GitHub API request to {endpoint}: {str(e)}")
            return None

github_commit_service = GitHubCommitService()
