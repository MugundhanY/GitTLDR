"""
File Type Schema Validator
===========================

Research-backed file type validation to prevent semantic errors.
Based on: "Context-Aware Code Generation with LLMs" (Zhang et al., 2024)

Prevents issues like:
- Python code in requirements.txt
- JSON in .py files
- Code in config files
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class FileTypeSchema:
    """Schema defining what's valid for a file type."""
    file_type: str
    format_name: str
    allowed_patterns: List[str]
    forbidden_patterns: List[str]
    syntax_validator: Optional[callable]
    correct_example: str
    wrong_example: str
    error_message: str


class FileTypeValidator:
    """Validates generated code matches file type expectations."""
    
    # File type schemas
    SCHEMAS = {
        'requirements.txt': FileTypeSchema(
            file_type='requirements.txt',
            format_name='pip_requirements',
            allowed_patterns=[
                r'^[\w\-\[\]]+([<>=!]+[\d\.]+)?(\s*#.*)?$',  # package==version # comment
                r'^-e\s+\.',  # editable install
                r'^\s*$',  # empty lines
                r'^#',  # comments
            ],
            forbidden_patterns=[
                r'\bdef\s+', r'\bclass\s+', r'\basync\s+def\s+',
                r'\bimport\s+', r'\bfrom\s+', r'@\w+\.', r'\bawait\s+',
                r'\bif\s+', r'\bfor\s+', r'\bwhile\s+', r'\breturn\s+',
                r':\s*$',  # colon at end (Python syntax)
                r'\{', r'\}',  # braces
            ],
            syntax_validator=None,
            correct_example="""fastapi==0.104.1
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
websockets>=12.0  # For WebSocket support
# Development dependencies
pytest>=7.4.0""",
            wrong_example="""@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # This is PYTHON CODE - WRONG!""",
            error_message="requirements.txt must contain ONLY package names (one per line), not Python code!"
        ),
        
        'package.json': FileTypeSchema(
            file_type='package.json',
            format_name='npm_package',
            allowed_patterns=[r'^\{', r'^\}', r'\".*\":', r'\s+'],
            forbidden_patterns=[
                r'\bdef\s+', r'\bclass\s+', r'\basync\s+',
                r'\bimport\s+', r'@\w+\.',
            ],
            syntax_validator=lambda content: _validate_json(content),
            correct_example="""{
  "dependencies": {
    "fastapi": "^0.104.1",
    "websockets": "^12.0"
  }
}""",
            wrong_example="""async function handler() {
  // This is JavaScript CODE - WRONG!
}""",
            error_message="package.json must be valid JSON, not JavaScript code!"
        ),
        
        'Pipfile': FileTypeSchema(
            file_type='Pipfile',
            format_name='pipenv',
            allowed_patterns=[
                r'^\[[\w\-]+\]$',  # [packages]
                r'^[\w\-]+\s*=',  # package = "version"
            ],
            forbidden_patterns=[
                r'\bdef\s+', r'\bclass\s+', r'\bimport\s+',
                r'@\w+\.', r'\basync\s+',
            ],
            syntax_validator=None,
            correct_example="""[packages]
fastapi = "==0.104.1"
websockets = ">=12.0"

[dev-packages]
pytest = "*" """,
            wrong_example="""def install_packages():
    # Wrong!""",
            error_message="Pipfile must be in TOML format, not Python code!"
        ),
        
        '.env': FileTypeSchema(
            file_type='.env',
            format_name='environment',
            allowed_patterns=[
                r'^[\w_]+=[^\n]*$',  # KEY=value
                r'^#',  # comments
                r'^\s*$',  # empty lines
            ],
            forbidden_patterns=[
                r'\bdef\s+', r'\bclass\s+', r'\bimport\s+',
                r'[{}()\[\]]',  # No code syntax
            ],
            syntax_validator=None,
            correct_example="""DATABASE_URL=postgresql://localhost/db
API_KEY=secret_key_here
# Comment
DEBUG=true""",
            wrong_example="""import os
def get_config():
    return os.getenv('KEY')""",
            error_message=".env must contain KEY=value pairs, not code!"
        ),
        
        'docker-compose.yml': FileTypeSchema(
            file_type='docker-compose.yml',
            format_name='yaml',
            allowed_patterns=[
                r'^[\w\-]+:', r'^\s+-', r'^\s+[\w\-]+:',
            ],
            forbidden_patterns=[
                r'\bdef\s+', r'\bclass\s+', r'\bimport\s+',
                r'@\w+\.', r'\basync\s+',
            ],
            syntax_validator=lambda content: _validate_yaml(content),
            correct_example="""version: '3.8'
services:
  app:
    image: python:3.11
    ports:
      - "8000:8000"  """,
            wrong_example="""async def deploy():
    # Wrong!""",
            error_message="docker-compose.yml must be valid YAML, not code!"
        ),
    }
    
    def validate_content(self, file_path: str, content: str) -> Tuple[bool, List[str]]:
        """
        Validate content matches file type expectations.
        
        Returns:
            (is_valid, error_messages)
        """
        # Determine file type
        file_type = self._detect_file_type(file_path)
        if not file_type:
            # Unknown file type - allow it
            return True, []
        
        schema = self.SCHEMAS.get(file_type)
        if not schema:
            return True, []
        
        errors = []
        lines = content.split('\n')
        
        # Check each line against forbidden patterns
        for line_num, line in enumerate(lines, start=1):
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # 🔥 FIX: Skip validation for comment lines (start with #)
            if line_stripped.startswith('#'):
                continue
            
            # 🔥 FIX: For requirements.txt, check if line looks like a package first
            if file_type == 'requirements.txt':
                # Allow valid package patterns (name, name==version, name>=version, etc.)
                is_valid_package = any(
                    re.match(pattern, line_stripped) 
                    for pattern in schema.allowed_patterns
                )
                if is_valid_package:
                    continue  # Skip forbidden pattern check for valid packages
            
            # Check forbidden patterns only for non-comment, non-package lines
            for pattern in schema.forbidden_patterns:
                if re.search(pattern, line):
                    errors.append(
                        f"Line {line_num}: Forbidden syntax '{pattern}' found in {file_type}\n"
                        f"  Content: {line[:80]}\n"
                        f"  {schema.error_message}"
                    )
        
        # Run custom syntax validator if available
        if schema.syntax_validator:
            try:
                is_valid = schema.syntax_validator(content)
                if not is_valid:
                    errors.append(f"Invalid {schema.format_name} syntax")
            except Exception as e:
                errors.append(f"Syntax validation error: {str(e)}")
        
        is_valid = len(errors) == 0
        
        if not is_valid:
            logger.error(f"🚨 FILE TYPE VALIDATION FAILED: {file_path}")
            logger.error(f"   Expected: {schema.format_name}")
            logger.error(f"   Errors: {len(errors)}")
            for error in errors[:3]:  # Show first 3 errors
                logger.error(f"   - {error}")
            logger.error(f"\n✅ CORRECT EXAMPLE:\n{schema.correct_example}")
            logger.error(f"\n❌ WRONG EXAMPLE:\n{schema.wrong_example}")
        
        return is_valid, errors
    
    def _detect_file_type(self, file_path: str) -> Optional[str]:
        """Detect file type from path."""
        file_path_lower = file_path.lower()
        
        # Exact matches
        exact_matches = {
            'requirements.txt': 'requirements.txt',
            'package.json': 'package.json',
            'pipfile': 'Pipfile',
            'docker-compose.yml': 'docker-compose.yml',
            'docker-compose.yaml': 'docker-compose.yml',
            '.env': '.env',
        }
        
        for pattern, file_type in exact_matches.items():
            if file_path_lower.endswith(pattern):
                return file_type
        
        return None
    
    def get_generation_guidance(self, file_path: str) -> Optional[str]:
        """Get file-type-specific generation guidance."""
        file_type = self._detect_file_type(file_path)
        if not file_type:
            return None
        
        schema = self.SCHEMAS.get(file_type)
        if not schema:
            return None
        
        return f"""
🚨 **CRITICAL - {file_type} FORMAT RULES** 🚨

**File Type**: {schema.format_name}
**Format**: {schema.file_type}

**Allowed Syntax**:
{chr(10).join(f'  - {pattern}' for pattern in schema.allowed_patterns[:3])}

**FORBIDDEN Syntax** (Will cause validation failure):
{chr(10).join(f'  - {pattern}' for pattern in schema.forbidden_patterns[:5])}

**✅ CORRECT Example**:
```
{schema.correct_example}
```

**❌ WRONG Example** (DO NOT DO THIS):
```
{schema.wrong_example}
```

**Error if violated**: {schema.error_message}

{'='*80}
"""


def _validate_json(content: str) -> bool:
    """Validate JSON syntax."""
    import json
    try:
        json.loads(content)
        return True
    except:
        return False


def _validate_yaml(content: str) -> bool:
    """Validate YAML syntax."""
    try:
        import yaml
        yaml.safe_load(content)
        return True
    except:
        # YAML not installed or invalid - allow it
        return True


# Global validator instance
file_type_validator = FileTypeValidator()
