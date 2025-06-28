"""
Qdrant vector database client.
"""
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance, VectorParams, PointStruct, Filter, 
    FieldCondition, MatchValue, SearchRequest,
    PayloadSchemaType, CreateFieldIndex
)
import uuid

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class QuadrantVectorClient:
    """Quadrant client for vector storage and retrieval."""
    def __init__(self):
        self.settings = None
        self.client: Optional[QdrantClient] = None
        self._initialized = False

    async def connect(self) -> None:
        """Connect to Quadrant."""
        try:
            if not self._initialized:
                self.settings = get_settings()
                self._initialized = True
                
            if self.settings.qdrant_api_key:
                self.client = QdrantClient(
                    url=self.settings.qdrant_url,
                    api_key=self.settings.qdrant_api_key,
                )
            else:
                self.client = QdrantClient(url=self.settings.qdrant_url)
                
            # Test connection
            collections = self.client.get_collections()
            logger.info("Connected to Qdrant", collections_count=len(collections.collections))
            
            # Create collection if it doesn't exist
            await self._ensure_collection_exists()
            
        except Exception as e:
            logger.error("Failed to connect to Quadrant", error=str(e))
            raise

    async def check_connection(self) -> bool:
        """Check if Qdrant connection is working."""
        try:
            if not self.client:
                return False
            collections = self.client.get_collections()
            return True
        except Exception as e:
            logger.error(f"Qdrant connection test failed: {str(e)}")
            return False
            
    async def _ensure_collection_exists(self) -> None:
        """Ensure the main collection exists."""        
        try:
            collections = self.client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if self.settings.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.settings.collection_name,
                    vectors_config=VectorParams(
                        size=self.settings.embedding_dimension,
                        distance=Distance.COSINE
                    ),
                )
                logger.info("Created collection", name=self.settings.collection_name)
                
                # Create indexes for filtering
                try:
                    # Index for repo_id field
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="repo_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Created index for repo_id field")
                    
                    # Index for file_path field
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="file_path",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Created index for file_path field")
                    
                    # Index for content_type field
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="content_type",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Created index for content_type field")
                    
                except Exception as index_error:
                    logger.warning(f"Failed to create some indexes: {str(index_error)}")
                    
            else:
                logger.info("Collection already exists", name=self.settings.collection_name)
                
                # Ensure indexes exist for existing collection
                try:
                    # Try to create indexes - this is idempotent
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="repo_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="file_path",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    
                    self.client.create_payload_index(
                        collection_name=self.settings.collection_name,
                        field_name="content_type",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Ensured indexes exist for existing collection")
                    
                except Exception as index_error:
                    logger.debug(f"Indexes may already exist: {str(index_error)}")
                
        except Exception as e:
            logger.error("Failed to ensure collection exists", error=str(e))
            raise
            
    async def store_embedding(
        self,
        embedding: List[float],
        metadata: Dict[str, Any],
        point_id: Optional[str] = None
    ) -> str:
        """Store embedding with metadata."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
            
        try:
            # Generate ID if not provided
            if not point_id:
                point_id = str(uuid.uuid4())
                
            # Create point
            point = PointStruct(
                id=point_id,
                vector=embedding,
                payload=metadata
            )
            
            # Store point
            self.client.upsert(
                collection_name=self.settings.collection_name,
                points=[point]            )
            
            logger.debug("Stored embedding", point_id=point_id, metadata_keys=list(metadata.keys()))
            return point_id
            
        except Exception as e:
            logger.error("Failed to store embedding", error=str(e))
            raise
            
    async def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        score_threshold: float = 0.3,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar embeddings."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
            
        try:
            # Build filter if provided
            search_filter = None
            if filter_conditions:
                conditions = []
                for key, value in filter_conditions.items():
                    conditions.append(
                        FieldCondition(key=key, match=MatchValue(value=value))
                    )
                search_filter = Filter(must=conditions)
                
            # Search
            results = self.client.search(
                collection_name=self.settings.collection_name,
                query_vector=query_embedding,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=search_filter
            )
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "id": result.id,
                    "score": result.score,
                    "metadata": result.payload
                })
                
            logger.debug(
                "Search completed",
                results_count=len(formatted_results),
                limit=limit,
                threshold=score_threshold
            )
            
            return formatted_results
            
        except Exception as e:
            logger.error("Failed to search embeddings", error=str(e))
            raise
            
    async def delete_embeddings(self, filter_conditions: Dict[str, Any]) -> int:
        """Delete embeddings matching filter conditions."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
            
        try:
            # Build filter
            conditions = []
            for key, value in filter_conditions.items():
                conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=value))
                )
            delete_filter = Filter(must=conditions)
            
            # Delete
            result = self.client.delete(
                collection_name=self.settings.collection_name,
                points_selector=delete_filter
            )
            
            logger.info("Deleted embeddings", conditions=filter_conditions)
            return result.status
            
        except Exception as e:
            logger.error("Failed to delete embeddings", error=str(e))
            raise
    async def get_collection_info(self) -> Dict[str, Any]:
        """Get collection information."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
            
        try:
            info = self.client.get_collection(self.settings.collection_name)
            return {
                "name": self.settings.collection_name,
                "points_count": info.points_count,
                "segments_count": info.segments_count,
                "vector_size": info.config.params.vectors.size,
                "distance": info.config.params.vectors.distance.value
            }
        except Exception as e:
            logger.error("Failed to get collection info", error=str(e))
            raise
        
    async def list_collections(self) -> List[str]:
        """List all collections."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
        
        try:
            collections = self.client.get_collections()
            return [c.name for c in collections.collections]
        except Exception as e:
            logger.error("Failed to list collections", error=str(e))
            raise    
    async def store_embedding_with_metadata(
        self,
        embedding: List[float],
        metadata: Dict[str, Any],
        point_id: Optional[str] = None,
        repo_id: Optional[str] = None,
        file_path: Optional[str] = None,
        text: Optional[str] = None
    ) -> str:
        """Store embedding with metadata (flexible parameter support)."""
        # Support both calling patterns:
        # 1. store_embedding_with_metadata(embedding, metadata, point_id) - new style
        # 2. store_embedding_with_metadata(repo_id, file_path, text, embedding, point_id) - old style
        
        if repo_id and file_path and text:
            # Old style call - build metadata from parameters
            final_metadata = {
                'repo_id': repo_id,
                'file_path': file_path,
                'text': text,
                'content_type': 'file'
            }
        else:
            # New style call - use provided metadata
            final_metadata = metadata
        return await self.store_embedding(embedding, final_metadata, point_id)
    
    async def search_similar_in_repo(
        self,
        query_embedding: List[float],
        repo_id: str,
        limit: int = 10,
        score_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Search for similar embeddings within a specific repository."""
        filter_conditions = {'repo_id': repo_id}
        return await self.search_similar(
            query_embedding=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions=filter_conditions
        )

    async def delete_repository_embeddings(self, repo_id: str) -> bool:
        """Delete all embeddings for a repository."""
        try:
            filter_conditions = {'repo_id': repo_id}
            result = await self.delete_embeddings(filter_conditions)
            return True
        except Exception as e:
            logger.error(f"Failed to delete repository embeddings: {str(e)}")
            return False

    async def search_meeting_segments(
        self,
        query_embedding: List[float],
        meeting_id: str,
        segment_index: int = None,
        limit: int = 10,
        score_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Search for similar meeting segments by meeting_id (and optionally segment_index)."""
        filter_conditions = {"meeting_id": meeting_id}
        if segment_index is not None:
            filter_conditions["segment_index"] = segment_index
        return await self.search_similar(
            query_embedding=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions=filter_conditions
        )


# Global Qdrant client instance
qdrant_client = QuadrantVectorClient()
