"""
Summarization processor for GitTLDR Python Worker.
Handles text summarization tasks.
"""
from typing import Dict, Any, List
from services.gemini_client import gemini_client
from utils.logger import get_logger

logger = get_logger(__name__)


class SummarizationProcessor:
    """Handles summarization processing tasks."""
    
    def __init__(self):
        pass
    
    async def summarize_repository(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Summarize repository content."""
        logger.info("Processing repository summarization")
        
        repository_id = task_data.get("repositoryId")
        content = task_data.get("content", "")
        
        if not repository_id:
            raise ValueError("Repository ID is required")
        
        try:
            # Generate summary using Gemini
            summary = await gemini_client.generate_summary(
                text=content,
                context="code repository"
            )
            
            return {
                "status": "completed",
                "repository_id": repository_id,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Failed to summarize repository: {str(e)}")
            raise
    
    async def summarize_file(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Summarize individual file content."""
        logger.info("Processing file summarization")
        
        file_path = task_data.get("filePath")
        file_content = task_data.get("content", "")
        file_language = task_data.get("language", "")
        repository_id = task_data.get("repositoryId")
        
        if not file_path:
            raise ValueError("File path is required")
        
        if not file_content.strip():
            return {
                "status": "completed",
                "file_path": file_path,
                "summary": "Empty file - no content to summarize",
                "repository_id": repository_id
            }
        
        try:
            # Build context for file summarization
            context_info = f"file ({file_language})" if file_language else "file"
            
            # Generate summary using Gemini
            summary = await gemini_client.generate_summary(
                text=file_content,
                context=context_info
            )
            
            logger.info(f"Generated summary for file: {file_path}")
            
            return {
                "status": "completed",
                "file_path": file_path,
                "summary": summary,
                "repository_id": repository_id,
                "language": file_language
            }
            
        except Exception as e:
            logger.error(f"Failed to summarize file {file_path}: {str(e)}")
            raise
    
    async def summarize_commit(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Summarize commit changes."""
        logger.info("Processing commit summarization")
        
        commit_data = task_data.get("commitData")
        changes = task_data.get("changes", [])
        
        if not commit_data:
            raise ValueError("Commit data is required")
        
        try:            # Build enhanced commit context from changes
            change_summary = []
            for change in changes:
                filename = change.get("filename", "unknown")
                status = change.get("status", "modified")
                additions = change.get("additions", 0)
                deletions = change.get("deletions", 0)
                
                # Create more descriptive change entries
                change_desc = f"- {filename}: {status}"
                if additions > 0 or deletions > 0:
                    change_desc += f" (+{additions}/-{deletions})"
                change_summary.append(change_desc)
            
            # Create enhanced commit context
            commit_context = f"""
Commit: {commit_data.get('sha', 'unknown')[:8]}
Message: {commit_data.get('message', '')}
Author: {commit_data.get('author', {}).get('name', 'unknown')}

Files modified ({len(changes)} files):
{chr(10).join(change_summary)}

Context: This is a git commit representing changes made to a codebase. Analyze the commit message and file changes to understand what functionality was added, modified, or fixed.
"""
            
            # Generate summary using Gemini
            summary = await gemini_client.generate_summary(
                text=commit_context,
                context="git commit"
            )
            
            return {
                "status": "completed",
                "commit_sha": commit_data.get("sha"),
                "summary": summary,
                "files_changed": len(changes)
            }
            
        except Exception as e:
            logger.error(f"Failed to summarize commit: {str(e)}")
            raise
    
    # async def process_meeting(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
    #     """Process meeting audio/transcript for summarization."""
    #     logger.info("Processing meeting summarization")
        
    #     meeting_id = task_data.get("meetingId")
    #     audio_url = task_data.get("audioUrl")
    #     transcript = task_data.get("transcript", "")
        
    #     if not meeting_id:
    #         raise ValueError("Meeting ID is required")
        
    #     try:
    #         # For now, just summarize any transcript content
    #         # In a full implementation, you'd handle audio processing here
            
    #         if transcript:
    #             content_to_summarize = transcript
    #         else:
    #             content_to_summarize = f"Meeting {meeting_id} - audio content at {audio_url}"
            
    #         # Generate summary using Gemini
    #         summary = await gemini_client.generate_summary(
    #             text=content_to_summarize,
    #             context="meeting transcript"
    #         )
            
    #         return {
    #             "status": "completed",
    #             "meeting_id": meeting_id,
    #             "summary": summary,
    #             "has_transcript": bool(transcript)
    #         }
            
    #     except Exception as e:
    #         logger.error(f"Failed to process meeting: {str(e)}")
    #         raise
