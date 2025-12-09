"""
Neo4j client for code graph storage and retrieval.
Manages code relationships, dependencies, and semantic connections.
"""
import asyncio
from typing import Dict, Any, List, Optional, Set, Tuple
from neo4j import AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from datetime import datetime

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class Neo4jClient:
    """
    Neo4j client for managing code graph structure.
    
    Node Types:
    - Repository: Root node for each repository
    - File: Individual files in the repository
    - Function: Functions/methods in the code
    - Class: Classes/types in the code
    - Module: Modules/packages
    - Import: Import statements
    - Variable: Important variables/constants
    
    Relationship Types:
    - CONTAINS: Repository -> File, File -> Function/Class
    - CALLS: Function -> Function
    - IMPORTS: File -> Module
    - INHERITS: Class -> Class
    - USES: Function -> Variable/Class
    - REFERENCES: Any -> Any (semantic relationship)
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.driver = None
        self._connected = False
        
    async def connect(self) -> None:
        """Connect to Neo4j database."""
        try:
            logger.info("Connecting to Neo4j", uri=self.settings.neo4j_uri)
            
            # Create async driver
            self.driver = AsyncGraphDatabase.driver(
                self.settings.neo4j_uri,
                auth=(self.settings.neo4j_username, self.settings.neo4j_password),
                database=self.settings.neo4j_database
            )
            
            # Verify connectivity
            await self.driver.verify_connectivity()
            
            # Create indexes for performance
            await self._create_indexes()
            
            self._connected = True
            logger.info("Neo4j connection established successfully")
            
        except AuthError as e:
            logger.error("Neo4j authentication failed", error=str(e))
            raise
        except ServiceUnavailable as e:
            logger.error("Neo4j service unavailable", error=str(e))
            raise
        except Exception as e:
            logger.error("Failed to connect to Neo4j", error=str(e))
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Neo4j."""
        if self.driver:
            await self.driver.close()
            self._connected = False
            logger.info("Neo4j connection closed")
    
    async def _create_indexes(self) -> None:
        """Create indexes for better query performance."""
        indexes = [
            "CREATE INDEX repo_id_index IF NOT EXISTS FOR (r:Repository) ON (r.repository_id)",
            "CREATE INDEX file_path_index IF NOT EXISTS FOR (f:File) ON (f.path)",
            "CREATE INDEX function_name_index IF NOT EXISTS FOR (fn:Function) ON (fn.name)",
            "CREATE INDEX class_name_index IF NOT EXISTS FOR (c:Class) ON (c.name)",
            "CREATE INDEX module_name_index IF NOT EXISTS FOR (m:Module) ON (m.name)",
            "CREATE TEXT INDEX file_content_index IF NOT EXISTS FOR (f:File) ON (f.content_summary)",
            "CREATE TEXT INDEX function_description_index IF NOT EXISTS FOR (fn:Function) ON (fn.description)",
        ]
        
        async with self.driver.session() as session:
            for index_query in indexes:
                try:
                    await session.run(index_query)
                    logger.debug(f"Created/verified index: {index_query[:50]}...")
                except Exception as e:
                    # Indexes might already exist, ignore errors
                    logger.debug(f"Index creation note: {str(e)[:100]}")
    
    async def create_repository_node(self, repository_id: str, metadata: Dict[str, Any]) -> str:
        """Create a repository root node."""
        query = """
        MERGE (r:Repository {repository_id: $repository_id})
        SET r.name = $name,
            r.url = $url,
            r.language = $language,
            r.description = $description,
            r.created_at = datetime($created_at),
            r.updated_at = datetime()
        RETURN r.repository_id as id
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                repository_id=repository_id,
                name=metadata.get('name', ''),
                url=metadata.get('url', ''),
                language=metadata.get('language', ''),
                description=metadata.get('description', ''),
                created_at=metadata.get('created_at', datetime.utcnow().isoformat())
            )
            record = await result.single()
            logger.info(f"Created repository node: {repository_id}")
            return record['id'] if record else repository_id
    
    async def create_file_node(
        self, 
        repository_id: str, 
        file_path: str, 
        metadata: Dict[str, Any]
    ) -> str:
        """Create a file node and link to repository."""
        query = """
        MATCH (r:Repository {repository_id: $repository_id})
        MERGE (f:File {path: $file_path, repository_id: $repository_id})
        SET f.name = $name,
            f.extension = $extension,
            f.content_summary = $content_summary,
            f.size = $size,
            f.language = $language,
            f.updated_at = datetime()
        MERGE (r)-[:CONTAINS]->(f)
        RETURN f.path as path
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                repository_id=repository_id,
                file_path=file_path,
                name=metadata.get('name', file_path.split('/')[-1]),
                extension=metadata.get('extension', ''),
                content_summary=metadata.get('content_summary', ''),
                size=metadata.get('size', 0),
                language=metadata.get('language', '')
            )
            record = await result.single()
            logger.debug(f"Created file node: {file_path}")
            return record['path'] if record else file_path
    
    async def create_function_node(
        self, 
        repository_id: str,
        file_path: str,
        function_data: Dict[str, Any]
    ) -> str:
        """Create a function node and link to file."""
        query = """
        MATCH (f:File {path: $file_path, repository_id: $repository_id})
        CREATE (fn:Function {
            name: $name,
            qualified_name: $qualified_name,
            repository_id: $repository_id,
            file_path: $file_path
        })
        SET fn.signature = $signature,
            fn.description = $description,
            fn.start_line = $start_line,
            fn.end_line = $end_line,
            fn.complexity = $complexity,
            fn.is_async = $is_async,
            fn.parameters = $parameters,
            fn.return_type = $return_type,
            fn.created_at = datetime()
        MERGE (f)-[:CONTAINS]->(fn)
        RETURN fn.qualified_name as qualified_name
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                repository_id=repository_id,
                file_path=file_path,
                name=function_data.get('name', ''),
                qualified_name=function_data.get('qualified_name', ''),
                signature=function_data.get('signature', ''),
                description=function_data.get('description', ''),
                start_line=function_data.get('start_line', 0),
                end_line=function_data.get('end_line', 0),
                complexity=function_data.get('complexity', 0),
                is_async=function_data.get('is_async', False),
                parameters=function_data.get('parameters', []),
                return_type=function_data.get('return_type', '')
            )
            record = await result.single()
            return record['qualified_name'] if record else function_data.get('qualified_name', '')
    
    async def create_class_node(
        self, 
        repository_id: str,
        file_path: str,
        class_data: Dict[str, Any]
    ) -> str:
        """Create a class node and link to file."""
        query = """
        MATCH (f:File {path: $file_path, repository_id: $repository_id})
        CREATE (c:Class {
            name: $name,
            qualified_name: $qualified_name,
            repository_id: $repository_id,
            file_path: $file_path
        })
        SET c.description = $description,
            c.start_line = $start_line,
            c.end_line = $end_line,
            c.base_classes = $base_classes,
            c.methods = $methods,
            c.attributes = $attributes,
            c.created_at = datetime()
        MERGE (f)-[:CONTAINS]->(c)
        RETURN c.qualified_name as qualified_name
        """
        
        async with self.driver.session() as session:
            result = await session.run(
                query,
                repository_id=repository_id,
                file_path=file_path,
                name=class_data.get('name', ''),
                qualified_name=class_data.get('qualified_name', ''),
                description=class_data.get('description', ''),
                start_line=class_data.get('start_line', 0),
                end_line=class_data.get('end_line', 0),
                base_classes=class_data.get('base_classes', []),
                methods=class_data.get('methods', []),
                attributes=class_data.get('attributes', [])
            )
            record = await result.single()
            return record['qualified_name'] if record else class_data.get('qualified_name', '')
    
    async def create_import_relationship(
        self,
        repository_id: str,
        from_file: str,
        to_module: str,
        import_type: str = "IMPORTS"
    ) -> None:
        """Create an import relationship between file and module."""
        query = """
        MATCH (f:File {path: $from_file, repository_id: $repository_id})
        MERGE (m:Module {name: $to_module, repository_id: $repository_id})
        MERGE (f)-[r:IMPORTS {type: $import_type}]->(m)
        SET r.updated_at = datetime()
        """
        
        async with self.driver.session() as session:
            await session.run(
                query,
                repository_id=repository_id,
                from_file=from_file,
                to_module=to_module,
                import_type=import_type
            )
    
    async def create_call_relationship(
        self,
        repository_id: str,
        caller_function: str,
        called_function: str,
        call_context: Optional[str] = None
    ) -> None:
        """Create a function call relationship."""
        query = """
        MATCH (caller:Function {qualified_name: $caller_function, repository_id: $repository_id})
        MATCH (called:Function {qualified_name: $called_function, repository_id: $repository_id})
        MERGE (caller)-[r:CALLS]->(called)
        SET r.context = $call_context,
            r.updated_at = datetime()
        """
        
        async with self.driver.session() as session:
            await session.run(
                query,
                repository_id=repository_id,
                caller_function=caller_function,
                called_function=called_function,
                call_context=call_context
            )
    
    async def create_inheritance_relationship(
        self,
        repository_id: str,
        child_class: str,
        parent_class: str
    ) -> None:
        """Create a class inheritance relationship."""
        query = """
        MATCH (child:Class {qualified_name: $child_class, repository_id: $repository_id})
        MATCH (parent:Class {qualified_name: $parent_class, repository_id: $repository_id})
        MERGE (child)-[r:INHERITS]->(parent)
        SET r.updated_at = datetime()
        """
        
        async with self.driver.session() as session:
            await session.run(
                query,
                repository_id=repository_id,
                child_class=child_class,
                parent_class=parent_class
            )
    
    async def graph_based_context_retrieval(
        self,
        repository_id: str,
        question_keywords: List[str],
        max_depth: int = 3,
        max_nodes: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context using graph traversal.
        
        This is the core method for intelligent context retrieval that:
        1. Finds entry points based on keywords
        2. Traverses the graph to find related code
        3. Returns optimized, connected context
        """
        # Step 1: Find entry point nodes
        entry_nodes = await self._find_entry_nodes(repository_id, question_keywords)
        
        if not entry_nodes:
            logger.warning(f"No entry nodes found for keywords: {question_keywords}")
            return []
        
        logger.info(f"Found {len(entry_nodes)} entry nodes for graph traversal")
        
        # Step 2: Traverse graph to find related nodes
        related_nodes = await self._traverse_graph(
            repository_id,
            entry_nodes,
            max_depth=max_depth,
            max_nodes=max_nodes
        )
        
        logger.info(f"Graph traversal found {len(related_nodes)} related nodes")
        
        # Step 3: Extract context from nodes
        context = await self._extract_context_from_nodes(repository_id, related_nodes)
        
        return context
    
    async def _find_entry_nodes(
        self,
        repository_id: str,
        keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """Find entry point nodes based on keywords."""
        # Build keyword matching conditions
        keyword_lower_list = [keyword.lower() for keyword in keywords[:10]]  # Limit to 10 keywords
        
        if not keyword_lower_list:
            return []
        
        # Create parameterized conditions for better performance and security
        keyword_params = {f'keyword_{i}': kw for i, kw in enumerate(keyword_lower_list)}
        
        query = """
        MATCH (r:Repository {repository_id: $repository_id})
        
        // Find files matching keywords
        OPTIONAL MATCH (r)-[:CONTAINS]->(f:File)
        WHERE ANY(keyword IN $keywords WHERE 
            toLower(f.name) CONTAINS keyword OR 
            toLower(f.path) CONTAINS keyword)
        
        // Find functions matching keywords
        OPTIONAL MATCH (r)-[:CONTAINS]->(f2:File)-[:CONTAINS]->(fn:Function)
        WHERE ANY(keyword IN $keywords WHERE 
            toLower(fn.name) CONTAINS keyword OR 
            toLower(COALESCE(fn.qualified_name, fn.name)) CONTAINS keyword)
        
        // Find classes matching keywords
        OPTIONAL MATCH (r)-[:CONTAINS]->(f3:File)-[:CONTAINS]->(c:Class)
        WHERE ANY(keyword IN $keywords WHERE 
            toLower(c.name) CONTAINS keyword OR 
            toLower(COALESCE(c.qualified_name, c.name)) CONTAINS keyword)
        
        // Find modules matching keywords
        OPTIONAL MATCH (r)-[:CONTAINS]->(f4:File)-[:IMPORTS]->(m:Module)
        WHERE ANY(keyword IN $keywords WHERE 
            toLower(m.name) CONTAINS keyword)
        
        WITH f, fn, c, m
        RETURN 
            COLLECT(DISTINCT {type: 'File', id: elementId(f), path: f.path, name: f.name}) as files,
            COLLECT(DISTINCT {type: 'Function', id: elementId(fn), name: COALESCE(fn.qualified_name, fn.name)}) as functions,
            COLLECT(DISTINCT {type: 'Class', id: elementId(c), name: COALESCE(c.qualified_name, c.name)}) as classes,
            COLLECT(DISTINCT {type: 'Module', id: elementId(m), name: m.name}) as modules
        """
        
        entry_nodes = []
        async with self.driver.session() as session:
            result = await session.run(query, repository_id=repository_id, keywords=keyword_lower_list)
            record = await result.single()
            
            if record:
                # Flatten all node types
                for node_list in [record['files'], record['functions'], record['classes'], record['modules']]:
                    entry_nodes.extend([n for n in node_list if n.get('id') or n.get('name')])
        
        return entry_nodes
    
    async def _traverse_graph(
        self,
        repository_id: str,
        start_nodes: List[Dict[str, Any]],
        max_depth: int = 3,
        max_nodes: int = 20
    ) -> List[Dict[str, Any]]:
        """Traverse graph from start nodes to find related code."""
        # Build start node IDs
        start_ids = [node.get('id') for node in start_nodes if node.get('id')]
        
        if not start_ids:
            return start_nodes[:max_nodes]
        
        # Use variable-length path pattern to find related nodes
        query = '''
        MATCH (start)
        WHERE elementId(start) IN $start_ids
        MATCH path = (start)-[*1..3]-(related)
        WHERE related.repository_id = $repository_id
        WITH DISTINCT related, length(path) as distance
        ORDER BY distance ASC
        LIMIT $max_nodes
        RETURN 
            labels(related)[0] as node_type,
            elementId(related) as id,
            related.name as name,
            related.path as path,
            COALESCE(related.qualified_name, related.name) as qualified_name,
            related.description as description,
            related.content_summary as content_summary,
            distance
        '''
        
        related_nodes = []
        async with self.driver.session() as session:
            result = await session.run(
                query,
                start_ids=start_ids,
                repository_id=repository_id,
                max_nodes=max_nodes
            )
            
            async for record in result:
                related_nodes.append({
                    'type': record['node_type'],
                    'id': record['id'],
                    'name': record['name'] or record['qualified_name'],
                    'path': record['path'],
                    'description': record['description'],
                    'content_summary': record['content_summary'],
                    'distance': record['distance']
                })
        
        return related_nodes
    
    async def _extract_context_from_nodes(
        self,
        repository_id: str,
        nodes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract file content and metadata from nodes."""
        # Group nodes by file path
        files_to_fetch = set()
        
        for node in nodes:
            if node.get('path'):
                files_to_fetch.add(node['path'])
        
        if not files_to_fetch:
            return []
        
        # Fetch all files from database
        from services.database_service import database_service
        from services.b2_storage_sdk_fixed import B2StorageService
        
        b2_storage_service = B2StorageService()
        all_files = await database_service.get_repository_files(repository_id)
        
        # Filter to only files we need and load their content
        context = []
        for file_path in files_to_fetch:
            # Find matching file in database results
            file_info = next((f for f in all_files if f['path'] == file_path), None)
            
            if file_info:
                # Load content from B2 if file_key exists
                content = None
                if file_info.get('file_key'):
                    try:
                        content = await b2_storage_service.download_file_content(file_info['file_key'])
                    except Exception as e:
                        logger.warning(f"Failed to load content for {file_path}: {str(e)}")
                
                context.append({
                    'path': file_path,
                    'name': file_info.get('name', ''),
                    'content': content or '',
                    'summary': file_info.get('summary', ''),
                    'relevance_score': self._calculate_node_relevance(file_path, nodes)
                })
        
        # Sort by relevance
        context.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return context
    
    def _calculate_node_relevance(self, file_path: str, nodes: List[Dict[str, Any]]) -> float:
        """Calculate relevance score based on node distance and matches."""
        relevance = 0.0
        matches = 0
        
        for node in nodes:
            if node.get('path') == file_path:
                matches += 1
                # Closer nodes are more relevant
                distance = node.get('distance', 3)
                relevance += 1.0 / (distance + 1)
        
        return relevance
    
    async def delete_repository_graph(self, repository_id: str) -> int:
        """Delete entire repository graph."""
        query = """
        MATCH (n {repository_id: $repository_id})
        DETACH DELETE n
        RETURN count(n) as deleted_count
        """
        
        async with self.driver.session() as session:
            result = await session.run(query, repository_id=repository_id)
            record = await result.single()
            count = record['deleted_count'] if record else 0
            logger.info(f"Deleted {count} nodes for repository {repository_id}")
            return count
    
    async def get_repository_stats(self, repository_id: str) -> Dict[str, int]:
        """Get statistics about repository graph."""
        query = """
        MATCH (r:Repository {repository_id: $repository_id})
        OPTIONAL MATCH (r)-[:CONTAINS]->(f:File)
        OPTIONAL MATCH (f)-[:CONTAINS]->(fn:Function)
        OPTIONAL MATCH (f)-[:CONTAINS]->(c:Class)
        OPTIONAL MATCH (f)-[:IMPORTS]->(m:Module)
        RETURN 
            count(DISTINCT f) as file_count,
            count(DISTINCT fn) as function_count,
            count(DISTINCT c) as class_count,
            count(DISTINCT m) as module_count
        """
        
        async with self.driver.session() as session:
            result = await session.run(query, repository_id=repository_id)
            record = await result.single()
            
            if record:
                return {
                    'files': record['file_count'],
                    'functions': record['function_count'],
                    'classes': record['class_count'],
                    'modules': record['module_count']
                }
            return {'files': 0, 'functions': 0, 'classes': 0, 'modules': 0}
    
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._connected and self.driver is not None


# Global Neo4j client instance
neo4j_client = Neo4jClient()
