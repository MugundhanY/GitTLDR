"""
Embedding processor for GitTLDR Python Worker.
Handles embedding generation and Q&A functionality.
"""
from typing import Dict, Any, List
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingProcessor:
    """Handles embedding processing tasks."""
    
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
        """Answer question using embeddings."""
        logger.info("Processing Q&A request")
        
        question = task_data.get("question")
        repository_id = task_data.get("repositoryId")
        
        if not question or not repository_id:
            raise ValueError("Question and repository ID are required")
        
        try:
            # Generate question embedding
            question_embedding = await gemini_client.generate_embedding(question)
            
            # Search for similar content
            similar_results = await qdrant_client.search_similar(
                query_embedding=question_embedding,
                limit=5,
                filter_conditions={"repo_id": repository_id}
            )
            
            # Extract file contents for context
            files_content = []
            for result in similar_results:
                # This would need to get actual file content
                files_content.append(f"File: {result.get('metadata', {}).get('file_path', 'unknown')}")
            
            # Generate answer using Gemini
            answer_result = await gemini_client.answer_question(
                question=question,
                context=f"Repository: {repository_id}",
                files_content=files_content
            )
            
            return {
                "status": "completed",
                "answer": answer_result["answer"],
                "confidence": answer_result["confidence"],
                "relevant_files": [r.get("metadata", {}).get("file_path") for r in similar_results]
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {str(e)}")
            raise
