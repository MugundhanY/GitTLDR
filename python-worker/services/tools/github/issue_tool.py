"""
Issue analysis tool for GitHub integration.
"""

from ..base_tool import BaseTool, ToolParameter, ToolResponse
from ...github_api_client import GitHubClient
from utils.logger import get_logger

logger = get_logger(__name__)


class IssueTool(BaseTool):
    """Tool for analyzing GitHub issues."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_issues"
        self.description = """Get issues from a repository with filters.
        Returns issue number, title, state, author, labels, assignees, and statistics.
        Useful for tracking bugs, feature requests, and project management."""
        
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
                description="Issue state: open, closed, or all",
                required=False,
                enum=["open", "closed", "all"]
            ),
            ToolParameter(
                name="labels",
                type="STRING",
                description="Comma-separated list of label names to filter by",
                required=False
            ),
            ToolParameter(
                name="assignee",
                type="STRING",
                description="Filter by assignee username",
                required=False
            ),
            ToolParameter(
                name="creator",
                type="STRING",
                description="Filter by creator username",
                required=False
            ),
            ToolParameter(
                name="limit",
                type="INTEGER",
                description="Maximum number of issues to return (default: 30)",
                required=False
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get issues with optional filters."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            state = kwargs.get('state', 'open')
            labels = kwargs.get('labels')
            assignee = kwargs.get('assignee')
            creator = kwargs.get('creator')
            limit = min(kwargs.get('limit', 30), 100)
            
            logger.info(f"Fetching issues for {repo_owner}/{repo_name}")
            
            # Fetch issues
            issues = await self.github_client.get_issues(
                owner=repo_owner,
                repo=repo_name,
                state=state,
                labels=labels,
                assignee=assignee,
                creator=creator,
                per_page=limit
            )
            
            # Filter out pull requests (GitHub API returns both)
            issues = [issue for issue in issues if 'pull_request' not in issue]
            
            if not issues:
                return ToolResponse(
                    success=True,
                    data=[],
                    metadata={
                        "message": "No issues found matching filters",
                        "filters": {
                            "state": state,
                            "labels": labels,
                            "assignee": assignee,
                            "creator": creator
                        }
                    }
                )
            
            # Format issues
            formatted_issues = [
                {
                    "number": issue['number'],
                    "title": issue['title'],
                    "state": issue['state'],
                    "author": issue.get('user', {}).get('login', 'unknown'),
                    "created_at": issue['created_at'],
                    "updated_at": issue['updated_at'],
                    "closed_at": issue.get('closed_at'),
                    "comments": issue.get('comments', 0),
                    "labels": [label['name'] for label in issue.get('labels', [])],
                    "assignees": [assignee['login'] for assignee in issue.get('assignees', [])],
                    "milestone": issue.get('milestone', {}).get('title') if issue.get('milestone') else None,
                    "locked": issue.get('locked', False),
                    "url": issue['html_url'],
                    "body_preview": issue.get('body', '')[:200] if issue.get('body') else ''
                }
                for issue in issues
            ]
            
            # Calculate statistics
            label_counts = {}
            for issue in formatted_issues:
                for label in issue['labels']:
                    label_counts[label] = label_counts.get(label, 0) + 1
            
            return ToolResponse(
                success=True,
                data=formatted_issues,
                metadata={
                    "total_issues": len(formatted_issues),
                    "repository": f"{repo_owner}/{repo_name}",
                    "state": state,
                    "statistics": {
                        "open": sum(1 for issue in formatted_issues if issue['state'] == 'open'),
                        "closed": sum(1 for issue in formatted_issues if issue['state'] == 'closed'),
                        "with_assignees": sum(1 for issue in formatted_issues if issue['assignees']),
                        "label_distribution": label_counts
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"IssueTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to fetch issues: {str(e)}")


class IssueDetailsTool(BaseTool):
    """Tool for getting detailed issue information."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_issue_details"
        self.description = """Get detailed information about a specific issue.
        Returns full issue body, comments count, and comprehensive metadata."""
        
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
                name="issue_number",
                type="INTEGER",
                description="Issue number",
                required=True
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get detailed issue information."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            issue_number = kwargs['issue_number']
            
            # Fetch issue details
            issue = await self.github_client.get_issue(
                owner=repo_owner,
                repo=repo_name,
                issue_number=issue_number
            )
            
            result = {
                "issue": {
                    "number": issue['number'],
                    "title": issue['title'],
                    "body": issue.get('body', ''),
                    "state": issue['state'],
                    "author": issue.get('user', {}).get('login', 'unknown'),
                    "created_at": issue['created_at'],
                    "updated_at": issue['updated_at'],
                    "closed_at": issue.get('closed_at'),
                    "url": issue['html_url']
                },
                "engagement": {
                    "comments": issue.get('comments', 0),
                    "reactions": {
                        "total": issue.get('reactions', {}).get('total_count', 0),
                        "+1": issue.get('reactions', {}).get('+1', 0),
                        "-1": issue.get('reactions', {}).get('-1', 0),
                        "laugh": issue.get('reactions', {}).get('laugh', 0),
                        "hooray": issue.get('reactions', {}).get('hooray', 0),
                        "confused": issue.get('reactions', {}).get('confused', 0),
                        "heart": issue.get('reactions', {}).get('heart', 0),
                        "rocket": issue.get('reactions', {}).get('rocket', 0),
                        "eyes": issue.get('reactions', {}).get('eyes', 0)
                    }
                },
                "labels": [label['name'] for label in issue.get('labels', [])],
                "assignees": [assignee['login'] for assignee in issue.get('assignees', [])],
                "milestone": {
                    "title": issue.get('milestone', {}).get('title'),
                    "state": issue.get('milestone', {}).get('state'),
                    "due_on": issue.get('milestone', {}).get('due_on')
                } if issue.get('milestone') else None,
                "locked": issue.get('locked', False),
                "active_lock_reason": issue.get('active_lock_reason')
            }
            
            return ToolResponse(
                success=True,
                data=result,
                metadata={"issue_number": issue_number}
            )
            
        except Exception as e:
            logger.error(f"IssueDetailsTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to fetch issue details: {str(e)}")
