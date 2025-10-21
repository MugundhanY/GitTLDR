"""
Commit analysis tool for GitHub integration.
Allows Gemini to fetch and analyze commit history.
"""

from typing import Optional
from ..base_tool import BaseTool, ToolParameter, ToolResponse
from ...github_api_client import GitHubClient
from utils.logger import get_logger

logger = get_logger(__name__)


class CommitTool(BaseTool):
    """
    Tool for analyzing GitHub commits.
    
    Capabilities:
    - Get commits by author
    - Filter by date range
    - Retrieve commit details and file changes
    - Analyze commit patterns
    """
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_commits_by_author"
        self.description = """Get commits from a repository filtered by author name or email.
        Returns commit SHA, message, author info, date, files changed, and statistics.
        Useful for analyzing contribution history and understanding what changes were made."""
        
        self.parameters = [
            ToolParameter(
                name="repo_owner",
                type="STRING",
                description="Repository owner (username or organization name)",
                required=True
            ),
            ToolParameter(
                name="repo_name",
                type="STRING",
                description="Repository name",
                required=True
            ),
            ToolParameter(
                name="author",
                type="STRING",
                description="Author name or email to filter commits. Can be GitHub username or git commit author name.",
                required=True
            ),
            ToolParameter(
                name="limit",
                type="INTEGER",
                description="Maximum number of commits to return (default: 50, max: 100)",
                required=False
            ),
            ToolParameter(
                name="since",
                type="STRING",
                description="Only commits after this date (ISO 8601 format, e.g., '2024-01-01T00:00:00Z')",
                required=False
            ),
            ToolParameter(
                name="until",
                type="STRING",
                description="Only commits before this date (ISO 8601 format)",
                required=False
            )
        ]
        
        self.cache_ttl = 900  # 15 minutes cache for commits
    
    async def execute(self, **kwargs) -> ToolResponse:
        """
        Execute commit search and analysis.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            author: Author name or email
            limit: Max commits to return (default 50)
            since: Start date filter
            until: End date filter
            
        Returns:
            ToolResponse with formatted commit data
        """
        try:
            # Validate parameters
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(
                    success=False,
                    data=None,
                    error=error_msg
                )
            
            # Extract parameters
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            author = kwargs['author']
            limit = min(kwargs.get('limit', 50), 100)  # Cap at 100
            since = kwargs.get('since')
            until = kwargs.get('until')
            
            logger.info(f"Fetching commits for {repo_owner}/{repo_name} by {author}")
            
            # Fetch commits from GitHub
            commits = await self.github_client.get_commits(
                owner=repo_owner,
                repo=repo_name,
                author=author,
                per_page=limit,
                since=since,
                until=until
            )
            
            if not commits:
                return ToolResponse(
                    success=True,
                    data=[],
                    metadata={
                        "message": f"No commits found by author '{author}'",
                        "author": author,
                        "repo": f"{repo_owner}/{repo_name}"
                    }
                )
            
            # Format commits for AI consumption
            formatted_commits = []
            total_additions = 0
            total_deletions = 0
            total_files = 0
            
            for commit in commits:
                commit_data = commit.get('commit', {})
                author_data = commit_data.get('author', {})
                
                # Get file statistics
                files = commit.get('files', [])
                additions = sum(f.get('additions', 0) for f in files)
                deletions = sum(f.get('deletions', 0) for f in files)
                
                total_additions += additions
                total_deletions += deletions
                total_files += len(files)
                
                formatted_commit = {
                    "sha": commit['sha'][:7],  # Short SHA
                    "full_sha": commit['sha'],
                    "message": commit_data.get('message', ''),
                    "author": {
                        "name": author_data.get('name', ''),
                        "email": author_data.get('email', ''),
                        "date": author_data.get('date', '')
                    },
                    "url": commit.get('html_url', ''),
                    "stats": {
                        "files_changed": len(files),
                        "additions": additions,
                        "deletions": deletions,
                        "total_changes": additions + deletions
                    }
                }
                
                # Add top changed files (limit to 5 per commit)
                if files:
                    formatted_commit["top_files"] = [
                        {
                            "filename": f['filename'],
                            "status": f['status'],
                            "additions": f.get('additions', 0),
                            "deletions": f.get('deletions', 0)
                        }
                        for f in sorted(
                            files, 
                            key=lambda x: x.get('additions', 0) + x.get('deletions', 0),
                            reverse=True
                        )[:5]
                    ]
                
                formatted_commits.append(formatted_commit)
            
            # Calculate statistics
            metadata = {
                "total_commits": len(formatted_commits),
                "author": author,
                "repository": f"{repo_owner}/{repo_name}",
                "summary": {
                    "total_additions": total_additions,
                    "total_deletions": total_deletions,
                    "total_files_changed": total_files,
                    "average_changes_per_commit": round((total_additions + total_deletions) / len(formatted_commits), 2) if formatted_commits else 0
                },
                "date_range": {
                    "since": since,
                    "until": until
                }
            }
            
            logger.info(f"Found {len(formatted_commits)} commits by {author}", extra={
                "tool": self.name,
                "author": author,
                "commit_count": len(formatted_commits),
                "total_changes": total_additions + total_deletions
            })
            
            return ToolResponse(
                success=True,
                data=formatted_commits,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"CommitTool execution error: {str(e)}", exc_info=True)
            return ToolResponse(
                success=False,
                data=None,
                error=f"Failed to fetch commits: {str(e)}"
            )


class CommitDetailsTool(BaseTool):
    """
    Tool for getting detailed information about a specific commit.
    """
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_commit_details"
        self.description = """Get detailed information about a specific commit including full diff.
        Returns commit message, author, date, all changed files with patches, and statistics."""
        
        self.parameters = [
            ToolParameter(
                name="repo_owner",
                type="STRING",
                description="Repository owner",
                required=True
            ),
            ToolParameter(
                name="repo_name",
                type="STRING",
                description="Repository name",
                required=True
            ),
            ToolParameter(
                name="commit_sha",
                type="STRING",
                description="Commit SHA (can be short or full SHA)",
                required=True
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get detailed commit information."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            commit_sha = kwargs['commit_sha']
            
            logger.info(f"Fetching commit details: {commit_sha}")
            
            # Fetch commit details
            commit = await self.github_client.get_commit(
                owner=repo_owner,
                repo=repo_name,
                sha=commit_sha
            )
            
            commit_data = commit.get('commit', {})
            files = commit.get('files', [])
            
            # Format response
            result = {
                "commit": {
                    "sha": commit['sha'],
                    "short_sha": commit['sha'][:7],
                    "message": commit_data.get('message', ''),
                    "author": {
                        "name": commit_data.get('author', {}).get('name', ''),
                        "email": commit_data.get('author', {}).get('email', ''),
                        "date": commit_data.get('author', {}).get('date', '')
                    },
                    "committer": {
                        "name": commit_data.get('committer', {}).get('name', ''),
                        "email": commit_data.get('committer', {}).get('email', ''),
                        "date": commit_data.get('committer', {}).get('date', '')
                    },
                    "url": commit.get('html_url', ''),
                    "comment_count": commit.get('commit', {}).get('comment_count', 0)
                },
                "stats": {
                    "total_additions": sum(f.get('additions', 0) for f in files),
                    "total_deletions": sum(f.get('deletions', 0) for f in files),
                    "total_changes": sum(f.get('changes', 0) for f in files),
                    "files_changed": len(files)
                },
                "files": [
                    {
                        "filename": f['filename'],
                        "status": f['status'],
                        "additions": f.get('additions', 0),
                        "deletions": f.get('deletions', 0),
                        "changes": f.get('changes', 0),
                        "patch": f.get('patch', '')[:1000]  # Limit patch size
                    }
                    for f in files
                ]
            }
            
            return ToolResponse(
                success=True,
                data=result,
                metadata={
                    "commit_sha": commit['sha'],
                    "files_changed": len(files)
                }
            )
            
        except Exception as e:
            logger.error(f"CommitDetailsTool error: {str(e)}", exc_info=True)
            return ToolResponse(
                success=False,
                data=None,
                error=f"Failed to fetch commit details: {str(e)}"
            )
