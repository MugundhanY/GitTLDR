"""
Thinking Context API endpoint for GitTLDR python-worker.
Provides file context and analysis for the frontend's AI Thinking Mode.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

from services.file_service import FileRetrievalService
from services.smart_context_builder import smart_context_builder
from utils.logger import get_logger

logger = get_logger(__name__)

# Request/Response models
class ThinkingContextRequest(BaseModel):
    repository_id: str
    question: str

class ThinkingContextResponse(BaseModel):
    repository_context: str
    files_content: List[str]
    relevant_files: List[str]
    question_analysis: Optional[Dict[str, Any]]

# Initialize services
file_service = FileRetrievalService()

async def get_thinking_context(request: ThinkingContextRequest) -> ThinkingContextResponse:
    """
    Get file context and analysis for AI thinking mode.
    
    This function integrates with the existing FileRetrievalService and SmartContextBuilder
    to provide rich context for the frontend's thinking mode.
    """
    try:
        repository_id = request.repository_id
        question = request.question
        
        logger.info(f"Getting thinking context for repository {repository_id}, question: {question[:100]}...")
        
        # 1. Check if repository is processed
        is_processed = await file_service.is_repository_processed(repository_id)
        if not is_processed:
            logger.warning(f"Repository {repository_id} not processed yet")
            return ThinkingContextResponse(
                repository_context=f"Repository {repository_id} is still being processed. Please wait for processing to complete.",
                files_content=[],
                relevant_files=[],
                question_analysis=None
            )
        
        # 2. Get repository status for context
        repo_status = await file_service.get_repository_processing_status(repository_id)
        repository_context = f"Repository ID: {repository_id}\n"
        repository_context += f"Processing Status: {repo_status.get('processing_status', 'unknown')}\n"
        repository_context += f"Total Files: {repo_status.get('file_count', 0)}\n"
        
        # 3. Analyze the question using SmartContextBuilder
        question_analysis = smart_context_builder.analyze_question(question)
        logger.info(f"Question analysis: {question_analysis}")
        
        # 4. Get available files from file service
        available_files = await file_service.get_repository_files(repository_id)
        logger.info(f"Found {len(available_files)} available files")
        
        if not available_files:
            logger.warning(f"No files found for repository {repository_id}")
            return ThinkingContextResponse(
                repository_context=repository_context + "No files available for analysis.",
                files_content=[],
                relevant_files=[],
                question_analysis=question_analysis
            )
        
        # 5. Load file content for intelligent analysis
        # For thinking mode, we want to load content for more files to give richer context
        files_with_content = await file_service.get_files_for_context(
            repository_id, 
            max_files=30,  # More files for thinking mode
            file_types=None  # Include all file types
        )
        
        if not files_with_content:
            logger.warning(f"No file content could be loaded for repository {repository_id}")
            return ThinkingContextResponse(
                repository_context=repository_context + "Files found but content could not be loaded.",
                files_content=[],
                relevant_files=[],
                question_analysis=question_analysis
            )
        
        # 6. Use SmartContextBuilder to get the most relevant context
        relevant_content, relevant_file_paths = smart_context_builder.build_smart_context(
            question_analysis, files_with_content, question
        )
        
        logger.info(f"Built context with {len(relevant_content)} relevant files")
        
        # 7. Prepare file content list for thinking mode
        # Include file paths for reference
        files_content = []
        for i, content in enumerate(relevant_content):
            if i < len(relevant_file_paths):
                files_content.append(f"File: {relevant_file_paths[i]}\n{content}")
            else:
                files_content.append(content)
        
        return ThinkingContextResponse(
            repository_context=repository_context,
            files_content=files_content,
            relevant_files=relevant_file_paths,
            question_analysis=question_analysis
        )
        
    except Exception as e:
        logger.error(f"Failed to get thinking context: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get thinking context: {str(e)}"
        )
