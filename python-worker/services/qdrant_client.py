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
import time
from sentence_transformers import SentenceTransformer

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class QuadrantVectorClient:
    """Quadrant client for vector storage and retrieval."""
    def __init__(self):
        self.settings = None
        self.client: Optional[QdrantClient] = None
        self._initialized = False
        self.embedder = SentenceTransformer("sentence-transformers/paraphrase-mpnet-base-v2")
        self.embedding_dimension = 768

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
            
            # Ensure main collection exists
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
                    
                except Exception as e:
                    logger.error(f"Failed to create indexes for main collection: {str(e)}")
                    # Don't raise the error, just log it
                    pass
                    
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
                    
                    logger.info("Ensured all indexes exist for existing main collection")
                    
                except Exception as index_error:
                    logger.warning(f"Failed to create some indexes for main collection: {str(index_error)}")
            
            # Ensure meeting collection exists with correct dimension
            meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
            meeting_dimension = getattr(self.settings, "embedding_dimension_meeting", 384)
            
            if meeting_collection not in collection_names:
                self.client.create_collection(
                    collection_name=meeting_collection,
                    vectors_config=VectorParams(
                        size=meeting_dimension,
                        distance=Distance.COSINE
                    ),
                )
                logger.info(f"Created meeting collection {meeting_collection} with dimension {meeting_dimension}")
                
                # Create indexes for meeting collection
                try:
                    # Index for meeting_id field (for meeting Q&A)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="meeting_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Created index for meeting_id field")
                    
                    # Index for segment_index field (for meeting segments)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="segment_index",
                        field_schema=PayloadSchemaType.INTEGER
                    )
                    logger.info("Created index for segment_index field")
                    
                except Exception as e:
                    logger.error(f"Failed to create indexes for meeting collection: {str(e)}")
                    # Don't raise the error, just log it
                    pass
                    
            else:
                logger.info(f"Meeting collection {meeting_collection} already exists")
                
                # Ensure indexes exist for existing meeting collection
                try:
                    # Index for meeting_id field (for meeting Q&A)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="meeting_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    
                    # Index for segment_index field (for meeting segments)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="segment_index",
                        field_schema=PayloadSchemaType.INTEGER
                    )
                    
                    logger.info("Ensured all indexes exist for existing meeting collection")
                    
                except Exception as index_error:
                    logger.warning(f"Failed to create some indexes for meeting collection: {str(index_error)}")
                    
        except Exception as e:
            logger.error(f"Failed to create/verify collections: {str(e)}")
            raise
            
    def ensure_collection_exists(self, collection_name: str, dimension: int) -> None:
        """Ensure a collection with the given name and dimension exists."""
        collections = self.client.get_collections()
        collection_names = [c.name for c in collections.collections]
        if collection_name not in collection_names:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=dimension,
                    distance=Distance.COSINE
                ),
            )
            logger.info(f"Created collection {collection_name} with dimension {dimension}")
        else:
            logger.info(f"Collection {collection_name} already exists")

    async def store_embedding(
        self,
        embedding: List[float],
        metadata: Dict[str, Any],
        point_id: Optional[str] = None,
        collection_name: Optional[str] = None,
        dimension: Optional[int] = None
    ) -> str:
        """Store embedding with metadata in the specified collection."""
        if not self.client:
            raise RuntimeError("Quadrant client not connected")
        if not collection_name:
            collection_name = self.settings.collection_name
        if not dimension:
            dimension = self.settings.embedding_dimension
        # Ensure collection exists
        self.ensure_collection_exists(collection_name, dimension)
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
                collection_name=collection_name,
                points=[point]
            )
            
            logger.info(f"Stored embedding in collection {collection_name}")
            return point_id
            
        except Exception as e:
            logger.error(f"Failed to store embedding: {str(e)}")
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
        text: Optional[str] = None,
        collection_name: Optional[str] = None,
        dimension: Optional[int] = None
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
        return await self.store_embedding(embedding, final_metadata, point_id, collection_name=collection_name, dimension=dimension)
    
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

    async def store_meeting_segments(
        self,
        meeting_id: str,
        segments: List[Dict[str, Any]]
    ) -> bool:
        """Store meeting segments with embeddings in Qdrant."""
        if not self.client:
            await self.connect()  # Ensure connection
            
        try:
            meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
            
            # Ensure the meeting collection exists before storing
            await self._ensure_meeting_collection_exists()
            
            points = []
            
            for segment in segments:
                # Create embedding for segment text
                segment_text = f"{segment.get('title', '')} {segment.get('summary', '')} {segment.get('text', '')}"
                embedding = self.embedder.encode(segment_text).tolist()
                
                # Ensure embedding has correct dimension
                if len(embedding) < self.embedding_dimension:
                    embedding += [0.0] * (self.embedding_dimension - len(embedding))
                elif len(embedding) > self.embedding_dimension:
                    embedding = embedding[:self.embedding_dimension]
                
                # Create point for Qdrant
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "meeting_id": meeting_id,
                        "segment_index": segment.get('index', 0),
                        "title": segment.get('title', ''),
                        "summary": segment.get('summary', ''),
                        "segment_text": segment.get('text', ''),
                        "start_time": segment.get('startTime', 0),
                        "end_time": segment.get('endTime', 0),
                        "created_at": segment.get('created_at', str(int(time.time())))
                    }
                )
                points.append(point)
            
            # Store in Qdrant
            if points:
                self.client.upsert(
                    collection_name=meeting_collection,
                    points=points
                )
                logger.info(f"Stored {len(points)} meeting segments for meeting {meeting_id} in Qdrant")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to store meeting segments in Qdrant: {str(e)}")
            return False

    async def search_meeting_segments(
        self,
        query_embedding: List[float],
        meeting_id: str = None,
        segment_index: int = None,
        limit: int = 10,
        score_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Search for similar meeting segments by meeting_id (and optionally segment_index)."""
        if not self.client:
            await self.connect()  # Ensure connection
            
        try:
            # Ensure the meeting collection exists
            await self._ensure_meeting_collection_exists()
            
            # Build filter conditions - meeting_id is now optional
            conditions = []
            if meeting_id is not None:
                conditions.append(FieldCondition(key="meeting_id", match=MatchValue(value=meeting_id)))
            if segment_index is not None:
                conditions.append(FieldCondition(key="segment_index", match=MatchValue(value=segment_index)))
            
            search_filter = Filter(must=conditions) if conditions else None
                
            # Use the meeting collection, not the main collection
            meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
            
            # Search in the meeting collection
            results = self.client.search(
                collection_name=meeting_collection,
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
                "Meeting search completed",
                results_count=len(formatted_results),
                meeting_id=meeting_id,
                limit=limit,
                threshold=score_threshold
            )
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search meeting segments: {str(e)}")
            return []

    async def _ensure_meeting_collection_exists(self) -> None:
        """Ensure the meeting collection exists."""
        if not self.client:
            return
            
        try:
            collections = self.client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            meeting_collection = getattr(self.settings, "meeting_qdrant_collection", "meeting_segments")
            meeting_dimension = getattr(self.settings, "embedding_dimension_meeting", 384)
            
            if meeting_collection not in collection_names:
                self.client.create_collection(
                    collection_name=meeting_collection,
                    vectors_config=VectorParams(
                        size=meeting_dimension,
                        distance=Distance.COSINE
                    ),
                )
                logger.info(f"Created meeting collection {meeting_collection} with dimension {meeting_dimension}")
                
                # Create indexes for meeting collection
                try:
                    # Index for meeting_id field (for meeting Q&A)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="meeting_id",
                        field_schema=PayloadSchemaType.KEYWORD
                    )
                    logger.info("Created index for meeting_id field")
                    
                    # Index for segment_index field (for meeting segments)
                    self.client.create_payload_index(
                        collection_name=meeting_collection,
                        field_name="segment_index",
                        field_schema=PayloadSchemaType.INTEGER
                    )
                    logger.info("Created index for segment_index field")
                    
                except Exception as e:
                    logger.error(f"Failed to create indexes for meeting collection: {str(e)}")
            else:
                logger.debug(f"Meeting collection {meeting_collection} already exists")
                
        except Exception as e:
            logger.error(f"Failed to ensure meeting collection exists: {str(e)}")
            raise


# Global Qdrant client instance
qdrant_client = QuadrantVectorClient()
