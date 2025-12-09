"""
Smart Code Locator - Finds exact locations for code changes using AST analysis
"""
import ast
import re
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from utils.logger import get_logger

logger = get_logger(__name__)


class SmartCodeLocator:
    """Uses AST and semantic analysis to find exact code locations."""
    
    def __init__(self, neo4j_client, qdrant_client):
        self.neo4j = neo4j_client
        self.qdrant = qdrant_client
        
    async def find_relevant_code_locations(
        self,
        issue_requirements: List[str],
        codebase_analysis: Dict[str, Any],
        repository_id: str
    ) -> Dict[str, Any]:
        """
        Find ALL relevant code locations for implementing the requirements.
        
        Returns:
            - Files to modify (with exact line ranges)
            - Related files (dependencies, imports)
            - Suggested file locations for new files
            - Integration points
        """
        
        logger.info(f"Finding code locations for {len(issue_requirements)} requirements")
        
        locations = {
            "files_to_modify": [],
            "related_files": [],
            "suggested_new_file_locations": [],
            "integration_points": [],
            "dependency_updates_needed": []
        }
        
        # For each requirement, find relevant code
        for req in issue_requirements:
            req_locations = await self._find_locations_for_requirement(
                req, codebase_analysis, repository_id
            )
            
            locations["files_to_modify"].extend(req_locations.get("modify", []))
            locations["related_files"].extend(req_locations.get("related", []))
            locations["suggested_new_file_locations"].extend(req_locations.get("new", []))
            locations["integration_points"].extend(req_locations.get("integration", []))
        
        # Deduplicate
        locations = self._deduplicate_locations(locations)
        
        # Analyze dependencies
        locations["dependency_updates_needed"] = await self._analyze_dependency_impact(
            issue_requirements, codebase_analysis
        )
        
        logger.info(f"Found {len(locations['files_to_modify'])} files to modify, "
                   f"{len(locations['suggested_new_file_locations'])} new file locations")
        
        return locations
    
    async def _find_locations_for_requirement(
        self,
        requirement: str,
        codebase_analysis: Dict[str, Any],
        repository_id: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Find code locations for a single requirement."""
        
        locations = {
            "modify": [],
            "related": [],
            "new": [],
            "integration": []
        }
        
        # Use Neo4j to find related code via graph
        graph_results = await self._find_via_code_graph(requirement, repository_id)
        locations["modify"].extend(graph_results.get("modify", []))
        locations["related"].extend(graph_results.get("related", []))
        
        # Use Qdrant for semantic search
        semantic_results = await self._find_via_semantic_search(requirement, repository_id)
        locations["related"].extend(semantic_results)
        
        # Analyze requirement keywords to suggest file structure
        new_file_suggestions = self._suggest_new_file_locations(requirement, codebase_analysis)
        locations["new"].extend(new_file_suggestions)
        
        # Find integration points
        integration = self._find_integration_points(requirement, codebase_analysis)
        locations["integration"].extend(integration)
        
        return locations
    
    async def _find_via_code_graph(
        self,
        requirement: str,
        repository_id: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Use Neo4j code graph to find related code."""
        
        # Extract key entities from requirement
        entities = self._extract_entities(requirement)
        
        results = {"modify": [], "related": []}
        
        try:
            # Search for functions/classes matching entities
            for entity in entities:
                query = """
                MATCH (r:Repository {repository_id: $repo_id})
                MATCH (r)-[:CONTAINS_FILE]->(f:File)
                MATCH (f)-[:DEFINES]->(node)
                WHERE node.name CONTAINS $entity
                   OR node.description CONTAINS $entity
                RETURN f.path as file_path, 
                       node.name as entity_name,
                       node.type as entity_type,
                       node.start_line as start_line,
                       node.end_line as end_line
                LIMIT 10
                """
                
                graph_results = await self.neo4j.run_query(
                    query,
                    {"repo_id": repository_id, "entity": entity}
                )
                
                for record in graph_results:
                    results["modify"].append({
                        "file_path": record["file_path"],
                        "entity_name": record["entity_name"],
                        "entity_type": record["entity_type"],
                        "line_range": (record["start_line"], record["end_line"]),
                        "reason": f"Contains '{entity}' mentioned in requirement"
                    })
            
            # Find files that import/depend on these files
            if results["modify"]:
                modified_files = [r["file_path"] for r in results["modify"]]
                
                query = """
                MATCH (f1:File)-[:IMPORTS]->(f2:File)
                WHERE f2.path IN $modified_files
                RETURN DISTINCT f1.path as dependent_file
                LIMIT 20
                """
                
                dependent_results = await self.neo4j.run_query(
                    query,
                    {"modified_files": modified_files}
                )
                
                for record in dependent_results:
                    results["related"].append({
                        "file_path": record["dependent_file"],
                        "relationship": "imports_modified_file",
                        "may_need_update": True
                    })
        
        except Exception as e:
            logger.warning(f"Code graph search failed: {str(e)}")
        
        return results
    
    async def _find_via_semantic_search(
        self,
        requirement: str,
        repository_id: str
    ) -> List[Dict[str, Any]]:
        """Use Qdrant semantic search to find relevant code."""
        
        try:
            results = await self.qdrant.search(
                collection_name="gittldr_embeddings",
                query_text=requirement,
                filter_conditions={"repository_id": repository_id},
                limit=10
            )
            
            semantic_files = []
            for result in results:
                semantic_files.append({
                    "file_path": result.get("file_path"),
                    "score": result.get("score"),
                    "content_preview": result.get("content", "")[:200],
                    "reason": "Semantically similar to requirement"
                })
            
            return semantic_files
        
        except Exception as e:
            logger.warning(f"Semantic search failed: {str(e)}")
            return []
    
    def _extract_entities(self, requirement: str) -> List[str]:
        """Extract key entities from requirement text."""
        
        # Remove common words
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
                     "add", "create", "implement", "update", "modify", "should", "must"}
        
        # Extract words that are likely entities
        words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', requirement)
        entities = [w.lower() for w in words if w.lower() not in stop_words and len(w) > 3]
        
        # Also extract camelCase/PascalCase as entities
        entities.extend(re.findall(r'\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b', requirement))
        
        return list(set(entities))[:10]  # Limit to top 10
    
    def _suggest_new_file_locations(
        self,
        requirement: str,
        codebase_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Suggest where new files should be created."""
        
        suggestions = []
        
        # Analyze requirement to understand what type of file is needed
        req_lower = requirement.lower()
        
        # Get project structure
        structure = codebase_analysis.get("structure", {})
        src_loc = structure.get("src_location", "src/")
        
        # API endpoint suggestions
        if any(word in req_lower for word in ["endpoint", "api", "route", "handler"]):
            suggestions.append({
                "type": "api_handler",
                "suggested_path": f"{src_loc}api/" or "api/",
                "naming_convention": "snake_case",
                "reason": "API endpoint mentioned in requirement"
            })
        
        # Service/business logic suggestions
        if any(word in req_lower for word in ["service", "logic", "process", "handle"]):
            suggestions.append({
                "type": "service",
                "suggested_path": f"{src_loc}services/" or "services/",
                "naming_convention": "snake_case",
                "reason": "Service logic mentioned"
            })
        
        # Model/schema suggestions
        if any(word in req_lower for word in ["model", "schema", "entity", "data"]):
            suggestions.append({
                "type": "model",
                "suggested_path": f"{src_loc}models/" or "models/",
                "naming_convention": "PascalCase",
                "reason": "Data model mentioned"
            })
        
        # Utility/helper suggestions
        if any(word in req_lower for word in ["utility", "helper", "util", "tool"]):
            suggestions.append({
                "type": "utility",
                "suggested_path": f"{src_loc}utils/" or "utils/",
                "naming_convention": "snake_case",
                "reason": "Utility function mentioned"
            })
        
        # Documentation suggestions
        if any(word in req_lower for word in ["document", "readme", "guide", "doc"]):
            suggestions.append({
                "type": "documentation",
                "suggested_path": "docs/",
                "naming_convention": "kebab-case",
                "reason": "Documentation mentioned"
            })
        
        # Test suggestions
        if any(word in req_lower for word in ["test", "spec", "verify"]):
            test_loc = structure.get("test_location", "tests/")
            suggestions.append({
                "type": "test",
                "suggested_path": test_loc,
                "naming_convention": "test_snake_case",
                "reason": "Testing mentioned"
            })
        
        return suggestions
    
    def _find_integration_points(
        self,
        requirement: str,
        codebase_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Find where the new code needs to integrate with existing code."""
        
        integration_points = []
        
        # If it's an API endpoint, it needs to integrate with routing
        if "endpoint" in requirement.lower() or "api" in requirement.lower():
            entry_points = codebase_analysis.get("entry_points", [])
            for entry_point in entry_points:
                if "route" in entry_point.lower() or "api" in entry_point.lower():
                    integration_points.append({
                        "file": entry_point,
                        "type": "routing",
                        "action": "register_new_route",
                        "reason": "Need to register new API endpoint"
                    })
        
        # If adding dependencies, need to update config
        if any(word in requirement.lower() for word in ["install", "dependency", "library", "package"]):
            integration_points.append({
                "file": "requirements.txt" or "package.json",
                "type": "dependency",
                "action": "add_dependency",
                "reason": "New dependencies needed"
            })
        
        return integration_points
    
    async def _analyze_dependency_impact(
        self,
        requirements: List[str],
        codebase_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Determine what dependency updates are needed."""
        
        dependency_updates = []
        
        # Check each requirement for dependency keywords
        for req in requirements:
            req_lower = req.lower()
            
            # Common Python libraries
            if "websocket" in req_lower:
                dependency_updates.append({
                    "package": "websockets",
                    "language": "python",
                    "version": ">=12.0",
                    "reason": "WebSocket functionality required"
                })
            
            if "audio" in req_lower or "transcription" in req_lower:
                dependency_updates.append({
                    "package": "openai-whisper",
                    "language": "python",
                    "reason": "Audio transcription required"
                })
            
            # JavaScript/TypeScript
            if "react" in req_lower and "React" not in codebase_analysis.get("frameworks", []):
                dependency_updates.append({
                    "package": "react",
                    "language": "javascript",
                    "reason": "React framework needed"
                })
        
        return dependency_updates
    
    def _deduplicate_locations(self, locations: Dict[str, List]) -> Dict[str, List]:
        """Remove duplicate location suggestions."""
        
        for key in locations:
            if isinstance(locations[key], list):
                # Remove duplicates while preserving order
                seen = set()
                unique_list = []
                for item in locations[key]:
                    # Create a hashable representation
                    item_key = str(sorted(item.items())) if isinstance(item, dict) else str(item)
                    if item_key not in seen:
                        seen.add(item_key)
                        unique_list.append(item)
                locations[key] = unique_list
        
        return locations
    
    async def find_exact_modification_points(
        self,
        file_path: str,
        file_content: str,
        modification_intent: str
    ) -> List[Dict[str, Any]]:
        """
        Use AST to find exact line numbers where modifications should happen.
        
        For example:
        - "Add new route" -> Find router definition, suggest line after last route
        - "Add new method" -> Find class definition, suggest line before closing brace
        - "Add import" -> Find import section, suggest line after last import
        """
        
        if not file_path.endswith(".py"):
            # For non-Python files, use regex-based analysis
            return self._find_modification_points_regex(file_content, modification_intent)
        
        modification_points = []
        
        try:
            tree = ast.parse(file_content)
            
            intent_lower = modification_intent.lower()
            
            # Find imports section
            if "import" in intent_lower or "dependency" in intent_lower:
                imports = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom))]
                if imports:
                    last_import = imports[-1]
                    modification_points.append({
                        "type": "import",
                        "line": last_import.end_lineno,
                        "suggestion": "Add new import after this line",
                        "context": ast.get_source_segment(file_content, last_import) if hasattr(ast, 'get_source_segment') else ""
                    })
            
            # Find class definitions
            if "class" in intent_lower or "method" in intent_lower:
                classes = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
                for cls in classes:
                    modification_points.append({
                        "type": "class",
                        "name": cls.name,
                        "line": cls.lineno,
                        "end_line": cls.end_lineno,
                        "methods": [m.name for m in cls.body if isinstance(m, ast.FunctionDef)],
                        "suggestion": f"Add new method to class {cls.name}"
                    })
            
            # Find function definitions
            if "function" in intent_lower or "def" in intent_lower:
                functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                for func in functions:
                    modification_points.append({
                        "type": "function",
                        "name": func.name,
                        "line": func.lineno,
                        "end_line": func.end_lineno,
                        "suggestion": f"Modify or add near function {func.name}"
                    })
        
        except SyntaxError as e:
            logger.warning(f"Could not parse {file_path}: {str(e)}")
        
        return modification_points
    
    def _find_modification_points_regex(
        self,
        file_content: str,
        modification_intent: str
    ) -> List[Dict[str, Any]]:
        """Regex-based modification point finding for non-Python files."""
        
        points = []
        lines = file_content.split("\n")
        
        # Find function definitions (JavaScript/TypeScript)
        for i, line in enumerate(lines, 1):
            if re.match(r'^\s*(function|const|let|var)\s+\w+.*\{', line):
                points.append({
                    "type": "function",
                    "line": i,
                    "content": line.strip()
                })
            
            # Find class definitions
            if re.match(r'^\s*class\s+\w+', line):
                points.append({
                    "type": "class",
                    "line": i,
                    "content": line.strip()
                })
        
        return points
