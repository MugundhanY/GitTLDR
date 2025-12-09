"""
GitHub Tools for LLM Function Calling
=====================================

Provides tools for dynamic code search without pre-indexing.
Used by AI agents to explore codebase on-demand.
"""
import os
import json
import subprocess
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path

from services.database_service import database_service
from utils.logger import get_logger

logger = get_logger(__name__)


class GitHubTools:
    """Tools for LLM to search codebase dynamically."""
    
    @staticmethod
    async def search_github_code(
        repository_id: str,
        query: str,
        path: Optional[str] = None,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search for code using ripgrep.
        
        Args:
            repository_id: Repository ID
            query: Search query (keywords, function names, etc.)
            path: Optional path filter (e.g., "src/")
            max_results: Maximum number of results
        
        Returns:
            List of matching files with code snippets
        """
        logger.info(f"🔍 Searching for: '{query}' in repo {repository_id}")
        
        # Get repo clone path
        repo = await database_service.get_repository(repository_id)
        clone_path = repo.get('local_clone_path')
        
        if not clone_path or not os.path.exists(clone_path):
            logger.warning(f"Repository {repository_id} not cloned locally")
            return []
        
        # Use ripgrep for fast search
        cmd = [
            'rg',
            '--json',
            '--max-count', str(max_results),
            '--context', '3',  # Show 3 lines of context
            '--ignore-case',   # Case insensitive
            query
        ]
        
        if path:
            cmd.extend(['--glob', f'{path}/**'])
        
        try:
            result = subprocess.run(
                cmd,
                cwd=clone_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Parse ripgrep JSON output
            matches = []
            for line in result.stdout.split('\n'):
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if data.get('type') == 'match':
                        match_data = data.get('data', {})
                        matches.append({
                            'path': match_data.get('path', {}).get('text', ''),
                            'line_number': match_data.get('line_number', 0),
                            'content': match_data.get('lines', {}).get('text', '').strip()
                        })
                except Exception as e:
                    logger.debug(f"Failed to parse ripgrep line: {e}")
            
            logger.info(f"✅ Found {len(matches)} matches for '{query}'")
            return matches
            
        except subprocess.TimeoutExpired:
            logger.warning(f"Search timed out for query: {query}")
            return []
        except FileNotFoundError:
            logger.error("ripgrep (rg) not found. Install with: choco install ripgrep")
            # Fallback to basic grep
            return await GitHubTools._fallback_search(clone_path, query)
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    @staticmethod
    async def _fallback_search(clone_path: str, query: str) -> List[Dict[str, Any]]:
        """Fallback search using Python when ripgrep is not available."""
        logger.info(f"Using fallback search for: {query}")
        matches = []
        
        try:
            for root, dirs, files in os.walk(clone_path):
                # Skip common ignore patterns
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'venv', '.venv']]
                
                for file in files:
                    # Only search code files
                    if not any(file.endswith(ext) for ext in ['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.c', '.cpp', '.h']):
                        continue
                    
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, clone_path)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            for line_num, line in enumerate(f, 1):
                                if query.lower() in line.lower():
                                    matches.append({
                                        'path': rel_path,
                                        'line_number': line_num,
                                        'content': line.strip()
                                    })
                                    if len(matches) >= 50:
                                        return matches
                    except Exception as e:
                        logger.debug(f"Failed to read {file_path}: {e}")
            
            return matches
        except Exception as e:
            logger.error(f"Fallback search failed: {e}")
            return []
    
    @staticmethod
    async def grep_repository(
        repository_id: str,
        pattern: str,
        regex: bool = False,
        file_pattern: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Grep for pattern across repository.
        
        Args:
            repository_id: Repository ID
            pattern: Search pattern
            regex: Whether pattern is regex
            file_pattern: Optional file pattern (e.g., "*.py")
            max_results: Maximum number of results
        
        Returns:
            List of matches with file, line, and content
        """
        logger.info(f"🔍 Grepping for: '{pattern}' (regex={regex})")
        
        repo = await database_service.get_repository(repository_id)
        clone_path = repo.get('local_clone_path')
        
        if not clone_path or not os.path.exists(clone_path):
            logger.warning(f"Repository {repository_id} not cloned locally")
            return []
        
        cmd = ['rg', '--json', '--max-count', str(max_results)]
        
        if not regex:
            cmd.append('--fixed-strings')
        
        if file_pattern:
            cmd.extend(['--glob', file_pattern])
        
        cmd.append(pattern)
        
        try:
            result = subprocess.run(
                cmd,
                cwd=clone_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            matches = []
            for line in result.stdout.split('\n'):
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if data.get('type') == 'match':
                        match_data = data.get('data', {})
                        matches.append({
                            'path': match_data.get('path', {}).get('text', ''),
                            'line_number': match_data.get('line_number', 0),
                            'content': match_data.get('lines', {}).get('text', '').strip()
                        })
                except Exception as e:
                    logger.debug(f"Failed to parse line: {e}")
            
            logger.info(f"✅ Found {len(matches)} matches")
            return matches
            
        except FileNotFoundError:
            logger.error("ripgrep not found, using fallback")
            return await GitHubTools._fallback_search(clone_path, pattern)
        except Exception as e:
            logger.error(f"Grep failed: {e}")
            return []
    
    @staticmethod
    async def get_file(
        repository_id: str,
        path: str
    ) -> Dict[str, Any]:
        """
        Read file contents.
        
        Args:
            repository_id: Repository ID
            path: File path (relative to repo root)
        
        Returns:
            File contents with metadata
        """
        logger.info(f"📄 Reading file: {path}")
        
        repo = await database_service.get_repository(repository_id)
        clone_path = repo.get('local_clone_path')
        
        if not clone_path:
            raise FileNotFoundError(f"Repository {repository_id} not cloned locally")
        
        file_path = os.path.join(clone_path, path)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Detect language from extension
            extension = path.split('.')[-1] if '.' in path else 'txt'
            language_map = {
                'py': 'python',
                'js': 'javascript',
                'ts': 'typescript',
                'tsx': 'typescript',
                'jsx': 'javascript',
                'java': 'java',
                'go': 'go',
                'rs': 'rust',
                'c': 'c',
                'cpp': 'cpp',
                'h': 'c',
                'hpp': 'cpp'
            }
            language = language_map.get(extension, extension)
            
            logger.info(f"✅ Read {len(content)} bytes from {path}")
            
            return {
                'path': path,
                'content': content,
                'language': language,
                'lines': len(content.split('\n')),
                'size': len(content)
            }
        except Exception as e:
            logger.error(f"Failed to read {path}: {e}")
            raise
    
    @staticmethod
    async def find_symbol(
        repository_id: str,
        symbol_name: str,
        symbol_type: str = 'any'  # class, function, variable, any
    ) -> List[Dict[str, Any]]:
        """
        Find symbol definition (class, function, variable).
        
        Args:
            repository_id: Repository ID
            symbol_name: Symbol name to find
            symbol_type: Type of symbol (class, function, variable, any)
        
        Returns:
            List of symbol locations
        """
        logger.info(f"🔍 Finding symbol: {symbol_name} (type: {symbol_type})")
        
        # Build regex based on symbol type
        patterns = {
            'class': rf'class\s+{symbol_name}\s*[\:\(]',
            'function': rf'(def|function|func|fn)\s+{symbol_name}\s*[\(\:]',
            'variable': rf'(let|const|var)?\s*{symbol_name}\s*[=:]',
            'any': rf'(class|def|function|func|fn|let|const|var)?\s*{symbol_name}'
        }
        
        pattern = patterns.get(symbol_type, patterns['any'])
        
        # Use grep_repository with regex
        return await GitHubTools.grep_repository(
            repository_id=repository_id,
            pattern=pattern,
            regex=True
        )
    
    @staticmethod
    async def list_files(
        repository_id: str,
        pattern: str = '*',
        max_results: int = 1000
    ) -> List[str]:
        """
        List files matching pattern.
        
        Args:
            repository_id: Repository ID
            pattern: Glob pattern (e.g., "test_*.py", "*.js")
            max_results: Maximum number of results
        
        Returns:
            List of file paths
        """
        logger.info(f"📁 Listing files matching: {pattern}")
        
        repo = await database_service.get_repository(repository_id)
        clone_path = repo.get('local_clone_path')
        
        if not clone_path or not os.path.exists(clone_path):
            logger.warning(f"Repository {repository_id} not cloned locally")
            return []
        
        try:
            # Try using fd (fast find) if available
            result = subprocess.run(
                ['fd', '--type', 'f', '--glob', pattern],
                cwd=clone_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            files = [f for f in result.stdout.strip().split('\n') if f]
            logger.info(f"✅ Found {len(files)} files matching {pattern}")
            return files[:max_results]
            
        except FileNotFoundError:
            # Fallback to Python glob
            logger.info("fd not found, using Python glob")
            try:
                import fnmatch
                files = []
                for root, dirs, filenames in os.walk(clone_path):
                    # Skip common ignore patterns
                    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'venv', '.venv']]
                    
                    for filename in filenames:
                        if fnmatch.fnmatch(filename, pattern):
                            rel_path = os.path.relpath(os.path.join(root, filename), clone_path)
                            files.append(rel_path)
                            if len(files) >= max_results:
                                return files
                
                logger.info(f"✅ Found {len(files)} files")
                return files
            except Exception as e:
                logger.error(f"Fallback list_files failed: {e}")
                return []
        except Exception as e:
            logger.error(f"list_files failed: {e}")
            return []


# Tool definitions for Gemini function calling
GITHUB_TOOLS_SCHEMA = [
    {
        "name": "search_github_code",
        "description": "Search for code in repository using keywords. Returns matching files with code snippets and line numbers. Use this for broad searches like 'authentication', 'database connection', etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - keywords, function names, class names, or concepts"
                },
                "path": {
                    "type": "string",
                    "description": "Optional path filter to search within (e.g., 'src/', 'tests/')"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "grep_repository",
        "description": "Grep for exact pattern across repository. More precise than search. Supports regex patterns. Use for finding specific code patterns like 'import X', 'class Y', function signatures, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Search pattern - exact string or regex"
                },
                "regex": {
                    "type": "boolean",
                    "description": "Whether pattern is regex (default: false)"
                },
                "file_pattern": {
                    "type": "string",
                    "description": "Optional file pattern to filter by (e.g., '*.py', '*.js')"
                }
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "get_file",
        "description": "Read complete file contents. Use this to examine a specific file in detail after finding it with search or grep.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to repository root (e.g., 'src/auth.py')"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "find_symbol",
        "description": "Find class, function, or variable definition. Use this to locate where a symbol is defined in the codebase.",
        "parameters": {
            "type": "object",
            "properties": {
                "symbol_name": {
                    "type": "string",
                    "description": "Symbol name to find (e.g., 'UserService', 'login', 'API_KEY')"
                },
                "symbol_type": {
                    "type": "string",
                    "enum": ["class", "function", "variable", "any"],
                    "description": "Type of symbol (default: 'any')"
                }
            },
            "required": ["symbol_name"]
        }
    },
    {
        "name": "list_files",
        "description": "List files matching glob pattern. Use this to find test files, configuration files, or files with specific names.",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Glob pattern (e.g., 'test_*.py', '*.config.js', 'Dockerfile*')"
                }
            },
            "required": ["pattern"]
        }
    }
]


# Helper function to execute tools
async def execute_tool(
    tool_name: str,
    args: Dict[str, Any],
    repository_id: str
) -> Any:
    """
    Execute a tool by name.
    
    Args:
        tool_name: Name of tool to execute
        args: Tool arguments
        repository_id: Repository ID to pass to tool
    
    Returns:
        Tool result
    """
    tools_map = {
        'search_github_code': GitHubTools.search_github_code,
        'grep_repository': GitHubTools.grep_repository,
        'get_file': GitHubTools.get_file,
        'find_symbol': GitHubTools.find_symbol,
        'list_files': GitHubTools.list_files
    }
    
    tool_fn = tools_map.get(tool_name)
    if not tool_fn:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    # Add repository_id to args
    args['repository_id'] = repository_id
    
    logger.info(f"🔧 Executing tool: {tool_name}({args})")
    return await tool_fn(**args)
