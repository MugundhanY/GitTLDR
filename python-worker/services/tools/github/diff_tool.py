"""
Code diff analysis tool for GitHub integration.
"""

from ..base_tool import BaseTool, ToolParameter, ToolResponse
from ...github_api_client import GitHubClient
from utils.logger import get_logger

logger = get_logger(__name__)


class DiffTool(BaseTool):
    """Tool for getting code diffs and changes."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "get_commit_diff"
        self.description = """Get detailed diff of changes in a commit.
        Returns file-by-file changes with additions, deletions, and patch content.
        Useful for understanding what changed in a specific commit."""
        
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
                description="Commit SHA to get diff for (can be short or full SHA)",
                required=True
            ),
            ToolParameter(
                name="include_patch",
                type="BOOLEAN",
                description="Whether to include the actual diff patch (default: true)",
                required=False
            )
        ]
        
        self.cache_ttl = 3600  # 1 hour cache for diffs
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Get commit diff with file-by-file changes."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            commit_sha = kwargs['commit_sha']
            include_patch = kwargs.get('include_patch', True)
            
            logger.info(f"Fetching diff for commit {commit_sha}")
            
            # Fetch commit with diff
            commit = await self.github_client.get_commit(
                owner=repo_owner,
                repo=repo_name,
                sha=commit_sha
            )
            
            commit_data = commit.get('commit', {})
            files = commit.get('files', [])
            
            # Format files with changes
            files_changed = []
            for file in files:
                file_info = {
                    "filename": file['filename'],
                    "status": file['status'],  # added, removed, modified, renamed
                    "additions": file.get('additions', 0),
                    "deletions": file.get('deletions', 0),
                    "changes": file.get('changes', 0)
                }
                
                # Add patch if requested and available
                if include_patch and 'patch' in file:
                    # Limit patch size to avoid overwhelming responses
                    patch = file['patch']
                    if len(patch) > 2000:
                        file_info["patch"] = patch[:2000] + "\n... (truncated)"
                        file_info["patch_truncated"] = True
                    else:
                        file_info["patch"] = patch
                        file_info["patch_truncated"] = False
                
                # Handle renamed files
                if file['status'] == 'renamed':
                    file_info["previous_filename"] = file.get('previous_filename', '')
                
                files_changed.append(file_info)
            
            # Calculate statistics
            total_additions = sum(f['additions'] for f in files_changed)
            total_deletions = sum(f['deletions'] for f in files_changed)
            
            # Group files by status
            files_by_status = {
                "added": [f for f in files_changed if f['status'] == 'added'],
                "modified": [f for f in files_changed if f['status'] == 'modified'],
                "removed": [f for f in files_changed if f['status'] == 'removed'],
                "renamed": [f for f in files_changed if f['status'] == 'renamed']
            }
            
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
                    "url": commit.get('html_url', '')
                },
                "stats": {
                    "total_additions": total_additions,
                    "total_deletions": total_deletions,
                    "total_changes": total_additions + total_deletions,
                    "files_changed": len(files_changed),
                    "files_added": len(files_by_status['added']),
                    "files_modified": len(files_by_status['modified']),
                    "files_removed": len(files_by_status['removed']),
                    "files_renamed": len(files_by_status['renamed'])
                },
                "files": files_changed,
                "files_by_status": {
                    k: [f['filename'] for f in v]
                    for k, v in files_by_status.items()
                }
            }
            
            return ToolResponse(
                success=True,
                data=result,
                metadata={
                    "commit_sha": commit['sha'],
                    "files_changed": len(files_changed),
                    "total_changes": total_additions + total_deletions
                }
            )
            
        except Exception as e:
            logger.error(f"DiffTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to fetch commit diff: {str(e)}")


class CompareTool(BaseTool):
    """Tool for comparing two commits or branches."""
    
    def __init__(self, github_client: GitHubClient):
        super().__init__()
        self.github_client = github_client
        
        self.name = "compare_commits"
        self.description = """Compare two commits or branches to see what changed between them.
        Returns the commits between the two references and overall statistics."""
        
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
                name="base",
                type="STRING",
                description="Base branch or commit SHA",
                required=True
            ),
            ToolParameter(
                name="head",
                type="STRING",
                description="Head branch or commit SHA to compare against base",
                required=True
            )
        ]
    
    async def execute(self, **kwargs) -> ToolResponse:
        """Compare two commits or branches."""
        try:
            is_valid, error_msg = self.validate_parameters(**kwargs)
            if not is_valid:
                return ToolResponse(success=False, data=None, error=error_msg)
            
            repo_owner = kwargs['repo_owner']
            repo_name = kwargs['repo_name']
            base = kwargs['base']
            head = kwargs['head']
            
            logger.info(f"Comparing {base}...{head} in {repo_owner}/{repo_name}")
            
            # GitHub API endpoint for comparison
            endpoint = f"repos/{repo_owner}/{repo_name}/compare/{base}...{head}"
            comparison = await self.github_client._make_request("GET", endpoint)
            
            files = comparison.get('files', [])
            commits = comparison.get('commits', [])
            
            result = {
                "comparison": {
                    "base": base,
                    "head": head,
                    "status": comparison.get('status', ''),  # ahead, behind, identical, diverged
                    "ahead_by": comparison.get('ahead_by', 0),
                    "behind_by": comparison.get('behind_by', 0),
                    "total_commits": comparison.get('total_commits', 0)
                },
                "stats": {
                    "total_additions": sum(f.get('additions', 0) for f in files),
                    "total_deletions": sum(f.get('deletions', 0) for f in files),
                    "files_changed": len(files)
                },
                "commits": [
                    {
                        "sha": commit['sha'][:7],
                        "message": commit['commit']['message'],
                        "author": commit['commit']['author']['name'],
                        "date": commit['commit']['author']['date']
                    }
                    for commit in commits[:10]  # Limit to 10 commits
                ],
                "files": [
                    {
                        "filename": f['filename'],
                        "status": f['status'],
                        "additions": f.get('additions', 0),
                        "deletions": f.get('deletions', 0)
                    }
                    for f in files[:20]  # Limit to 20 files
                ]
            }
            
            return ToolResponse(
                success=True,
                data=result,
                metadata={
                    "base": base,
                    "head": head,
                    "commits": len(commits),
                    "files": len(files)
                }
            )
            
        except Exception as e:
            logger.error(f"CompareTool error: {str(e)}", exc_info=True)
            return ToolResponse(success=False, data=None, error=f"Failed to compare commits: {str(e)}")
