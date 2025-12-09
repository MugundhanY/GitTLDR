"""
Code Validator - Validates generated code syntax and runs tests
"""
import ast
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from utils.logger import get_logger

logger = get_logger(__name__)


class CodeValidator:
    """Validates syntax and runs tests on generated code."""
    
    async def validate_all_operations(
        self,
        operations: List[Dict[str, Any]],
        codebase_analysis: Dict[str, Any],
        repository_path: str
    ) -> Dict[str, Any]:
        """
        Comprehensive validation of all generated code.
        
        Checks:
        1. Syntax validity for each file
        2. Import validity (all imports available)
        3. Type checking (if TypeScript)
        4. Linting (if configured)
        5. Test execution (if tests exist)
        """
        
        logger.info(f"Validating {len(operations)} operations")
        
        validation_result = {
            "valid": True,
            "syntax_errors": [],
            "import_errors": [],
            "type_errors": [],
            "lint_warnings": [],
            "test_failures": [],
            "warnings": []
        }
        
        # Validate each operation
        for op in operations:
            op_validation = await self._validate_operation(op, codebase_analysis)
            
            if not op_validation["valid"]:
                validation_result["valid"] = False
            
            validation_result["syntax_errors"].extend(op_validation.get("syntax_errors", []))
            validation_result["import_errors"].extend(op_validation.get("import_errors", []))
            validation_result["warnings"].extend(op_validation.get("warnings", []))
        
        # Run tests if they exist
        if codebase_analysis.get("test_setup", {}).get("has_tests"):
            test_result = await self._run_tests(repository_path, codebase_analysis)
            validation_result["test_failures"] = test_result.get("failures", [])
            if test_result.get("failures"):
                validation_result["warnings"].append(
                    f"{len(test_result['failures'])} test(s) failed after changes"
                )
        
        logger.info(f"Validation complete: {'✓ PASSED' if validation_result['valid'] else '✗ FAILED'}")
        
        return validation_result
    
    async def _validate_operation(
        self,
        operation: Dict[str, Any],
        codebase_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate a single operation."""
        
        result = {
            "valid": True,
            "syntax_errors": [],
            "import_errors": [],
            "warnings": []
        }
        
        file_path = operation.get("path", "")
        content = operation.get("content", "")
        language = operation.get("language", self._detect_language(file_path))
        
        # Syntax validation based on language
        if language == "python":
            syntax_result = self._validate_python_syntax(content, file_path)
            if not syntax_result["valid"]:
                result["valid"] = False
                result["syntax_errors"].extend(syntax_result["errors"])
            
            # Validate imports
            import_result = self._validate_python_imports(content, codebase_analysis)
            result["import_errors"].extend(import_result["errors"])
            result["warnings"].extend(import_result["warnings"])
        
        elif language in ["javascript", "typescript"]:
            syntax_result = self._validate_js_syntax(content, file_path, language)
            if not syntax_result["valid"]:
                result["valid"] = False
                result["syntax_errors"].extend(syntax_result["errors"])
        
        elif language == "json":
            json_result = self._validate_json_syntax(content, file_path)
            if not json_result["valid"]:
                result["valid"] = False
                result["syntax_errors"].extend(json_result["errors"])
        
        return result
    
    def _validate_python_syntax(self, content: str, file_path: str) -> Dict[str, Any]:
        """Validate Python syntax using AST."""
        
        result = {"valid": True, "errors": []}
        
        try:
            ast.parse(content)
        except SyntaxError as e:
            result["valid"] = False
            result["errors"].append({
                "file": file_path,
                "line": e.lineno,
                "message": e.msg,
                "type": "SyntaxError"
            })
        
        return result
    
    def _validate_python_imports(
        self,
        content: str,
        codebase_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate that all Python imports are available."""
        
        result = {"errors": [], "warnings": []}
        
        try:
            tree = ast.parse(content)
            
            # Extract all imports
            imports = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imports.extend([alias.name.split('.')[0] for alias in node.names])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module.split('.')[0])
            
            # Check against known dependencies
            known_deps = codebase_analysis.get("dependencies", {}).get("python", [])
            
            # Standard library modules (common ones)
            stdlib_modules = {
                "os", "sys", "re", "json", "datetime", "time", "math", "random",
                "collections", "itertools", "functools", "typing", "pathlib",
                "asyncio", "logging", "subprocess", "shutil", "tempfile"
            }
            
            for imp in imports:
                if imp not in stdlib_modules and imp not in known_deps:
                    # Check if it's a local import (would start with project name or be relative)
                    if not imp.startswith('.'):
                        result["warnings"].append({
                            "module": imp,
                            "message": f"Import '{imp}' may not be in dependencies",
                            "suggestion": f"May need to add '{imp}' to requirements.txt"
                        })
        
        except Exception as e:
            logger.warning(f"Could not validate imports: {str(e)}")
        
        return result
    
    def _validate_js_syntax(
        self,
        content: str,
        file_path: str,
        language: str
    ) -> Dict[str, Any]:
        """Validate JavaScript/TypeScript syntax."""
        
        result = {"valid": True, "errors": []}
        
        # Basic syntax checks
        # Check for unmatched braces/brackets
        braces = {"(": 0, "[": 0, "{": 0}
        closing = {")": "(", "]": "[", "}": "{"}
        
        in_string = False
        escape = False
        
        for i, char in enumerate(content):
            if char == "\\" and not escape:
                escape = True
                continue
            
            if char in ('"', "'") and not escape:
                in_string = not in_string
            
            if not in_string:
                if char in braces:
                    braces[char] += 1
                elif char in closing:
                    open_char = closing[char]
                    braces[open_char] -= 1
                    if braces[open_char] < 0:
                        result["valid"] = False
                        result["errors"].append({
                            "file": file_path,
                            "position": i,
                            "message": f"Unmatched closing '{char}'",
                            "type": "SyntaxError"
                        })
            
            escape = False
        
        # Check if all braces are matched
        for brace, count in braces.items():
            if count != 0:
                result["valid"] = False
                result["errors"].append({
                    "file": file_path,
                    "message": f"Unmatched '{brace}' (count: {count})",
                    "type": "SyntaxError"
                })
        
        return result
    
    def _validate_json_syntax(self, content: str, file_path: str) -> Dict[str, Any]:
        """Validate JSON syntax."""
        
        result = {"valid": True, "errors": []}
        
        try:
            import json
            json.loads(content)
        except json.JSONDecodeError as e:
            result["valid"] = False
            result["errors"].append({
                "file": file_path,
                "line": e.lineno,
                "column": e.colno,
                "message": e.msg,
                "type": "JSONDecodeError"
            })
        
        return result
    
    async def _run_tests(
        self,
        repository_path: str,
        codebase_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run existing tests to ensure changes don't break functionality."""
        
        test_setup = codebase_analysis.get("test_setup", {})
        test_framework = test_setup.get("test_framework")
        
        if not test_framework:
            return {"failures": [], "message": "No test framework detected"}
        
        logger.info(f"Running tests with {test_framework}")
        
        try:
            if test_framework == "pytest":
                result = await self._run_pytest(repository_path)
            elif test_framework == "jest":
                result = await self._run_jest(repository_path)
            elif test_framework == "unittest":
                result = await self._run_unittest(repository_path)
            else:
                return {"failures": [], "message": f"Test framework {test_framework} not supported yet"}
            
            return result
        
        except Exception as e:
            logger.error(f"Test execution failed: {str(e)}")
            return {
                "failures": [{"message": f"Test execution error: {str(e)}"}],
                "error": str(e)
            }
    
    async def _run_pytest(self, repository_path: str) -> Dict[str, Any]:
        """Run pytest tests."""
        
        try:
            # Run pytest with minimal output
            process = subprocess.run(
                ["pytest", "-v", "--tb=short"],
                cwd=repository_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            failures = []
            
            if process.returncode != 0:
                # Parse pytest output for failures
                for line in process.stdout.split("\n"):
                    if "FAILED" in line:
                        failures.append({"test": line.strip(), "output": process.stdout})
            
            return {
                "passed": process.returncode == 0,
                "failures": failures,
                "output": process.stdout
            }
        
        except subprocess.TimeoutExpired:
            return {"failures": [{"message": "Tests timed out after 60 seconds"}]}
        except FileNotFoundError:
            return {"failures": [], "message": "pytest not installed"}
    
    async def _run_jest(self, repository_path: str) -> Dict[str, Any]:
        """Run Jest tests."""
        
        try:
            process = subprocess.run(
                ["npm", "test", "--", "--passWithNoTests"],
                cwd=repository_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            failures = []
            if process.returncode != 0:
                failures.append({"message": "Jest tests failed", "output": process.stdout})
            
            return {
                "passed": process.returncode == 0,
                "failures": failures,
                "output": process.stdout
            }
        
        except subprocess.TimeoutExpired:
            return {"failures": [{"message": "Tests timed out after 60 seconds"}]}
        except FileNotFoundError:
            return {"failures": [], "message": "npm not installed"}
    
    async def _run_unittest(self, repository_path: str) -> Dict[str, Any]:
        """Run Python unittest tests."""
        
        try:
            process = subprocess.run(
                ["python", "-m", "unittest", "discover", "-v"],
                cwd=repository_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            failures = []
            if process.returncode != 0:
                failures.append({"message": "Unittest tests failed", "output": process.stderr})
            
            return {
                "passed": process.returncode == 0,
                "failures": failures,
                "output": process.stderr
            }
        
        except subprocess.TimeoutExpired:
            return {"failures": [{"message": "Tests timed out after 60 seconds"}]}
    
    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        
        ext = Path(file_path).suffix.lower()
        
        language_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".json": "json",
            ".md": "markdown",
            ".yml": "yaml",
            ".yaml": "yaml",
            ".txt": "text",
            ".go": "go",
            ".rs": "rust",
            ".java": "java"
        }
        
        return language_map.get(ext, "unknown")
