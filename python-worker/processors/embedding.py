"""
Improved Embedding processor for GitTLDR Python Worker.
Handles embedding generation and Q&A functionality with database-based file retrieval.
"""
import json
import re
from typing import Dict, Any, List
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.redis_client import redis_client
from services.database_service import database_service
from services.smart_context_builder import smart_context_builder
from utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingProcessor:
    """Handles embedding processing tasks with database-based file retrieval."""
    
    def __init__(self):
        pass
    
    async def process_repository(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process repository embeddings."""
        logger.info("Processing repository embeddings")
        
        # This would typically be handled by FileProcessor.process_full_repository
        # For now, return a placeholder
        return {
            "status": "completed",
            "message": "Repository embedding processing not implemented separately"
        }
    
    async def process_file(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Process single file embedding."""
        logger.info("Processing single file embedding")
        
        file_path = task_data.get("filePath")
        content = task_data.get("content")
        
        if not content:
            raise ValueError("File content is required")
        
        try:
            # Generate embedding
            embedding = await gemini_client.generate_embedding(content)
            
            # Store in Qdrant
            metadata = {
                "file_path": file_path,
                "content_type": "file",
                "processed_at": "2025-06-08T00:00:00Z"
            }
            
            point_id = await qdrant_client.store_embedding_with_metadata(
                embedding=embedding,
                metadata=metadata
            )
            
            return {
                "status": "completed",
                "point_id": point_id,
                "embedding_dimension": len(embedding)
            }
            
        except Exception as e:
            logger.error(f"Failed to process file embedding: {str(e)}")
            raise
    
    async def answer_question(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Answer a question about repository content using database and B2 storage."""
        try:
            question_id = task_data.get("questionId")
            repository_id = task_data.get("repositoryId")
            user_id = task_data.get("userId")
            question = task_data.get("question")
            
            logger.info(f"Processing Q&A for question: {question_id}, repo: {repository_id}")
            
            # First, check if repository processing is complete
            repo_status = await database_service.get_repository_status(repository_id)
            if not repo_status:
                logger.error(f"Repository {repository_id} not found in database")
                
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "Repository not found. Please ensure the repository has been added and processed.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Check if repository processing is complete
            if repo_status.get('embedding_status') != 'COMPLETED':
                logger.warning(f"Repository {repository_id} not fully processed. Status: {repo_status.get('embedding_status')}")
                
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": f"The repository '{repo_status.get('name', 'Unknown')}' is still being processed. Current status: {repo_status.get('embedding_status')}. Please wait for processing to complete and try again.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Get files from database
            files_metadata = await database_service.get_repository_files(repository_id)
            logger.info(f"Found {len(files_metadata)} files in database for repository {repository_id}")
            
            if not files_metadata:
                logger.warning(f"No files found in database for repository {repository_id}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "No files found for this repository. The repository may not have been processed correctly or may be empty.",
                    "confidence": 0.1,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Analyze the question to understand what context is needed
            question_analysis = smart_context_builder.analyze_question(question)
            logger.info(f"Question analysis: {question_analysis}")
            
            # Load file content from B2 for relevant files
            files_with_content = await database_service.load_file_contents(files_metadata, question_analysis)
            logger.info(f"Loaded content for {len(files_with_content)} files")
            
            if not files_with_content:
                logger.warning(f"No file content could be loaded for repository {repository_id}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "I couldn't load the content of the relevant files to answer your question. This might be due to storage issues or the files being too large. Please try again later or contact support.",
                    "confidence": 0.2,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
            
            # Build smart context
            files_content, relevant_file_paths = smart_context_builder.build_smart_context(
                question_analysis, files_with_content, question
            )
            
            if not files_content:
                logger.warning(f"No relevant content found for question: {question}")
                result_data = {
                    "question_id": question_id,
                    "question": question,
                    "answer": "I couldn't find relevant content to answer your question. The repository may have limited text-based files, or your question may require specific files that weren't found.",
                    "confidence": 0.2,
                    "relevant_files": [],
                    "user_id": user_id,
                    "repository_id": repository_id,
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(result_data))
                return {
                    "status": "completed",
                    "answer": result_data["answer"],
                    "confidence": result_data["confidence"],
                    "relevant_files": []
                }
              # Generate answer using Gemini
            repo_info = f"Repository: {repo_status.get('name')} (ID: {repository_id})"
            if repo_status.get('file_count'):
                repo_info += f"\nTotal files: {repo_status.get('file_count')}"
            if repo_status.get('total_size'):
                repo_info += f"\nTotal size: {repo_status.get('total_size')} bytes"
            
            answer_result = await gemini_client.answer_question(
                question=question,
                context=repo_info,
                files_content=files_content
            )
            
            # Automatically categorize the question using AI
            logger.info("Categorizing question using AI...")
            categorization_result = await gemini_client.categorize_question(
                question=question,
                repository_context=repo_info
            )
            
            logger.info(f"Question categorized as: {categorization_result.get('category')} "
                      f"with tags: {categorization_result.get('tags')}")
            
            # Store result in Redis for Node.js worker to process
            result_data = {
                "question_id": question_id,
                "question": question,
                "answer": answer_result["answer"],
                "confidence": answer_result["confidence"],
                "relevant_files": relevant_file_paths,
                "user_id": user_id,
                "repository_id": repository_id,
                "context_files_used": len(files_content),
                # Add AI-generated categorization
                "category": categorization_result.get("category", "general"),
                "tags": categorization_result.get("tags", ["question"]),
                "categorization_confidence": categorization_result.get("confidence", 0.5)
            }
            
            await redis_client.lpush("qna_results", json.dumps(result_data))
            logger.info(f"Q&A result queued for storage: {question_id}")
            
            return {
                "status": "completed",
                "answer": answer_result["answer"],
                "confidence": answer_result["confidence"],
                "relevant_files": relevant_file_paths
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {str(e)}")
            
            # Store error result
            try:
                error_result = {
                    "question_id": task_data.get("questionId"),
                    "question": task_data.get("question"),
                    "answer": f"An error occurred while processing your question: {str(e)}. Please try again later.",
                    "confidence": 0.0,
                    "relevant_files": [],
                    "user_id": task_data.get("userId"),
                    "repository_id": task_data.get("repositoryId"),
                    "context_files_used": 0
                }
                
                await redis_client.lpush("qna_results", json.dumps(error_result))
            except Exception as storage_error:
                logger.error(f"Failed to store error result: {str(storage_error)}")
            
            raise
