"""
Pull Request analysis tool for GitHub integration.
"""

from ..base_tool import BaseTool, ToolParameter, ToolResponse
from ...github_api_client import GitHubClient
from utils.logger import get_logger

logger = get_logger(__name__)


class PullRequestTool(BaseTool):
    """Tool for analyzing pull requests."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_pull_requests"
        self.description = """Get pull requests from a repository with filters.
        Returns PR number, title, state, author, dates, merge status, and statistics.
        Useful for reviewing code changes, tracking contributions, and understanding project workflow."""
        
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
                name="state",
                type="STRING",
                description="Pull request state: open, closed, or all",
                required=False,
                enum=["open", "closed", "all"]
            ),
            ToolParameter(
                name="author",
                type="STRING",
                description="Filter by PR author username",
                required=False
            ),
            ToolParameter(
                name="limit",
                type="INTEGER",
                description="Maximum number of PRs to return (default: 30)",
                required=False
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get pull requests with optional filters."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            state = kwargs.get('state', 'all')
            author_filter = kwargs.get('author')
            limit = min(kwargs.get('limit', 30), 100)
            
            logger.info(f"Fetching PRs for {repo_owner}/{repo_name}")
            
            # Fetch PRs
            prs = await self.github_client.get_pull_requests(
                owner=repo_owner,
                repo=repo_name,
                state=state,
                per_page=limit
            )
            
            # Filter by author if specified
            if author_filter:
                author_lower = author_filter.lower()
                prs = [pr for pr in prs if pr.get('user', {}).get('login', '').lower() == author_lower]
            
            if not prs:
                return ToolResponse(
                    success=True,
                    data=[],
                    metadata={
                        "message": f"No PRs found matching filters",
                        "filters": {"state": state, "author": author_filter}
                    }
                )
            
            # Format PRs
            formatted_prs = [
                {
                    "number": pr['number'],
                    "title": pr['title'],
                    "state": pr['state'],
                    "author": pr.get('user', {}).get('login', 'unknown'),
                    "created_at": pr['created_at'],
                    "updated_at": pr['updated_at'],
                    "closed_at": pr.get('closed_at'),
                    "merged_at": pr.get('merged_at'),
                    "merged": pr.get('merged', False),
                    "mergeable": pr.get('mergeable'),
                    "draft": pr.get('draft', False),
                    "comments": pr.get('comments', 0),
                    "review_comments": pr.get('review_comments', 0),
                    "commits": pr.get('commits', 0),
                    "additions": pr.get('additions', 0),
                    "deletions": pr.get('deletions', 0),
                    "changed_files": pr.get('changed_files', 0),
                    "labels": [label['name'] for label in pr.get('labels', [])],
                    "url": pr['html_url'],
                    "head_branch": pr.get('head', {}).get('ref', ''),
                    "base_branch": pr.get('base', {}).get('ref', '')
                }
                for pr in prs
            ]
            
            # Calculate statistics
            total_additions = sum(pr['additions'] for pr in formatted_prs)
            total_deletions = sum(pr['deletions'] for pr in formatted_prs)
            merged_count = sum(1 for pr in formatted_prs if pr['merged'])
            
            return ToolResponse(
                success=True,
                data=formatted_prs,
                metadata={
                    "total_prs": len(formatted_prs),
                    "repository": f"{repo_owner}/{repo_name}",
                    "state": state,
                    "statistics": {
                        "merged": merged_count,
                        "open": sum(1 for pr in formatted_prs if pr['state'] == 'open'),
                        "closed": sum(1 for pr in formatted_prs if pr['state'] == 'closed' and not pr['merged']),
                        "total_additions": total_additions,
                        "total_deletions": total_deletions
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"PullRequestTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to fetch PRs: {str(e)}")


class PullRequestDetailsTool(BaseTool):
    """Tool for getting detailed PR information."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_pull_request_details"
        self.description = """Get detailed information about a specific pull request.
        Returns comprehensive PR data including reviews, commits, and file changes."""
        
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
                name="pr_number",
                type="INTEGER",
                description="Pull request number",
                required=True
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get detailed PR information."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            pr_number = kwargs['pr_number']
            
            # Fetch PR details
            pr = await self.github_client.get_pull_request(
                owner=repo_owner,
                repo=repo_name,
                pull_number=pr_number
            )
            
            result = {
                "pr": {
                    "number": pr['number'],
                    "title": pr['title'],
                    "body": pr.get('body', ''),
                    "state": pr['state'],
                    "author": pr.get('user', {}).get('login', 'unknown'),
                    "created_at": pr['created_at'],
                    "updated_at": pr['updated_at'],
                    "closed_at": pr.get('closed_at'),
                    "merged_at": pr.get('merged_at'),
                    "merged": pr.get('merged', False),
                    "mergeable": pr.get('mergeable'),
                    "mergeable_state": pr.get('mergeable_state', ''),
                    "draft": pr.get('draft', False),
                    "url": pr['html_url']
                },
                "stats": {
                    "commits": pr.get('commits', 0),
                    "additions": pr.get('additions', 0),
                    "deletions": pr.get('deletions', 0),
                    "changed_files": pr.get('changed_files', 0),
                    "comments": pr.get('comments', 0),
                    "review_comments": pr.get('review_comments', 0)
                },
                "branches": {
                    "head": {
                        "ref": pr.get('head', {}).get('ref', ''),
                        "sha": pr.get('head', {}).get('sha', '')
                    },
                    "base": {
                        "ref": pr.get('base', {}).get('ref', ''),
                        "sha": pr.get('base', {}).get('sha', '')
                    }
                },
                "labels": [label['name'] for label in pr.get('labels', [])],
                "assignees": [assignee['login'] for assignee in pr.get('assignees', [])],
                "requested_reviewers": [reviewer['login'] for reviewer in pr.get('requested_reviewers', [])]
            }
            
            return ToolResponse(
                success=True,
                data=result,
                metadata={"pr_number": pr_number}
            )
            
        except Exception as e:
            logger.error(f"PullRequestDetailsTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to fetch PR details: {str(e)}")
