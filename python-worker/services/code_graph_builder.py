"""
Code Graph Builder - Parses code and builds graph structure in Neo4j.
Analyzes code structure, relationships, and dependencies.
"""
import ast
import re
from typing import Dict, Any, List, Optional, Set
from pathlib import Path

from services.neo4j_client import neo4j_client
from utils.logger import get_logger

logger = get_logger(__name__)


class CodeGraphBuilder:
    """
    Builds code graph by analyzing source code structure.
    Supports Python, JavaScript/TypeScript, and other languages.
    """
    
    def __init__(self):
        self.supported_languages = {
            '.py': self._parse_python,
            '.js': self._parse_javascript,
            '.ts': self._parse_typescript,
            '.jsx': self._parse_javascript,
            '.tsx': self._parse_typescript,
        }
    
    async def build_repository_graph(
        self,
        repository_id: str,
        repository_metadata: Dict[str, Any],
        files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build complete graph for a repository.
        
        Args:
            repository_id: Repository identifier
            repository_metadata: Repository metadata (name, url, etc.)
            files: List of files with content
            
        Returns:
            Dictionary with graph statistics
        """
        logger.info(f"Building code graph for repository: {repository_id}")
        
        # Create repository node
        await neo4j_client.create_repository_node(repository_id, repository_metadata)
        
        stats = {
            'files_processed': 0,
            'functions_found': 0,
            'classes_found': 0,
            'imports_found': 0,
            'relationships_created': 0,
            'errors': 0
        }
        
        # Process each file
        for file_info in files:
            try:
                await self._process_file(repository_id, file_info, stats)
            except Exception as e:
                logger.error(f"Error processing file {file_info.get('path')}: {str(e)}")
                stats['errors'] += 1
        
        logger.info(f"Graph building completed for {repository_id}", **stats)
        
        return stats
    
    async def _process_file(
        self,
        repository_id: str,
        file_info: Dict[str, Any],
        stats: Dict[str, Any]
    ) -> None:
        """Process a single file and add to graph."""
        file_path = file_info.get('path', '')
        content = file_info.get('content', '')
        
        if not content:
            logger.debug(f"Skipping empty file: {file_path}")
            return
        
        # Create file node
        file_metadata = {
            'name': file_info.get('name', Path(file_path).name),
            'extension': Path(file_path).suffix,
            'content_summary': content[:500] if len(content) > 500 else content,
            'size': len(content),
            'language': file_info.get('language', '')
        }
        
        await neo4j_client.create_file_node(repository_id, file_path, file_metadata)
        stats['files_processed'] += 1
        
        # Parse file based on extension
        extension = Path(file_path).suffix
        parser = self.supported_languages.get(extension)
        
        if parser:
            parsed_data = parser(content, file_path)
            
            # Create function nodes
            for func_data in parsed_data.get('functions', []):
                await neo4j_client.create_function_node(repository_id, file_path, func_data)
                stats['functions_found'] += 1
            
            # Create class nodes
            for class_data in parsed_data.get('classes', []):
                await neo4j_client.create_class_node(repository_id, file_path, class_data)
                stats['classes_found'] += 1
                
                # Create inheritance relationships
                for base_class in class_data.get('base_classes', []):
                    try:
                        await neo4j_client.create_inheritance_relationship(
                            repository_id,
                            class_data['qualified_name'],
                            base_class
                        )
                        stats['relationships_created'] += 1
                    except:
                        pass  # Base class might not be in this repo
            
            # Create import relationships
            for import_info in parsed_data.get('imports', []):
                await neo4j_client.create_import_relationship(
                    repository_id,
                    file_path,
                    import_info['module'],
                    import_info.get('type', 'IMPORTS')
                )
                stats['imports_found'] += 1
            
            # Create call relationships
            for call_info in parsed_data.get('calls', []):
                try:
                    await neo4j_client.create_call_relationship(
                        repository_id,
                        call_info['caller'],
                        call_info['callee'],
                        call_info.get('context')
                    )
                    stats['relationships_created'] += 1
                except:
                    pass  # Callee might not be in this repo
    
    def _parse_python(self, content: str, file_path: str) -> Dict[str, Any]:
        """Parse Python code using AST."""
        try:
            tree = ast.parse(content)
            
            functions = []
            classes = []
            imports = []
            calls = []
            
            # Extract functions
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_data = self._extract_python_function(node, file_path)
                    functions.append(func_data)
                    
                    # Extract function calls within this function
                    for child in ast.walk(node):
                        if isinstance(child, ast.Call):
                            call_info = self._extract_python_call(child, func_data['qualified_name'])
                            if call_info:
                                calls.append(call_info)
                
                elif isinstance(node, ast.ClassDef):
                    class_data = self._extract_python_class(node, file_path)
                    classes.append(class_data)
                
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    import_data = self._extract_python_import(node)
                    imports.extend(import_data)
            
            return {
                'functions': functions,
                'classes': classes,
                'imports': imports,
                'calls': calls
            }
            
        except SyntaxError as e:
            logger.warning(f"Python syntax error in {file_path}: {str(e)}")
            return {'functions': [], 'classes': [], 'imports': [], 'calls': []}
        except Exception as e:
            logger.error(f"Error parsing Python file {file_path}: {str(e)}")
            return {'functions': [], 'classes': [], 'imports': [], 'calls': []}
    
    def _extract_python_function(self, node: ast.FunctionDef, file_path: str) -> Dict[str, Any]:
        """Extract function information from AST node."""
        # Get function signature
        args = [arg.arg for arg in node.args.args]
        signature = f"{node.name}({', '.join(args)})"
        
        # Get return type if annotated
        return_type = ''
        if node.returns:
            return_type = ast.unparse(node.returns) if hasattr(ast, 'unparse') else str(node.returns)
        
        # Get docstring
        description = ast.get_docstring(node) or ''
        
        # Calculate complexity (simple heuristic)
        complexity = self._calculate_complexity(node)
        
        return {
            'name': node.name,
            'qualified_name': f"{file_path}::{node.name}",
            'signature': signature,
            'description': description,
            'start_line': node.lineno,
            'end_line': node.end_lineno or node.lineno,
            'complexity': complexity,
            'is_async': isinstance(node, ast.AsyncFunctionDef),
            'parameters': args,
            'return_type': return_type
        }
    
    def _extract_python_class(self, node: ast.ClassDef, file_path: str) -> Dict[str, Any]:
        """Extract class information from AST node."""
        # Get base classes
        base_classes = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                base_classes.append(base.id)
            elif isinstance(base, ast.Attribute):
                base_classes.append(ast.unparse(base) if hasattr(ast, 'unparse') else str(base))
        
        # Get methods
        methods = [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
        
        # Get attributes (simple extraction from __init__)
        attributes = []
        for item in node.body:
            if isinstance(item, ast.FunctionDef) and item.name == '__init__':
                for stmt in item.body:
                    if isinstance(stmt, ast.Assign):
                        for target in stmt.targets:
                            if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
                                if target.value.id == 'self':
                                    attributes.append(target.attr)
        
        return {
            'name': node.name,
            'qualified_name': f"{file_path}::{node.name}",
            'description': ast.get_docstring(node) or '',
            'start_line': node.lineno,
            'end_line': node.end_lineno or node.lineno,
            'base_classes': base_classes,
            'methods': methods,
            'attributes': attributes
        }
    
    def _extract_python_import(self, node) -> List[Dict[str, str]]:
        """Extract import information."""
        imports = []
        
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append({
                    'module': alias.name,
                    'type': 'IMPORTS',
                    'alias': alias.asname or alias.name
                })
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ''
            for alias in node.names:
                imports.append({
                    'module': f"{module}.{alias.name}" if module else alias.name,
                    'type': 'IMPORTS_FROM',
                    'alias': alias.asname or alias.name
                })
        
        return imports
    
    def _extract_python_call(self, node: ast.Call, caller_qualified_name: str) -> Optional[Dict[str, str]]:
        """Extract function call information."""
        callee_name = None
        
        if isinstance(node.func, ast.Name):
            callee_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            callee_name = ast.unparse(node.func) if hasattr(ast, 'unparse') else str(node.func)
        
        if callee_name:
            return {
                'caller': caller_qualified_name,
                'callee': callee_name,
                'context': f"line_{node.lineno}"
            }
        
        return None
    
    def _calculate_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate cyclomatic complexity (simplified)."""
        complexity = 1  # Base complexity
        
        for child in ast.walk(node):
            # Count decision points
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _parse_javascript(self, content: str, file_path: str) -> Dict[str, Any]:
        """Parse JavaScript/JSX code using regex patterns."""
        # This is a simplified parser - for production, use a proper JS parser like esprima
        functions = []
        imports = []
        
        # Extract function declarations
        func_pattern = r'function\s+(\w+)\s*\(([^)]*)\)'
        for match in re.finditer(func_pattern, content):
            functions.append({
                'name': match.group(1),
                'qualified_name': f"{file_path}::{match.group(1)}",
                'signature': f"{match.group(1)}({match.group(2)})",
                'description': '',
                'start_line': content[:match.start()].count('\n') + 1,
                'end_line': 0,
                'complexity': 1,
                'is_async': 'async' in content[max(0, match.start()-10):match.start()],
                'parameters': [p.strip() for p in match.group(2).split(',') if p.strip()],
                'return_type': ''
            })
        
        # Extract arrow functions assigned to variables
        arrow_pattern = r'const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>'
        for match in re.finditer(arrow_pattern, content):
            functions.append({
                'name': match.group(1),
                'qualified_name': f"{file_path}::{match.group(1)}",
                'signature': match.group(0),
                'description': '',
                'start_line': content[:match.start()].count('\n') + 1,
                'end_line': 0,
                'complexity': 1,
                'is_async': 'async' in match.group(0),
                'parameters': [],
                'return_type': ''
            })
        
        # Extract imports
        import_pattern = r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]'
        for match in re.finditer(import_pattern, content):
            imports.append({
                'module': match.group(1),
                'type': 'IMPORTS',
                'alias': ''
            })
        
        return {
            'functions': functions,
            'classes': [],
            'imports': imports,
            'calls': []
        }
    
    def _parse_typescript(self, content: str, file_path: str) -> Dict[str, Any]:
        """Parse TypeScript/TSX code."""
        # Use same logic as JavaScript for now
        # In production, use a TypeScript-specific parser
        return self._parse_javascript(content, file_path)


# Global instance
code_graph_builder = CodeGraphBuilder()
