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
        self.description = """Get commits from a repository, optionally filtered by author name or email.
        Returns commit SHA, message, author info, date, files changed, statistics, and actual code diffs.
        If no author is specified, returns the most recent commits from all contributors.
        
        IMPORTANT: For result sets of 10 or fewer commits, this automatically fetches detailed
        file changes including the actual patch/diff content for each changed file. You can see
        exactly what code was added, removed, or modified. For larger result sets, only basic 
        commit info is returned - use get_commit_details to fetch diffs for specific commits.
        
        The patch content shows the actual code changes in unified diff format, making it easy
        to explain what was changed in plain English.
        
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
                description="Author name or email to filter commits. Can be GitHub username or git commit author name. If not specified, returns all recent commits.",
                required=False
            ),
            ToolParameter(
                name="limit",
                type="INTEGER",
                description="Maximum number of commits to return (default: 10, max: 100). Note: ≤10 commits include detailed file changes.",
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
    
    def _truncate_patch(self, patch: str, max_lines: int = 30) -> str:
        """
        Truncate patch to reasonable size for AI consumption.
        
        Args:
            patch: Diff patch string
            max_lines: Maximum lines to include
            
        Returns:
            Truncated patch with indicator if truncated
        """
        if not patch:
            return ""
        
        lines = patch.split('\n')
        if len(lines) <= max_lines:
            return patch
        
        # Include first max_lines and add truncation indicator
        truncated = '\n'.join(lines[:max_lines])
        remaining = len(lines) - max_lines
        return f"{truncated}\n... ({remaining} more lines, see full commit for details)"
    
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
            author = kwargs.get('author')  # Optional - can be None
            limit = min(kwargs.get('limit', 10), 100)  # Default 10, cap at 100
            since = kwargs.get('since')
            until = kwargs.get('until')
            
            if author:
                logger.info(f"Fetching commits for {repo_owner}/{repo_name} by {author}")
            else:
                logger.info(f"Fetching recent commits for {repo_owner}/{repo_name} (all authors)")
            
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
                message = f"No commits found by author '{author}'" if author else "No commits found"
                return ToolResponse(
                    success=True,
                    data=[],
                    metadata={
                        "message": message,
                        "author": author,
                        "repo": f"{repo_owner}/{repo_name}"
                    }
                )
            
            # For small result sets (≤10), fetch detailed info for each commit
            # This includes file changes which the list endpoint doesn't provide
            fetch_details = len(commits) <= 10
            if fetch_details:
                logger.info(f"Fetching detailed file changes for {len(commits)} commits")
                detailed_commits = []
                for commit in commits:
                    try:
                        detailed = await self.github_client.get_commit(
                            owner=repo_owner,
                            repo=repo_name,
                            sha=commit['sha']
                        )
                        detailed_commits.append(detailed)
                    except Exception as e:
                        logger.warning(f"Failed to fetch details for {commit['sha']}: {e}")
                        detailed_commits.append(commit)  # Use basic info as fallback
                commits = detailed_commits
            
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
                            "deletions": f.get('deletions', 0),
                            "patch": self._truncate_patch(f.get('patch', ''))  # Include actual diff
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
                "author": author if author else "all contributors",
                "repository": f"{repo_owner}/{repo_name}",
                "includes_file_changes": fetch_details,  # Important: tells if file changes are included
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
            
            author_info = f"by {author}" if author else "(all contributors)"
            details_info = "with file changes" if fetch_details else "without file details"
            logger.info(f"Found {len(formatted_commits)} commits {author_info} {details_info}", extra={
                "tool": self.name,
                "author": author,
                "commit_count": len(formatted_commits),
                "total_changes": total_additions + total_deletions,
                "includes_files": fetch_details
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
