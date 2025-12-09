"""
API endpoint for downloading test packages
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os

from services.database_service import database_service
from services.enhanced_test_package_generator import get_enhanced_test_package_generator
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class DownloadTestPackageRequest(BaseModel):
    issue_fix_id: str
    repository_id: str
    use_enhanced: bool = True  # Use enhanced git clone approach by default


@router.post("/download-test-package")
async def download_test_package(
    request: DownloadTestPackageRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate and download a test package for an AI-generated fix
    
    Returns a ZIP file containing:
    - Modified code files
    - Dockerfile
    - docker-compose.yml
    - Test files
    - README with instructions
    """
    try:
        # 1. Get issue fix details
        issue_fix = await database_service.get_issue_fix(request.issue_fix_id)
        
        if not issue_fix:
            raise HTTPException(status_code=404, detail="Issue fix not found")
        
        # 2. Get repository details
        repository = await database_service.get_repository(request.repository_id)
        
        if not repository:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        # 3. Extract info from issue_fix
        proposed_fix = issue_fix.get('proposed_fix', {})
        diff = issue_fix.get('diff', '')  # Get unified diff if available
        
        # CRITICAL: Validate diff exists (required for test package generation)
        if not diff:
            logger.error(f"❌ No diff found for issue_fix {request.issue_fix_id}")
            logger.error(f"   Issue fix status: {issue_fix.get('status')}")
            logger.error(f"   Proposed fix keys: {list(proposed_fix.keys())}")
            
            # Check if this is a timing issue (fix still being processed)
            if issue_fix.get('status') in ['GENERATING_FIX', 'VALIDATING', 'ANALYZING', 'RETRIEVING_CODE']:
                raise HTTPException(
                    status_code=503,  # Service Temporarily Unavailable
                    detail="Fix is still being processed. Please wait a few seconds and try again."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No diff available for this fix. The fix may not have completed successfully or is using an older format that doesn't include unified diffs."
                )
        
        # Get operations from proposedFix (normalized format)
        operations = proposed_fix.get('operations', [])
        
        if not operations:
            # Fallback to old format if operations not found
            operations = proposed_fix.get('files', [])
        
        if not operations:
            raise HTTPException(
                status_code=400,
                detail="No operations found in this fix. The fix may not have completed successfully."
            )
        
        # Detect tech stack from repository or files
        tech_stack = await _detect_tech_stack(repository, operations)
        
        # Build repository URL
        repo_url = repository.get('html_url') or f"https://github.com/{repository.get('owner_name', 'unknown')}/{repository['name']}"
        
        # Get relevant files for intelligent analysis
        relevant_files = issue_fix.get('relevant_files', [])
        
        # 4. Generate test package (ALWAYS use enhanced generator as legacy is deprecated)
        generator = get_enhanced_test_package_generator()
        
        zip_path = await generator.create_test_package(
            repo_name=repository['name'],
            repo_owner=repository.get('owner_name', 'unknown'),
            issue_number=issue_fix['issue_number'],
            operations=operations,
            diff=diff,  # Pass the unified diff
            tech_stack=tech_stack,
            original_issue_title=issue_fix.get('issue_title', 'Issue Fix'),
            original_issue_body=issue_fix.get('issue_body', ''),
            repository_url=repo_url,  # New parameter for git clone
            files=relevant_files  # Pass actual files for analysis
        )
        filename_suffix = "enhanced"
        
        # 5. Schedule cleanup after download
        background_tasks.add_task(_cleanup_zip, zip_path)
        
        # 6. Return file
        filename = f"{repository['name']}-fix-{issue_fix['issue_number']}-{filename_suffix}.zip"
        
        return FileResponse(
            path=zip_path,
            media_type='application/zip',
            filename=filename,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating test package: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate test package: {str(e)}"
        )


async def _detect_tech_stack(repository: Dict, operations: List[Dict]) -> Dict:
    """Detect tech stack from repository or operations"""
    tech_stack = {
        'language': 'unknown',
        'framework': None
    }
    
    # Check file extensions from operations
    file_paths = [op.get('path', '') for op in operations]
    file_extensions = [path.split('.')[-1] for path in file_paths if '.' in path]
    
    if any(ext in ['py'] for ext in file_extensions):
        tech_stack['language'] = 'python'
        # Check for frameworks in file paths
        if any('django' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'Django'
        elif any('flask' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'Flask'
        elif any('fastapi' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'FastAPI'
    
    elif any(ext in ['js', 'jsx', 'ts', 'tsx'] for ext in file_extensions):
        tech_stack['language'] = 'javascript'
        # Check for frameworks
        if any('next' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'Next.js'
        elif any('react' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'React'
        elif any('vue' in path.lower() for path in file_paths):
            tech_stack['framework'] = 'Vue'
    
    elif any(ext in ['go'] for ext in file_extensions):
        tech_stack['language'] = 'go'
    
    elif any(ext in ['rs'] for ext in file_extensions):
        tech_stack['language'] = 'rust'
    
    elif any(ext in ['java'] for ext in file_extensions):
        tech_stack['language'] = 'java'
    
    return tech_stack


def _cleanup_zip(zip_path: str):
    """Clean up temporary zip file after download"""
    try:
        if os.path.exists(zip_path):
            os.remove(zip_path)
            logger.info(f"Cleaned up temporary zip: {zip_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup zip: {e}")
