"""
Function Inventory Extractor - Phase 1 of Two-Phase Generation
================================================================

Extracts all callable functions, classes, and imports from retrieved files
to constrain LLM generation and prevent undefined function calls.

Part of the solution to eliminate AI hallucination.
"""

import ast
import re
from typing import List, Dict, Any, Set
from dataclasses import asdict
from utils.logger import get_logger

logger = get_logger(__name__)


class FunctionExtractor:
    """Extract function inventory from retrieved code files."""
    
    PYTHON_BUILTINS = {
        'print', 'len', 'range', 'str', 'int', 'float', 'dict', 'list', 'set',
        'open', 'input', 'sum', 'min', 'max', 'sorted', 'enumerate', 'zip',
        'isinstance', 'hasattr', 'getattr', 'setattr', 'type', 'dir', 'vars'
    }
    
    def extract_inventory(self, files: List[Any]) -> Dict[str, Any]:
        """
        Extract function inventory from retrieved files.
        
        Args:
            files: List of RetrievedFile objects or dicts with 'path', 'content', 'language'
            
        Returns:
            {
                'functions': ['func1', 'func2', ...],
                'classes': ['Class1', 'Class2', ...],
                'imports': ['module1', 'module2', ...],
                'by_file': {
                    'file1.py': {
                        'functions': [...],
                        'classes': [...],
                        'imports': [...]
                    }
                },
                'total_files': int
            }
        """
        all_functions = set()
        all_classes = set()
        all_imports = set()
        by_file = {}
        
        for file_obj in files:
            # Handle both RetrievedFile objects and plain dicts
            if hasattr(file_obj, 'path'):
                path = file_obj.path
                content = file_obj.content if hasattr(file_obj, 'content') else file_obj.page_content
                language = file_obj.language if hasattr(file_obj, 'language') else 'unknown'
            else:
                path = file_obj.get('path', 'unknown')
                content = file_obj.get('content', '')
                language = file_obj.get('language', 'unknown')
            
            if not content:
                continue
            
            # Extract based on language
            if language == 'python' or path.endswith('.py'):
                file_inventory = self._extract_python(content)
            elif language in ['javascript', 'typescript'] or path.endswith(('.js', '.ts', '.jsx', '.tsx')):
                file_inventory = self._extract_javascript(content)
            else:
                file_inventory = {'functions': [], 'classes': [], 'imports': []}
            
            # Accumulate
            all_functions.update(file_inventory['functions'])
            all_classes.update(file_inventory['classes'])
            all_imports.update(file_inventory['imports'])
            by_file[path] = file_inventory
        
        logger.info(f"📦 Function inventory extracted: {len(all_functions)} functions, {len(all_classes)} classes from {len(files)} files")
        
        return {
            'functions': sorted(list(all_functions)),
            'classes': sorted(list(all_classes)),
            'imports': sorted(list(all_imports)),
            'by_file': by_file,
            'total_files': len(files)
        }
    
    def _extract_python(self, content: str) -> Dict[str, List[str]]:
        """Extract functions/classes from Python code using AST."""
        functions = []
        classes = []
        imports = []
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.AsyncFunctionDef):
                    functions.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    classes.append(node.name)
                    # Also extract methods from classes
                    for item in node.body:
                        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            functions.append(f"{node.name}.{item.name}")
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module)
                        
        except SyntaxError as e:
            logger.warning(f"Failed to parse Python code: {e}")
        except Exception as e:
            logger.warning(f"Error extracting Python inventory: {e}")
        
        return {
            'functions': functions,
            'classes': classes,
            'imports': imports
        }
    
    def _extract_javascript(self, content: str) -> Dict[str, List[str]]:
        """Extract functions/classes from JavaScript/TypeScript using regex."""
        functions = []
        classes = []
        imports = []
        
        # Function patterns
        # function myFunc() {...}
        func_pattern1 = r'function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\('
        # const myFunc = () => {...}
        func_pattern2 = r'(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>'
        # myFunc: function() {...}
        func_pattern3 = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s*)?function\s*\('
        # async function myFunc() {...}
        func_pattern4 = r'async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\('
        
        # Class pattern
        # class MyClass {...}
        class_pattern = r'class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)'
        
        # Import patterns
        # import { x } from 'module'
        import_pattern1 = r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]'
        # const x = require('module')
        import_pattern2 = r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        
        # Extract functions
        functions.extend(re.findall(func_pattern1, content))
        functions.extend(re.findall(func_pattern2, content))
        functions.extend(re.findall(func_pattern3, content))
        functions.extend(re.findall(func_pattern4, content))
        
        # Extract classes
        classes.extend(re.findall(class_pattern, content))
        
        # Extract imports
        imports.extend(re.findall(import_pattern1, content))
        imports.extend(re.findall(import_pattern2, content))
        
        return {
            'functions': list(set(functions)),  # Remove duplicates
            'classes': list(set(classes)),
            'imports': list(set(imports))
        }
    
    def get_function_signatures(self, files: List[Any], max_functions: int = 50) -> List[str]:
        """
        Get simplified function signatures for LLM prompts.
        
        Returns list like: ['transcribe_audio_batch()', 'process_result()', ...]
        """
        inventory = self.extract_inventory(files)
        signatures = []
        
        # Add functions
        for func in inventory['functions'][:max_functions]:
            signatures.append(f"{func}()")
        
        # Add classes with constructor
        for cls in inventory['classes'][:20]:
            signatures.append(f"{cls}()")
        
        return signatures


# Global instance
function_extractor = FunctionExtractor()
