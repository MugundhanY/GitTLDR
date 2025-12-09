"""
Complete File Generator - Simple & Bulletproof
==============================================

Architecture:
1. AI sees: ENTIRE original file
2. AI generates: ENTIRE modified file
3. System: Computes unified diff automatically
4. Result: Always valid, no line number bugs

This is how Cursor, Claude Code, and GitHub Copilot work.
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from utils.logger import get_logger
import json
import re
import difflib
import ast

logger = get_logger(__name__)


@dataclass
class FileModification:
    """A complete file modification."""
    path: str
    original_content: str
    modified_content: str
    explanation: str
    change_type: str  # 'modify', 'create', 'delete'
    validation_errors: List[Dict[str, str]] = None  # Optional validation errors for retry


class CompleteFileGenerator:
    """
    Generate complete modified files, then compute diffs.
    
    No line numbers. No hunks. No state tracking.
    Just: Original File → AI → Modified File → Diff
    """
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
        self._originally_planned_files = None  # Track files from first generation attempt
        self._repository_context = {}  # Repository metadata for context injection
    
    def _build_placeholder_replacement_guide(self) -> str:
        """Build context-aware placeholder replacement instructions."""
        repo_owner = self._repository_context.get('owner', '')
        repo_name = self._repository_context.get('name', '')
        full_name = self._repository_context.get('full_name', '')
        
        if full_name:
            # We have real repository information
            github_url = f"https://github.com/{full_name}"
            return f"""   - `<repository_url>` or `<repo_url>` → {github_url}
   - `<repository_name>` or `<repo_name>` → {repo_name}
   - `<repository_directory>` → {repo_name}
   - `<your-repo-url>` → {github_url}
   - `<owner>` or `<repository_owner>` → {repo_owner}
   - Any GitHub links → https://github.com/{full_name}"""
        else:
            # Generic fallback when repository info unavailable
            return """   - `<repository_url>` → "https://github.com/username/project-name" (use generic but realistic example)
   - `<repository_directory>` → "project-directory" (use project name from context if available)
   - `<your-repo-url>` → Omit placeholder entirely or use generic realistic URL
   - Keep examples realistic and professional"""
    
    def _extract_test_requirements(self, relevant_files: List[Any]) -> Dict[str, List[str]]:
        """
        Extract required functions/classes from test files.
        
        Returns:
            Dict mapping source file -> list of required symbols
            Example: {'main.py': ['generate_test_wav', 'transcribe_audio']}
        """
        requirements = {}
        
        for f in relevant_files:
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', '')
            
            # Only analyze test files
            if not any(test_indicator in path.lower() for test_indicator in ['test_', '_test', '/tests/', '\\tests\\']):
                continue
            
            content = f.content if hasattr(f, 'content') else f.page_content
            
            try:
                # Parse test file to find imports
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    # Look for: from main import app, generate_test_wav
                    if isinstance(node, ast.ImportFrom):
                        if node.module:  # e.g., 'main'
                            source_file = f"{node.module}.py"
                            imported_names = [alias.name for alias in node.names if alias.name != '*']
                            
                            if imported_names:
                                if source_file not in requirements:
                                    requirements[source_file] = []
                                requirements[source_file].extend(imported_names)
                                logger.info(f"📋 Test requirement: {source_file} must provide {imported_names}")
                    
                    # Also look for direct imports: import main
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            source_file = f"{alias.name}.py"
                            # Mark that this module is imported (generic requirement)
                            if source_file not in requirements:
                                requirements[source_file] = []
                            logger.info(f"📋 Test imports module: {source_file}")
                
            except SyntaxError as e:
                logger.warning(f"Could not parse test file {path}: {e}")
                continue
        
        return requirements
    
    async def generate_fix(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str,
        repository_id: str,
        validation_feedback: Optional[str] = None,
        repository_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[FileModification]]:
        """
        Generate a complete fix.
        
        Args:
            repository_context: Repository metadata (owner, name, full_name) for context injection
        
        Returns:
            (unified_diff, list_of_modifications)
        """
        logger.info("🚀 Complete File Generator starting...")
        
        # Store repository context for use in file generation
        self._repository_context = repository_context or {}
        
        # Step 0: Extract test requirements (what functions tests expect)
        test_requirements = self._extract_test_requirements(relevant_files)
        if test_requirements:
            logger.info(f"📋 Found test requirements: {test_requirements}")
        
        # Step 1: Determine which files need changes
        files_to_modify = await self._identify_files_to_change(
            understanding, relevant_files, issue_title, issue_body, validation_feedback
        )
        
        # CRITICAL: Preserve ALL planned files from first attempt during regeneration
        # This ensures code files (like main.py) aren't accidentally dropped alongside docs
        if validation_feedback and self._originally_planned_files:
            # During regeneration, ensure NO files are dropped (not just docs)
            current_paths = {f['path'] for f in files_to_modify}
            missing_files = [f for f in self._originally_planned_files if f['path'] not in current_paths]
            
            if missing_files:
                logger.warning(f"⚠️ Regeneration dropped {len(missing_files)} originally planned files, restoring them:")
                for file in missing_files:
                    file_type = 'documentation' if any(file['path'].endswith(ext) for ext in ['.md', '.rst', '.txt']) else 'code'
                    logger.warning(f"   - {file['path']} ({file_type})")
                    files_to_modify.append(file)
                logger.info(f"✅ Restored {len(missing_files)} files to generation list (prevents dropping main.py, etc.)")
        
        # Store file list for potential future regeneration
        if not validation_feedback:
            self._originally_planned_files = files_to_modify
            logger.info(f"📝 Stored {len(files_to_modify)} originally planned files")
        
        logger.info(f"📝 Will modify {len(files_to_modify)} files")
        
        # Step 2: Generate complete modified versions with validation retry loop
        modifications = []
        seen_paths = set()  # Track paths to prevent duplicates
        for file_info in files_to_modify:
            # CRITICAL: Skip duplicate files to prevent "already exists in working directory" errors
            file_path = file_info.get('path', '')
            if file_path in seen_paths:
                logger.warning(f"⚠️ Skipping duplicate file: {file_path}")
                continue
            seen_paths.add(file_path)
            
            # Retry loop with validation feedback (max 3 attempts)
            max_attempts = 3
            modification = None
            validation_feedback_for_file = None
            previous_errors = None  # Track errors for early termination
            repeated_error_count = 0  # Count how many times same errors repeat
            
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.info(f"🔄 Generating {file_path} (attempt {attempt}/{max_attempts})")
                    
                    modification = await self._generate_complete_file(
                        file_info, understanding, relevant_files, issue_title, issue_body, 
                        validation_feedback_for_file, test_requirements
                    )
                    
                    if modification:
                        # Check if validation errors were detected
                        if hasattr(modification, 'validation_errors') and modification.validation_errors:
                            logger.warning(f"⚠️ Validation failed for {file_path} (attempt {attempt}/{max_attempts})")
                            logger.warning(f"   Errors: {len(modification.validation_errors)}")
                            
                            # Early termination check: detect repeated identical errors
                            current_errors = str(sorted([e.get('message', '') for e in modification.validation_errors]))
                            if previous_errors and current_errors == previous_errors:
                                repeated_error_count += 1
                                logger.warning(f"⚠️ Same validation errors repeated {repeated_error_count} times")
                                
                                if repeated_error_count >= 2:  # 3 total attempts with same error
                                    logger.error(f"❌ Early termination: Same errors repeated 3 times for {file_path}")
                                    logger.error(f"   AI is unable to fix these validation issues, stopping retry loop")
                                    modification = None
                                    break
                            else:
                                repeated_error_count = 0  # Reset on different errors
                            
                            previous_errors = current_errors
                            
                            if attempt < max_attempts:
                                # Build feedback message for AI
                                feedback_parts = [
                                    f"## VALIDATION ERRORS FOR {file_path}",
                                    "",
                                    "Your previous attempt had these issues:",
                                    ""
                                ]
                                for i, err in enumerate(modification.validation_errors, 1):
                                    feedback_parts.append(f"{i}. **{err['type']}**: {err['message']}")
                                
                                feedback_parts.extend([
                                    "",
                                    "## FIX INSTRUCTIONS",
                                    "",
                                    "You MUST fix these issues in your next attempt:",
                                    "- PRESERVE 100% of the original file content",
                                    "- START with the EXACT original beginning (first 100 chars must match)",
                                    "- ADD new sections AFTER the appropriate existing sections",
                                    "- DO NOT replace the title, headers, or any existing content",
                                    "- Your output length must be >= original length (you're adding, not replacing)",
                                    "",
                                    "Try again and fix ALL validation errors."
                                ])
                                
                                validation_feedback_for_file = "\n".join(feedback_parts)
                                logger.info(f"🔄 Retrying {file_path} with validation feedback...")
                                continue  # Retry
                            else:
                                logger.error(f"❌ {file_path} failed validation after {max_attempts} attempts - SKIPPING")
                                modification = None
                                break
                        else:
                            # No validation errors - success!
                            logger.info(f"✅ Generated {modification.path} successfully")
                            break
                    else:
                        logger.error(f"❌ Generation returned None for {file_path}")
                        break
                        
                except Exception as e:
                    logger.error(f"Failed to generate {file_info['path']} (attempt {attempt}): {e}")
                    if attempt >= max_attempts:
                        break
                    continue
            
            # Add to modifications if successful
            if modification and not (hasattr(modification, 'validation_errors') and modification.validation_errors):
                modifications.append(modification)
                logger.info(f"✅ Added {modification.path} to modifications")
        
        # Step 3: Compute unified diff from before/after
        unified_diff = self._compute_unified_diff(modifications)
        
        logger.info(f"✅ Generated diff: {len(unified_diff)} chars")
        logger.info(f"✅ Generated fix: {len(modifications)} files modified")
        return unified_diff, modifications
    
    async def _identify_files_to_change(
        self,
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str,
        validation_feedback: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Ask AI which files need to be changed and how.
        
        Returns list of:
        {
            'path': 'main.py',
            'change_type': 'modify',  # or 'create'
            'reason': 'Add WebSocket endpoint',
            'original_content': '...'  # only for modify
        }
        """
        # Build file context
        file_context = []
        for f in relevant_files[:10]:  # Limit to avoid token overflow
            path = f.path if hasattr(f, 'path') else f.metadata.get('path', 'unknown')
            content = f.content if hasattr(f, 'content') else f.page_content
            language = f.language if hasattr(f, 'language') else 'unknown'
            
            # Show file structure, not full content (save tokens)
            lines = content.split('\n')
            preview = '\n'.join(lines[:50]) if len(lines) > 50 else content
            
            file_context.append(f"**{path}** ({language}, {len(lines)} lines):\n```\n{preview}\n```")
        
        prompt = f"""
Analyze this issue and determine which files need to be changed.

**Issue:** {issue_title}

**Description:**
{issue_body}

**Understanding:**
- Root Cause: {getattr(understanding, 'root_cause', 'Unknown')}

**📋 ALL REQUIREMENTS (MUST IMPLEMENT ALL):**
{chr(10).join(f'{i+1}. {req}' for i, req in enumerate(getattr(understanding, 'requirements', [])))}

**✅ ACCEPTANCE CRITERIA:**
Your solution MUST satisfy ALL requirements above. Do not skip any features.

**Available Files:**
{chr(10).join(file_context[:5])}

**Task:** Identify which files to modify or create. For each file, explain what needs to change.

**Response Format (JSON):**
```json
{{
  "files": [
    {{
      "path": "main.py",
      "change_type": "modify",
      "reason": "Add WebSocket endpoint for real-time transcription"
    }},
    {{
      "path": "requirements.txt", 
      "change_type": "modify",
      "reason": "Add websockets dependency"
    }},
    {{
      "path": "docs/api.md",
      "change_type": "create",
      "reason": "Document new WebSocket API"
    }}
  ]
}}
```

**Rules:**
1. Only list files that MUST change to fix the issue
2. Prefer modifying existing files over creating new ones
3. Maximum 5 files per fix
4. Be specific about what needs to change in each file
"""
        
        response = await self.ai_client.generate_content_async(
            prompt=prompt,
            temperature=0.3,
            max_tokens=2000,
            task_type='generation'
        )
        
        # Parse JSON response
        files = self._parse_file_list(response)
        
        # Add original content for files that exist
        file_map = {
            (f.path if hasattr(f, 'path') else f.metadata.get('path', '')): 
            (f.content if hasattr(f, 'content') else f.page_content)
            for f in relevant_files
        }
        
        for file_info in files:
            if file_info['change_type'] == 'modify':
                file_info['original_content'] = file_map.get(file_info['path'], '')
        
        return files
    
    async def _generate_complete_file(
        self,
        file_info: Dict[str, Any],
        understanding: Any,
        relevant_files: List[Any],
        issue_title: str,
        issue_body: str,
        validation_feedback: Optional[str] = None,
        test_requirements: Optional[Dict[str, List[str]]] = None
    ) -> Optional[FileModification]:
        """
        Generate the COMPLETE modified file.
        
        AI sees the full original file and generates the full modified version.
        """
        path = file_info['path']
        change_type = file_info['change_type']
        reason = file_info.get('reason', '')
        
        # Check if this file has test requirements
        test_req_section = ""
        if test_requirements and path in test_requirements:
            required_symbols = test_requirements[path]
            test_req_section = f"""

**🧪 CRITICAL TEST REQUIREMENTS - MUST IMPLEMENT ALL:**

Test files import these from {path}:
{chr(10).join(f'  • {symbol}' for symbol in required_symbols)}

**YOU MUST GENERATE THESE OR TESTS WILL FAIL:**
- If it's a function: Create a complete working implementation with proper signature
- If it's a class: Define the class with all required methods
- If it's a constant/variable: Define it with an appropriate value

**FAILURE TO INCLUDE THESE = ImportError at runtime**

**IMPLEMENTATION GUIDANCE:**
For test utility functions (like `generate_test_wav`, `create_test_audio`, `make_test_data`):
1. Implement as standalone helper functions (usually at bottom of file)
2. Use appropriate libraries (wave, numpy, os, tempfile) to generate test data
3. **CRITICAL**: Check test file to see if function returns bytes or file path!
4. Example for audio generation (returns FILE PATH as most tests expect):
   ```python
   def generate_test_wav(duration=1, sample_rate=16000):
       \"\"\"Generate a test WAV file for unit testing.
       
       Args:
           duration: Duration in seconds (float)
           sample_rate: Sample rate in Hz (default 16000)
           
       Returns:
           str: Path to generated WAV file
       \"\"\"
       import wave
       import numpy as np
       import tempfile
       import os
       
       # Generate silent audio or sine wave
       num_samples = int(duration * sample_rate)
       audio_data = np.zeros(num_samples, dtype=np.int16)  # Silent
       # OR: audio_data = (np.sin(2 * np.pi * 440 * np.arange(num_samples) / sample_rate) * 32767).astype(np.int16)
       
       # Create temporary WAV file
       temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
       output_path = temp_file.name
       temp_file.close()
       
       with wave.open(output_path, 'wb') as wav_file:
           wav_file.setnchannels(1)  # Mono
           wav_file.setsampwidth(2)  # 16-bit
           wav_file.setframerate(sample_rate)
           wav_file.writeframes(audio_data.tobytes())
       
       return output_path
   ```

If unsure what a symbol should do:
- Functions: Add docstring, implement reasonable logic based on name
- Classes: Include __init__ and common methods
- Constants: Use sensible default values

"""
        
        if change_type == 'create':
            # Generate new file from scratch
            validation_section = ""
            if validation_feedback:
                validation_section = f"""

**⚠️ PREVIOUS VALIDATION FAILED - FIX THESE ISSUES:**
{validation_feedback}

"""
            
            # CRITICAL: Check if this is a markdown/documentation file
            file_extension = path.lower().split('.')[-1]
            is_markdown = file_extension in ['md', 'markdown', 'rst']
            is_documentation = is_markdown or path.lower().endswith(('readme', 'readme.txt')) or '/docs/' in path.lower() or '\\docs\\' in path.lower()
            is_test_file = any(test_indicator in path.lower() for test_indicator in ['test_', '_test', '/tests/', '\\tests\\'])
            
            # Add format instructions for test files
            test_rules = ""
            if is_test_file and path.endswith('.py'):
                test_rules = f"""

**🧪 CRITICAL TEST FILE RULES FOR PYTHON ({path}):**

**FOR ASYNC CODE (WebSocket, AsyncIO, FastAPI async endpoints):**
```python
import pytest
import httpx
# OR: import websockets

@pytest.mark.asyncio
async def test_websocket_endpoint():
    '''Test async WebSocket endpoint.'''
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        async with client.websocket_connect("/ws/endpoint") as websocket:
            await websocket.send_json({{"message": "test"}})
            response = await websocket.receive_json()
            assert response is not None

@pytest.mark.asyncio  
async def test_async_function():
    '''Test async function.'''
    result = await some_async_function()
    assert result is not None
```

**FOR SYNC CODE (regular functions, REST endpoints):**
```python
import pytest
from fastapi.testclient import TestClient

def test_sync_endpoint():
    '''Test synchronous endpoint.'''
    client = TestClient(app)
    response = client.get("/endpoint")
    assert response.status_code == 200
```

**CRITICAL RULES:**
❌ DO NOT use `TestClient` with WebSocket async endpoints
❌ DO NOT mix sync/async patterns (sync function with async operations)
✅ USE `@pytest.mark.asyncio` for ANY test that uses `async def`
✅ USE `async with` for WebSocket connections
✅ USE `await` for all async operations
✅ Import `httpx` or `websockets` for async WebSocket testing, NOT TestClient

**REQUIRED IMPORTS:**
```python
import pytest  # Always needed
# For async tests:
import asyncio
import httpx  # For async HTTP/WebSocket with FastAPI
# OR: import websockets  # For direct WebSocket testing

# For sync tests:
from fastapi.testclient import TestClient  # Only for sync endpoints
```

"""
            
            # Add format instructions for markdown files
            format_rules = ""
            if is_markdown:
                format_rules = f"""

**CRITICAL FORMAT RULES FOR MARKDOWN ({path}):**
❌ DO NOT output Python/JavaScript/any programming code at the top level
❌ DO NOT start with import statements, function definitions, or class definitions
✅ START with markdown heading (# Title or ## Heading)
✅ USE markdown syntax (##, -, *, ```) throughout the entire file
✅ Code examples MUST be in markdown code blocks with language tags
✅ Structure: Title → Description → Documentation → Examples in code blocks

**EXAMPLE CORRECT STRUCTURE:**
```
# API Documentation

## WebSocket Endpoint

The `/ws/transcribe` endpoint accepts WebSocket connections...

### Request Format

Clients should send JSON messages:

```json
{{
  "audio_data": "base64_encoded_audio"
}}
```

### Example Client Code

```python
import asyncio
import websockets

async def connect():
    async with websockets.connect("ws://...") as ws:
        await ws.send(data)
```
```

**THIS IS DOCUMENTATION, NOT A CODE FILE. NO EXECUTABLE CODE AT THE TOP LEVEL.**
"""
            
            prompt = f"""
Create a new file: **{path}**

**Purpose:** {reason}

**Issue Context:**
- Title: {issue_title}

**📋 ALL REQUIREMENTS (MUST IMPLEMENT ALL):**
{chr(10).join(f'{i+1}. {req}' for i, req in enumerate(getattr(understanding, 'requirements', [])))}

**✅ CRITICAL:** Your code MUST satisfy ALL requirements listed above. Do not skip any features or endpoints.{validation_section}{test_req_section}{test_rules}{format_rules}

**Instructions:**
1. Generate COMPLETE, PRODUCTION-READY {'documentation' if is_documentation else 'code'}
2. Include all necessary {'sections and examples' if is_documentation else 'imports'}
3. Add {'clear explanations' if is_documentation else 'docstrings and comments'}
4. Follow {'markdown' if is_markdown else 'language'} best practices
5. No TODOs or placeholders
6. **FIX ALL VALIDATION ISSUES LISTED ABOVE**

**CRITICAL SYNTAX RULES:**
- Do NOT use backslash (\\) for line continuation at end of lines
- Write complete statements on single lines, even if long
- Use implicit line continuation inside parentheses, brackets, or braces if needed
- Never split strings or statements with \\ at end of line
- No duplicate variable definitions
- Define all variables before using them

Output the COMPLETE file content (no markdown wrapper, no explanations):
"""
            # CRITICAL FIX: Use higher max_tokens for test files to prevent truncation
            # Test files often need 200+ lines with multiple test functions
            token_limit = 8000 if is_test_file else 4000
            
            response = await self.ai_client.generate_content_async(
                prompt=prompt,
                temperature=0.2,  # Low temperature for strict instruction following
                max_tokens=token_limit,
                task_type='planning'
            )
            
            # Clean up response
            content = self._extract_code(response)
            # CRITICAL FIX: Decode any literal escape sequences from AI response
            content = self._decode_escape_sequences(content)
            
            # CRITICAL: Validate requirements.txt format - detect AI explanatory text
            if path.endswith('requirements.txt') or path.endswith('requirements.in'):
                lines = content.strip().split('\n')
                valid_packages = []
                invalid_lines = []
                
                for i, line in enumerate(lines, 1):
                    original_line = line
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    
                    # CRITICAL: Detect AI explanatory text (both GPT and Gemini do this)
                    # Look for phrases that indicate non-requirements content
                    explanatory_patterns = [
                        r'\bhere\s+is\b',  # "Here is your updated..."
                        r'\bupdated\s+requirements\b',
                        r'\bdependency\s+added\b',
                        r'\bfor\s+websocket\s+support\b',
                        r'\bchoose\s+one\b',
                        r'\bdepending\s+on\b',
                        r'\bif\s+you\s+intend\b',
                        r'^\s*```',  # Markdown code fence
                        r'\*\*.*\*\*',  # Markdown bold
                        r':\s*$',  # Colon at end (like "Here is:")
                    ]
                    
                    is_explanatory = any(re.search(pattern, line, re.IGNORECASE) for pattern in explanatory_patterns)
                    
                    if is_explanatory:
                        invalid_lines.append((i, line[:80], "Explanatory text instead of package name"))
                        continue
                    
                    # Valid package line format: package[extras]==version or package>=version
                    if re.match(r'^[a-zA-Z0-9_-]+[\[\],<>=!.\w-]*', line):
                        valid_packages.append(line)
                    else:
                        invalid_lines.append((i, line[:80], "Invalid package format"))
                
                if invalid_lines:
                    logger.error(f"❌ Generated requirements.txt contains non-package content:")
                    for line_num, line_content, reason in invalid_lines:
                        logger.error(f"   Line {line_num}: {reason}")
                        logger.error(f"      Content: {line_content}")
                    logger.error(f"\n⚠️ AI generated explanatory text instead of just package names!")
                    logger.error(f"   This happens with BOTH GPT and Gemini when prompts aren't strict.")
                    logger.error(f"   Requirements files must contain ONLY package names, not prose.")
                    return None
                
                if valid_packages:
                    # Reconstruct content with only valid packages
                    content = '\n'.join(valid_packages) + '\n'
                    logger.info(f"✅ Requirements.txt validated: {len(valid_packages)} packages")
                else:
                    logger.error(f"❌ No valid package lines found in generated requirements.txt")
                    return None
            
            # CRITICAL FIX: Validate Python syntax for .py files to catch truncation
            if path.endswith('.py'):
                try:
                    compile(content, path, 'exec')
                    logger.info(f"✅ Syntax validation passed for {path}")
                except SyntaxError as e:
                    logger.error(f"❌ Generated code has syntax error in {path}: {e}")
                    logger.error(f"   This usually means AI output was truncated")
                    logger.error(f"   File length: {len(content)} chars, {len(content.splitlines())} lines")
                    # Log last few lines to see truncation
                    lines = content.splitlines()
                    logger.error(f"   Last 3 lines: {lines[-3:] if len(lines) >= 3 else lines}")
                    return None
            
            # REMOVED: Markdown validation - API docs can contain code snippets, JSON examples, etc.
            # Let the AI generate whatever content makes sense for documentation
            
            return FileModification(
                path=path,
                original_content='',
                modified_content=content,
                explanation=reason,
                change_type='create'
            )
        
        else:  # modify
            original = file_info.get('original_content', '')
            if not original:
                logger.error(f"No original content for {path}")
                return None
            
            # Initialize surgical_fix_mode FIRST (used in temperature setting later)
            surgical_fix_mode = bool(validation_feedback)
            
            # CRITICAL FIX: Define is_documentation at the START of modify block
            # This prevents "cannot access local variable 'is_documentation'" errors
            # for Dockerfile, requirements.txt, and other non-documentation files
            is_documentation = path.lower().endswith(('readme.md', 'readme', 'readme.txt', '.md', '.markdown', '.rst')) or '/docs/' in path.lower() or '\\docs\\' in path.lower()

            # Special handling for Dockerfile - ensure DEBIAN_FRONTEND is set
            if path.lower() == 'dockerfile' or path.endswith('/Dockerfile') or path.endswith('\\Dockerfile'):
                # Check if original has apt-get install but no DEBIAN_FRONTEND
                has_apt_install = 'apt-get install' in original.lower()
                has_debian_frontend = 'DEBIAN_FRONTEND' in original
                
                validation_section = ""
                if validation_feedback:
                    validation_section = f"\n\n**⚠️ PREVIOUS VALIDATION FAILED:**\n{validation_feedback}\n"
                
                prompt = f"""
Modify the Dockerfile to: {reason}

**CURRENT DOCKERFILE:**
{original}

**CRITICAL DOCKERFILE RULES:**
1. ✅ ALWAYS include `ENV DEBIAN_FRONTEND=noninteractive` BEFORE any `apt-get install` command
2. ✅ This prevents timezone prompts (tzdata) that hang Docker builds
3. ✅ Place it right after the FROM line for maximum safety
4. ✅ Preserve all existing functionality
5. ✅ Add only necessary changes for: {reason}{validation_section}

**REQUIRED STRUCTURE:**
FROM <base-image>

# Prevent interactive prompts (e.g., tzdata timezone selection)
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y \\
    package1 \\
    package2 \\
    && rm -rf /var/lib/apt/lists/*

[rest of Dockerfile]

Output the COMPLETE modified Dockerfile:
"""
            # Special handling for requirements.txt - simplified, trust Gemini
            elif path.endswith('requirements.txt'):
                prompt = f"""
Modify requirements.txt for: {reason}

Current file:
{original}

Add necessary dependencies. Output the complete requirements.txt file.
"""
            else:
                
                # is_documentation was already defined at the top of the modify block
                
                if is_documentation:
                    # Documentation update with structural preservation requirements
                    # CRITICAL: Check if this is markdown/documentation vs code file
                    file_extension = path.lower().split('.')[-1]
                    is_markdown = file_extension in ['md', 'markdown', 'rst', 'txt']
                    is_api_docs = 'api' in path.lower() and is_markdown
                    
                    format_instructions = ""
                    if is_markdown:
                        format_instructions = f"""

**CRITICAL FORMAT RULES FOR MARKDOWN ({path}):**
❌ DO NOT output Python/JavaScript/any code at the top level
❌ DO NOT start with import statements or function definitions  
✅ START with markdown heading (# Title)
✅ USE markdown syntax (##, -, *, ```) throughout
✅ Code examples must be in markdown code blocks with language tags
✅ Structure: Title → Description → API Documentation → Examples

**FOR NEW API DOCUMENTATION FILES:**
✅ Create complete API reference with endpoint documentation
✅ Include request/response examples in proper markdown code blocks
✅ Document WebSocket endpoints if added (connection protocol, message format)
✅ Provide client code examples in markdown code blocks
"""
                    
                    prompt = f"""
Update the documentation file ({path}) for this issue.

**Issue:** {issue_title}
**Changes Required:** {reason}

**CURRENT FILE CONTENT:**
```
{original}
```
{format_instructions}

**🚨 CRITICAL: MINIMAL SURGICAL DOCUMENTATION UPDATE 🚨**

**ABSOLUTE REQUIREMENTS - YOUR OUTPUT WILL BE VALIDATED:**

1. **FILE LENGTH CHECK:** Your output MUST be >= {len(original)} characters (original length)
   - You are ADDING content, not replacing it
   - If your output is shorter, it will be AUTOMATICALLY REJECTED

2. **MUST START WITH EXACT ORIGINAL BEGINNING:**
```
{original[:200] if len(original) >= 200 else original}
```

**IF YOUR OUTPUT DOES NOT START WITH EXACTLY THESE CHARACTERS, IT WILL BE REJECTED.**

**VALIDATION CHECKS THAT WILL RUN:**
✅ len(your_output) >= {len(original)} (you're adding content, not replacing)
✅ your_output[:100] == original[:100] (preserves beginning)
✅ git apply test (diff must be valid)

**IF ANY CHECK FAILS, YOUR OUTPUT WILL BE REJECTED AND YOU'LL HAVE TO REGENERATE.**

**DO NOT REWRITE THE ENTIRE FILE - THIS IS AN APPEND OPERATION!**

**STEP-BY-STEP PROCESS:**
1. **COPY 100% of original content** - Start your output with every existing line
2. **FIND insertion point** - After related sections (e.g., after "Prerequisites" for new "Installation" section)
3. **INSERT new section(s)** - Add ONLY the new documentation needed
4. **CONTINUE with remaining original content** - Everything after insertion point

**WHAT YOU MUST DO:**
1. **KEEP 100% OF EXISTING CONTENT** - Every line, every section, every example
2. **ADD ONLY NEW SECTIONS** - For new features (e.g., new API endpoints)
3. **UPDATE ONLY AFFECTED SECTIONS** - If a section needs changes, modify just that section
4. **PRESERVE EXACT FORMATTING** - Same headings, same structure, same style

**EXAMPLES OF CORRECT MINIMAL UPDATES:**

**IF ADDING NEW WEBSOCKET ENDPOINT:**
- Keep all existing README sections unchanged (including title, description, prerequisites)
- Add ONE new section at appropriate location (after existing API docs or before Examples):
  ```markdown
  ## WebSocket API
  
  ### /ws/stt - Real-time Transcription
1005:             # 'pyaudio': 'Requires C compilation (gcc + PortAudio headers) - Docker has no build tools', # ALLOWED for client

  ```
- That's it! No rewriting introduction, installation, or other sections.

**IF ISSUE ASKS FOR DOCS IN `docs/api.md`:**
- CREATE `docs/api.md` as NEW FILE
- DO NOT modify README.md unless specifically mentioned in issue
- Document ONLY the new API features in that file

**VERIFICATION BEFORE OUTPUTTING:**
✅ Did I keep 95%+ of original content unchanged?
✅ Did I add ONLY what's needed for this specific issue?
✅ Did I avoid rewriting sections that work fine?

**IF YOU'RE UNSURE WHAT TO CHANGE:**
Better to add a new section than rewrite everything. When in doubt, MINIMAL CHANGES ONLY.

**CRITICAL OUTPUT INSTRUCTIONS:**
1. The file MUST start with EXACTLY the first line of the original file
2. Preserve the first 50 lines exactly as written in the original
3. Find the appropriate location to add new content (after related sections)
4. Insert ONLY the new section(s) you're adding
5. Preserve all remaining original content after the insertion point
6. Do NOT truncate, remove, or modify existing code blocks, examples, or sections
7. Output the COMPLETE file from beginning to end

**WRONG EXAMPLE - Do NOT do this:**
```
def broken_fragment():  <-- Starting with fragment of code
  ```

### WebSocket API  <-- Missing everything before this
```

**CORRECT EXAMPLE - Do this:**
```
# FastAPI Vosk Speech-to-Text Service          <-- EXACT original first line

This project provides a FastAPI-based service... <-- ALL original content preserved

## Prerequisites                                <-- ALL original sections kept
- Python 3.6...
...

## API Documentation                            <-- Existing section preserved

### REST API                                    <-- Existing subsection preserved
...existing content...

### WebSocket API                               <-- NEW section inserted here
...new content...
```

Output the complete file starting with the exact first line of the original:
"""
                else:
                    # ==================================================================================
                    # STANDARD CODE MODIFICATION PROMPT
                    # ==================================================================================
                    validation_section = ""
                    reasoning_prefix = ""
                    if validation_feedback:
                        # If we're fixing validation issues, use SURGICAL FIX MODE
                        validation_section = f"""

**🚨 PREVIOUS ATTEMPT HAD BUGS - ANALYZE BEFORE FIXING 🚨**

{validation_feedback}

**THINK THROUGH THESE STEPS (internally, don't write them in output):**

**STEP 1: ANALYZE THE PROBLEM**
Before modifying ANY code, mentally think through:
1. What EXACTLY went wrong? (be specific - which line, which variable, which logic?)
2. Why did it go wrong? (what was the root cause? what did I misunderstand?)
3. How does the existing code work? (trace the execution flow)
4. What is the MINIMAL change needed? (surgical fix - touch only broken parts)

**STEP 2: PLAN THE FIX**
1. Which exact lines need to change?
2. What will each line become?
3. Will this break anything else? (check dependencies)
4. Does this fix the root cause or just the symptom?

**STEP 3: VERIFY YOUR LOGIC**
1. Does the fix address the validation feedback?
2. Have I introduced any new bugs?
3. Does the fixed code follow best practices?

**NOW OUTPUT ONLY THE FIXED CODE (no reasoning text, no explanations)**

"""
                        # Reasoning instructions are now embedded above - no separate prefix needed
                        reasoning_prefix = ""
                    
                    prompt = f"""
Modify this file to implement the required changes.

**File:** {path}

**Change Required:** {reason}

**Issue Context:**
- Title: {issue_title}
- Root Cause: {getattr(understanding, 'root_cause', 'Unknown')}{validation_section}{test_req_section}
{reasoning_prefix}
**CURRENT FILE CONTENT:**
```
{original}
```

**CRITICAL INSTRUCTIONS {"(SURGICAL FIX MODE)" if surgical_fix_mode else ""}:**
1. {"THINK STEP-BY-STEP: Analyze the problem → Plan the fix → Verify logic (see above)" if surgical_fix_mode else f"Make ONLY the changes needed for: {reason}"}
2. Output the COMPLETE modified file with ALL original content preserved
3. {"Change ONLY the specific buggy lines - DO NOT refactor working code" if surgical_fix_mode else "Preserve all existing functionality"}
4. Define all variables BEFORE using them (check line numbers in feedback!)
5. Keep existing structure intact{" 6. INCLUDE ALL TEST-REQUIRED FUNCTIONS (see above)" if test_req_section else ""}

**CRITICAL SYNTAX RULES:**
- No backslash (\\) line continuation
- Define variables before use
- No duplicate definitions

**CRITICAL WEBSOCKET RULES (WILL BE VALIDATED):**
❌ NEVER call websocket.close() inside except WebSocketDisconnect block
❌ NEVER call websocket.send_text() after except WebSocketDisconnect
❌ NEVER call await websocket.close() when client already disconnected

✅ CORRECT: When WebSocketDisconnect is raised, connection is ALREADY CLOSED
✅ CORRECT: Just break from the loop or return - no explicit close needed
✅ CORRECT: Use try/except WebSocketDisconnect: break (not await websocket.close())

Example WRONG code that will FAIL validation:
```python
try:
    while True:
        data = await websocket.receive_bytes()
        await websocket.send_text(result)
except WebSocketDisconnect:
    await websocket.close()  # ❌ WRONG - already closed!
```

Example CORRECT code:
```python
    try:
        # Initialize resources OUTSIDE loop
        while True:
            # Check for disconnects or empty data
            try:
                data = await websocket.receive_bytes()
                if not data: break # Handle empty data
            except WebSocketDisconnect:
                break # Proper disconnect handling
            
            # Process audio...
            if recognizer.AcceptWaveform(data):
                 await websocket.send_json({...})

    except Exception:
        pass # Handle other errors
    finally:
        # Cleanup resources (if needed)
        pass 
```

**🚨 PREVIOUS ATTEMPT HAD BUGS - ANALYZE BEFORE FIXING 🚨**

{validation_feedback}

**THINK THROUGH THESE STEPS (internally, don't write them in output):**

**STEP 1: ANALYZE THE PROBLEM**
Before modifying ANY code, mentally think through:
1. What EXACTLY went wrong? (be specific - which line, which variable, which logic?)
2. Why did it go wrong? (what was the root cause? what did I misunderstand?)
3. How does the existing code work? (trace the execution flow)
4. What is the MINIMAL change needed? (surgical fix - touch only broken parts)

**STEP 2: PLAN THE FIX**
1. Which exact lines need to change?
2. What will each line become?
3. Will this break anything else? (check dependencies)
4. Does this fix the root cause or just the symptom?

**STEP 3: VERIFY YOUR LOGIC**
1. Does the fix address the validation feedback?
2. Have I introduced any new bugs?
3. Does the fixed code follow best practices?

**NOW OUTPUT ONLY THE FIXED CODE (no reasoning text, no explanations)**

"""

            
            # Set token limits based on file type
            if path.endswith('.py') and 'test' in path.lower():
                max_tokens = 6000  # Increased for test files to prevent truncation
            elif is_documentation:
                max_tokens = 12000  # INCREASED: Allow longer documentation with code examples
            else:
                max_tokens = 5000  # Standard for code files
            
            response = await self.ai_client.generate_content_async(
                prompt=prompt,
                temperature=0.3 if surgical_fix_mode else 0.5,  # Lower temp for bug fixing
                max_tokens=max_tokens,
                task_type='generation'  # Use Grok-3 for code generation (quality critical)
            )
            
            # Clean up response
            modified = self._extract_code(response)
            
            # CRITICAL FIX: Do NOT remove line continuations or decode escapes from markdown files
            # Line continuation removal can corrupt markdown formatting and truncate content
            # Only apply processing to actual code files
            is_markdown_file = path.lower().endswith(('.md', '.markdown', '.rst', '.txt')) or '/docs/' in path.lower() or '\\docs\\' in path.lower()
            
            if not is_markdown_file:
                # Only process code files - decode escapes and remove line continuations
                modified = self._decode_escape_sequences(modified)
                modified = self._remove_line_continuations(modified)
            else:
                logger.info(f"⏭️  Skipping line continuation removal for documentation file {path}")
            
            # CRITICAL: Validate and fix Dockerfiles
            is_dockerfile = path.lower() == 'dockerfile' or path.endswith('/Dockerfile') or path.endswith('\\Dockerfile')
            if is_dockerfile:
                has_apt_install = 'apt-get install' in modified.lower()
                has_debian_frontend = 'DEBIAN_FRONTEND=noninteractive' in modified
                
                if has_apt_install and not has_debian_frontend:
                    logger.warning(f"⚠️ Dockerfile missing DEBIAN_FRONTEND - auto-fixing...")
                    # Insert after FROM line
                    lines = modified.split('\n')
                    for i, line in enumerate(lines):
                        if line.strip().startswith('FROM '):
                            lines.insert(i + 2, '')
                            lines.insert(i + 3, '# Prevent interactive prompts (e.g., tzdata timezone selection)')
                            lines.insert(i + 4, 'ENV DEBIAN_FRONTEND=noninteractive')
                            lines.insert(i + 5, '')
                            modified = '\n'.join(lines)
                            logger.info("✅ Added DEBIAN_FRONTEND=noninteractive to Dockerfile")
                            break
            
            # Documentation files: VALIDATE and RETRY with feedback if needed
            if is_documentation:
                logger.info(f"✅ Documentation file {path} generated ({len(modified)} chars)")
                
                # Validation checks that might require retry
                validation_errors = []
                
                # CRITICAL: For modifications, output must be >= original length (we're adding content)
                if original and len(modified) < len(original):
                    validation_errors.append({
                        'type': 'length_check',
                        'message': f"Output is SHORTER than original ({len(modified)} < {len(original)} chars). You must PRESERVE all original content and ADD new sections, not replace content!"
                    })
                
                # CRITICAL: Must start with original beginning (but be lenient with trailing whitespace)
                if original and len(original) >= 100:
                    # Don't strip() - preserve exact content! Just normalize line endings
                    original_start = original[:100]
                    modified_start = modified[:100]
                    # Compare first 50 chars but allow minor whitespace variations
                    original_normalized = ' '.join(original_start[:50].split())
                    modified_normalized = ' '.join(modified_start[:50].split())
                    if not modified_normalized.startswith(original_normalized[:40]):
                        validation_errors.append({
                            'type': 'beginning_preservation',
                            'message': f"Output doesn't preserve original beginning!\n   Expected start: '{original_start[:80]}...'\n   Your start: '{modified_start[:80]}...'\n   You MUST start with the EXACT original beginning, then add new sections after."
                        })
                elif original and len(original) > 0:
                    # For shorter files, be very lenient - just check that original content exists in modified
                    # Allow AI to add content at beginning (like shebang) or end
                    original_normalized = ' '.join(original.split())
                    modified_normalized = ' '.join(modified.split())
                    if original_normalized not in modified_normalized:
                        validation_errors.append({
                            'type': 'beginning_preservation',
                            'message': f"Output doesn't contain original content!\n   Original ({len(original)} chars): '{original[:200]}...'\n   Your output ({len(modified)} chars): '{modified[:200]}...'\n   You must preserve ALL original content (it can appear anywhere in output)."
                        })
                
                # If validation failed, provide feedback to AI for retry
                if validation_errors:
                    logger.warning(f"⚠️ Documentation {path} has {len(validation_errors)} validation issues")
                    for i, err in enumerate(validation_errors, 1):
                        logger.warning(f"   {i}. {err['type']}: {err['message']}")
                    
                    # Instead of returning None, return a special marker that triggers retry
                    # The retry will happen with validation feedback in the prompt
                    return FileModification(
                        path=path,
                        original_content=original,
                        modified_content=modified,
                        explanation=reason,
                        change_type='modify',
                        validation_errors=validation_errors  # Pass errors for retry
                    )
            
            # Sanity check: modified file should not be empty or suspiciously small
            if len(modified) < 10:
                logger.error(f"❌ Generated file {path} is too short ({len(modified)} chars)")
                return None
            
            # Syntax validation for Python files - log warnings but don't reject
            if path.endswith('.py'):
                try:
                    compile(modified, path, 'exec')
                    logger.info(f"✅ Syntax validation passed for {path}")
                except SyntaxError as e:
                    logger.warning(f"⚠️ Syntax warning in {path}: {e}")
                    logger.warning(f"   File will still be delivered - git apply validation will be the final check")
                    logger.warning(f"   File length: {len(modified)} chars, {len(modified.splitlines())} lines")
                    # Log last few lines to see potential truncation
                    lines = modified.splitlines()
                    logger.warning(f"   Last 3 lines: {lines[-3:] if len(lines) >= 3 else lines}")
                    # Don't return None - let it through to git apply validation
            
            # Validate dependencies if this is requirements.txt
            if path.endswith('requirements.txt'):
                if not self._validate_requirements(original, modified):
                    logger.error(f"❌ Requirements validation failed for {path}")
                    return None
            
            return FileModification(
                path=path,
                original_content=original,
                modified_content=modified,
                explanation=reason,
                change_type='modify'
            )
    
    def _validate_requirements(self, original: str, modified: str) -> bool:
        """
        Validate that requirements.txt changes are safe and necessary.
        
        Returns:
            True if valid, False if suspicious dependencies found
        """
        old_deps = set(line.strip() for line in original.split('\n') if line.strip() and not line.startswith('#'))
        new_deps = set(line.strip() for line in modified.split('\n') if line.strip() and not line.startswith('#'))
        added_deps = new_deps - old_deps
        
        # Check for problematic dependencies
        PROBLEMATIC = {
            # 'pyaudio': 'Requires C compilation (gcc + PortAudio headers) - Docker has no build tools', # ALLOWED for client
            'pyttsx3': 'Requires system audio libraries (espeak, libespeak-dev) and often fails in Docker - use cloud TTS instead',
            'starlette': 'Already included with fastapi - redundant',
            'pydantic': 'Already included with fastapi - redundant',
            'h11': 'Already included with uvicorn - redundant',
            'httptools': 'Already included with uvicorn - redundant',
            'uvloop': 'Already included with uvicorn - redundant',
            'anyio': 'Already included with fastapi - redundant',
            'numpy': 'Requires C compilation - only add if explicitly needed',
            'scipy': 'Requires C compilation - only add if explicitly needed',
            'pillow': 'Requires C compilation - only add if explicitly needed',
            'lxml': 'Requires C compilation - only add if explicitly needed'
        }
        
        for dep_line in added_deps:
            dep_name = dep_line.split('==')[0].split('>=')[0].split('<=')[0].strip().lower()
            if dep_name in PROBLEMATIC:
                logger.error(f"❌ BLOCKED DEPENDENCY: {dep_name}")
                logger.error(f"   Reason: {PROBLEMATIC[dep_name]}")
                return False
        
        logger.info(f"✅ Requirements validation passed: {len(added_deps)} new dependencies")
        return True
    
    def _compute_unified_diff(self, modifications: List[FileModification]) -> str:
        """
        Compute unified diff from before/after files.
        
        This is GUARANTEED to be valid because we're using Python's difflib,
        not manually constructing hunks.
        
        CRITICAL: We preserve content as-is (no .rstrip()) to avoid git apply mismatches.
        Git can handle trailing whitespace - the issue is when diff doesn't match actual file.
        """
        diff_lines = []
        
        for mod in modifications:
            # Keep content exactly as-is - don't strip anything!
            # The .rstrip() was causing mismatches between patch and actual files
            original_content = mod.original_content if mod.original_content else ''
            modified_content = mod.modified_content if mod.modified_content else ''
            
            if mod.change_type == 'create':
                # New file
                diff_lines.append(f"--- /dev/null")
                diff_lines.append(f"+++ b/{mod.path}")
                new_lines = modified_content.splitlines(keepends=False)
                diff_lines.append(f"@@ -0,0 +1,{len(new_lines)} @@")
                for line in new_lines:
                    diff_lines.append(f"+{line}")
                diff_lines.append("")
            
            elif mod.change_type == 'delete':
                # Deleted file
                old_lines = original_content.splitlines(keepends=False)
                diff_lines.append(f"--- a/{mod.path}")
                diff_lines.append(f"+++ /dev/null")
                diff_lines.append(f"@@ -1,{len(old_lines)} +0,0 @@")
                for line in old_lines:
                    diff_lines.append(f"-{line}")
                diff_lines.append("")
            
            else:  # modify
                # Use Python's difflib for perfect diffs
                original_lines = original_content.splitlines(keepends=False)
                modified_lines = modified_content.splitlines(keepends=False)
                
                # Generate unified diff
                diff = difflib.unified_diff(
                    original_lines,
                    modified_lines,
                    fromfile=f"a/{mod.path}",
                    tofile=f"b/{mod.path}",
                    lineterm=''
                )
                
                diff_lines.extend(diff)
                diff_lines.append("")
        
        return '\n'.join(diff_lines)
    
    def _parse_file_list(self, response: str) -> List[Dict[str, Any]]:
        """Parse AI response to extract file list."""
        # Try to find JSON in response
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return data.get('files', [])
            except:
                pass
        
        # Try without code blocks
        try:
            data = json.loads(response)
            return data.get('files', [])
        except:
            pass
        
        logger.warning("Failed to parse file list, returning empty")
        return []
    
    def _extract_code(self, response: str) -> str:
        """Extract code from AI response."""
        # Remove markdown code blocks
        if '```' in response:
            # Check if this looks like documentation with multiple code blocks
            code_block_count = response.count('```') // 2
            
            if code_block_count > 1:
                # For docs with multiple code blocks, just remove the outer wrapper if present
                # Don't strip embedded examples
                if response.strip().startswith('```') and response.strip().endswith('```'):
                    # Find first code fence
                    first_fence = response.find('```')
                    first_newline = response.find('\n', first_fence)
                    # Find last code fence
                    last_fence = response.rfind('```')
                    # Extract content between first line after opening fence and last fence
                    code = response[first_newline + 1:last_fence].strip()
                    return code
                else:
                    # No outer wrapper, return as-is (it's documentation with code examples)
                    return response.strip()
            else:
                # Single code block - extract it
                match = re.search(r'```(?:\w+)?\s*\n(.*?)\n```', response, re.DOTALL)
                if match:
                    code = match.group(1).strip()
                    return self._remove_line_continuations(code)
        
        # Return as-is if no code blocks
        return self._remove_line_continuations(response.strip())
    
    def _remove_line_continuations(self, code: str) -> str:
        """
        Remove Python line continuation characters (backslash at end of line).
        
        The AI sometimes generates code like:
            result = some_function() \
                     + other_function()
        
        This converts it to implicit continuation:
            result = some_function() + other_function()
        
        This is safer and more Pythonic.
        """
        if not code:
            return code
        
        logger.info(f"🔍 Checking for line continuation characters in generated code ({len(code)} chars)")
        
        # Pattern: backslash followed by optional whitespace and newline
        # Replace with just a space (join the lines)
        original_lines = len(code.split('\n'))
        modified = re.sub(r'\\\s*\n\s*', ' ', code)
        
        if modified != code:
            lines_removed = original_lines - len(modified.split('\n'))
            logger.info(f"🔧 Removed {lines_removed} line continuation characters from AI-generated code")
            logger.info(f"   Example before: {code[:150]!r}")
            logger.info(f"   Example after: {modified[:150]!r}")
            return modified
        else:
            logger.info(f"✅ No line continuation characters found to remove")
        
        return code
    
    def _decode_escape_sequences(self, content: str) -> str:
        """
        Decode literal escape sequences from AI-generated code.
        
        AI models sometimes generate literal escape sequences like:
        - \\n instead of actual newlines
        - \\t instead of actual tabs
        - \\' or \\" instead of quotes
        
        This method detects and decodes these sequences SAFELY.
        
        CRITICAL: This function is DISABLED to prevent null byte corruption.
        The unicode_escape codec can introduce \x00 bytes which corrupt:
        - Python source code (syntax errors)
        - Git unified diffs (corrupt patch errors)
        
        Instead, AI models should generate properly formatted output directly.
        """
        # CRITICAL FIX: Do NOT decode escape sequences - it causes null byte corruption
        # The unicode_escape codec transforms certain byte sequences into \x00
        # This corrupts both Python files and git diffs
        # 
        # Example of corruption:
        #   Input:  "line\nwith\nbreaks"  (literal backslash-n)
        #   Decode: "line\nwith\nbreaks"   (actual newlines) - OK so far
        #   But:    "\x00" can appear from certain unicode sequences - CORRUPTION!
        #
        # Solution: Instruct AI models to generate proper Python/text directly
        logger.info(f"⚠️ Escape sequence decoding DISABLED to prevent null byte corruption")
        logger.info(f"   If content has literal \\\\n or \\\\t, this is an AI generation issue")
        return content


# Global instance
_generator = None

def get_generator(ai_client):
    """Get or create generator instance."""
    global _generator
    if _generator is None:
        _generator = CompleteFileGenerator(ai_client)
    return _generator
