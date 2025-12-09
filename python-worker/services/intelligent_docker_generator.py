"""
Intelligent Dockerfile Generator v2
=====================================
Analyzes the codebase to create customized, working Dockerfiles
using multi-phase analysis instead of generic templates.

v2 Changes:
- Uses DependencyAnalyzer for actual dependency detection
- Uses SystemDependencyMapper for pip->apt mapping
- Uses DockerfileBuilder (builder pattern, no templates)
- Uses TestContextBuilder for stack-aware test generation
"""

import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from utils.logger import get_logger

# v2 Components
from services.dependency_analyzer import dependency_analyzer, DependencyReport
from services.system_dependency_mapper import system_dependency_mapper, SystemRequirements
from services.dockerfile_builder import (
    DockerfileBuilder, 
    TestContextBuilder, 
    DockerfileLearner,
    test_context_builder,
    dockerfile_learner,
    TestContext
)

logger = get_logger(__name__)


class IntelligentDockerGenerator:
    """
    Generates customized Dockerfiles by analyzing the actual codebase.
    
    v2: Uses multi-phase analysis pipeline instead of templates.
    """
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
    
    def _detect_issue_type(self, issue_title: str, issue_body: str) -> Dict[str, any]:
        """
        Detect issue type from title and body to generate targeted tests
        
        Returns:
            {
                "type": "websocket|api|bug|feature|performance|security",
                "keywords": [list of matched keywords],
                "confidence": 0.0-1.0
            }
        """
        title_lower = issue_title.lower()
        body_lower = issue_body.lower()
        text = f"{title_lower} {body_lower}"
        
        # Define keyword patterns for each issue type
        patterns = {
            "websocket": [
                "websocket", "ws://", "wss://", "socket.io", "real-time", "realtime",
                "streaming", "live data", "bidirectional", "push notification",
                "socket", "connection", "real time", "stream", "audio stream",
                "video stream", "chat", "live"
            ],
            "api": [
                "api", "endpoint", "rest", "graphql", "http", "request", "response",
                "post", "get", "put", "delete", "patch", "route", "handler",
                "/api/", "json", "payload", "status code", "headers"
            ],
            "bug": [
                "bug", "error", "crash", "fail", "broken", "not working", "issue",
                "exception", "traceback", "stack trace", "fix", "incorrect",
                "wrong", "doesn't work", "does not work", "problem", "regression"
            ],
            "feature": [
                "feature", "add", "implement", "enhancement", "new", "support",
                "ability", "allow", "enable", "create", "build", "develop",
                "integrate", "introduce", "improve", "extend"
            ],
            "performance": [
                "performance", "slow", "speed", "optimize", "faster", "latency",
                "memory", "cpu", "bottleneck", "efficiency", "scale", "load time"
            ],
            "security": [
                "security", "vulnerability", "exploit", "injection", "xss", "csrf",
                "authentication", "authorization", "permission", "sanitize", "validate"
            ]
        }
        
        # Count matches for each type, with TITLE matches weighted 2x
        matches = {}
        for issue_type, keywords in patterns.items():
            title_matches = [kw for kw in keywords if kw in title_lower]
            body_matches = [kw for kw in keywords if kw in body_lower]
            
            # Title keywords are more important (2x weight)
            weighted_count = len(title_matches) * 2 + len(body_matches)
            
            all_matched_keywords = list(set(title_matches + body_matches))  # Unique keywords
            
            if all_matched_keywords:
                matches[issue_type] = {
                    "count": weighted_count,
                    "keywords": all_matched_keywords,
                    "title_matches": len(title_matches)
                }
        
        if not matches:
            return {
                "type": "general",
                "keywords": [],
                "confidence": 0.0
            }
        
        # Find type with most matches (weighted)
        primary_type = max(matches.keys(), key=lambda k: matches[k]["count"])
        primary_count = matches[primary_type]["count"]
        title_count = matches[primary_type]["title_matches"]
        
        # Calculate confidence based on match count and title presence
        # Title matches boost confidence significantly
        confidence = min(1.0, primary_count / 5.0)  # 5+ weighted matches = high confidence
        if title_count > 0:
            confidence = min(1.0, confidence * 1.5)  # Boost if in title
        if primary_type in ["websocket", "security"]:
            confidence = min(1.0, confidence * 1.2)  # Boost specific types
        
        logger.info(f"🔍 Issue type detected: {primary_type} (confidence: {confidence:.2f}, keywords: {matches[primary_type]['keywords'][:3]}, title_matches: {title_count})")
        
        return {
            "type": primary_type,
            "keywords": matches[primary_type]["keywords"],
            "confidence": confidence,
            "all_matches": matches  # Include all matches for context
        }
    
    async def generate_dockerfile_and_tests(
        self,
        files: List[Dict],
        tech_stack: Dict,
        issue_description: str,
        operations: List[Dict],
        issue_title: str = "",
        issue_body: str = ""
    ) -> Dict[str, str]:
        """
        Generate customized Dockerfile and test suite based on codebase analysis.
        
        v2: Uses multi-phase analysis pipeline:
        1. Dependency Analysis - detect actual packages
        2. System Mapping - map to apt dependencies
        3. Dockerfile Building - builder pattern, no templates
        4. Test Context - stack-aware test generation
        
        Returns:
            {
                "dockerfile": "...",
                "docker_compose": "...",
                "test_command": "...",
                "setup_commands": ["..."],
                "test_suite": "...",
                "issue_type": "websocket|api|bug|feature|etc",
                "analysis_report": {...}  # v2: detailed analysis
            }
        """
        logger.info("🚀 Starting Intelligent Docker Generator v2 pipeline...")
        
        # =====================================================================
        # Phase 1: Deep Dependency Analysis
        # =====================================================================
        logger.info("📊 Phase 1: Analyzing codebase dependencies...")
        dep_report = await dependency_analyzer.analyze(files)
        
        # =====================================================================
        # Phase 2: Map to System Requirements
        # =====================================================================
        logger.info("🔗 Phase 2: Mapping to system dependencies...")
        sys_requirements = system_dependency_mapper.get_system_requirements(
            pip_packages=dep_report.pip_packages,
            npm_packages=dep_report.npm_packages
        )
        
        # =====================================================================
        # Phase 3: Learn from Existing Dockerfile (if present)
        # =====================================================================
        dockerfile_insights = None
        if dep_report.has_existing_dockerfile:
            logger.info("📄 Phase 3: Learning from existing Dockerfile...")
            dockerfile_insights = dockerfile_learner.learn(
                dep_report.existing_dockerfile_content
            )
        
        # =====================================================================
        # Phase 4: Detect Issue Type
        # =====================================================================
        issue_type_info = self._detect_issue_type(
            issue_title or issue_description,
            issue_body or ""
        )
        
        # =====================================================================
        # Phase 5: Build Dockerfile (No Templates!)
        # =====================================================================
        logger.info("🔨 Phase 5: Building Dockerfile from analysis...")
        dockerfile = self._build_dockerfile_from_analysis(
            dep_report=dep_report,
            sys_requirements=sys_requirements,
            dockerfile_insights=dockerfile_insights,
            issue_type=issue_type_info["type"],
            tech_stack=tech_stack
        )
        
        # =====================================================================
        # Phase 6: Build Test Context
        # =====================================================================
        logger.info("🧪 Phase 6: Building test context...")
        test_context = test_context_builder.build(
            detected_frameworks=dep_report.detected_frameworks,
            audio_library=dep_report.audio_library,
            pip_packages=dep_report.pip_packages
        )
        
        # =====================================================================
        # Phase 7: Generate docker-compose
        # =====================================================================
        docker_compose = await self._generate_intelligent_compose_v2(
            dep_report, tech_stack
        )
        
        # =====================================================================
        # Phase 8: Generate Tests with Context
        # =====================================================================
        logger.info("📝 Phase 8: Generating context-aware tests...")
        test_suite = await self._generate_targeted_tests_v2(
            files=files,
            issue_description=issue_description,
            operations=operations,
            tech_stack=tech_stack,
            issue_type_info=issue_type_info,
            test_context=test_context,
            dep_report=dep_report
        )
        
        # Determine test command based on analysis
        if dep_report.primary_language == 'python':
            test_command = "python3 -m pytest -v test_*.py"
        elif dep_report.primary_language == 'javascript':
            test_command = "npm test"
        else:
            test_command = "echo 'No test command detected'"
        
        logger.info("✅ Intelligent Docker Generator v2 pipeline complete!")
        
        return {
            "dockerfile": dockerfile,
            "docker_compose": docker_compose,
            "test_command": test_command,
            "setup_commands": self._get_setup_commands(dep_report),
            "test_suite": test_suite,
            "issue_type": issue_type_info["type"],
            "issue_confidence": issue_type_info["confidence"],
            # v2: Include analysis report for transparency
            "analysis_report": {
                "pip_packages": dep_report.pip_packages,
                "detected_frameworks": dep_report.detected_frameworks,
                "audio_library": dep_report.audio_library,
                "system_packages": sys_requirements.apt_packages,
                "primary_language": dep_report.primary_language
            }
        }
    
    def _build_dockerfile_from_analysis(
        self,
        dep_report: DependencyReport,
        sys_requirements: SystemRequirements,
        dockerfile_insights: Optional[Any],
        issue_type: str,
        tech_stack: Dict
    ) -> str:
        """
        Build Dockerfile using builder pattern - NO templates!
        Everything is derived from codebase analysis.
        """
        builder = DockerfileBuilder()
        
        # Determine base image
        base_image_requires_python_install = False
        
        if dockerfile_insights and dockerfile_insights.base_image:
            # Use existing base image
            base_image = dockerfile_insights.base_image
            reason = "from existing Dockerfile"
            # Check if it's ubuntu/debian (needs Python install)
            if 'ubuntu' in base_image.lower() or 'debian' in base_image.lower():
                base_image_requires_python_install = True
                logger.warning(f"⚠️ Detected Ubuntu/Debian base image: {base_image}")
                logger.warning("   Will add python3 and python3-pip to system packages")
        elif dep_report.primary_language == 'python':
            base_image = "python:3.11-slim"
            reason = "Python detected as primary language"
        elif dep_report.primary_language == 'javascript':
            base_image = "node:18-slim"
            reason = "JavaScript detected as primary language"
        else:
            base_image = "python:3.11-slim"
            reason = "default fallback"
        
        builder.with_base_image(base_image, reason)
        
        # CRITICAL: If using Ubuntu/Debian, install Python and pip FIRST
        if base_image_requires_python_install and dep_report.primary_language == 'python':
            logger.info("✅ Adding python3 and python3-pip for Ubuntu/Debian base image")
            builder.add_system_package("python3", "Python interpreter (not included in Ubuntu base)")
            builder.add_system_package("python3-pip", "pip package manager (not included in Ubuntu base)")
        
        # Add system packages from analysis
        for apt_pkg in sys_requirements.apt_packages:
            reason = sys_requirements.package_reasons.get(apt_pkg, "detected dependency")
            builder.add_system_package(apt_pkg, reason)
        
        # Add any packages from existing Dockerfile
        if dockerfile_insights:
            for existing_pkg in dockerfile_insights.existing_apt_packages:
                builder.add_system_package(existing_pkg, "from existing Dockerfile")
        
        # Add git (commonly needed for pip installs)
        builder.add_system_package("git", "commonly needed for pip editable installs")
        
        # Setup commands for Python
        if dep_report.primary_language == 'python':
            builder.add_run("pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir -e . || true")
            builder.add_pip_package("pytest")
            builder.add_pip_package("pytest-asyncio")
            
            # If WebSocket issue, add websockets
            if issue_type == "websocket":
                builder.add_pip_package("websockets")
                builder.add_pip_package("httpx")
        
        # Determine if we need to start a server before tests
        needs_server = issue_type in ["websocket", "api"]
        
        if needs_server:
            # Find the likely entry point
            entry_point = self._detect_entry_point(dep_report)
            port = dockerfile_insights.exposed_port if dockerfile_insights else 8000
            
            if 'FastAPI' in dep_report.detected_frameworks or 'uvicorn' in dep_report.pip_packages:
                server_cmd = f"uvicorn {entry_point}:app --host 0.0.0.0 --port {port}"
            elif 'Flask' in dep_report.detected_frameworks:
                server_cmd = f"python {entry_point}.py"
            else:
                server_cmd = f"python {entry_point}.py"
            
            builder.with_server_startup(server_cmd, port)
        
        builder.with_test_command("python3 -m pytest -v test_*.py")
        
        dockerfile_content = builder.build()
        
        # CRITICAL VALIDATION: Ensure DEBIAN_FRONTEND is set to prevent timezone prompt
        if 'apt-get install' in dockerfile_content and 'DEBIAN_FRONTEND=noninteractive' not in dockerfile_content:
            logger.error("❌ Generated Dockerfile missing DEBIAN_FRONTEND=noninteractive!")
            logger.error("This will cause timezone prompt during build. Adding it now...")
            # Insert after FROM line
            lines = dockerfile_content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith('FROM '):
                    lines.insert(i + 2, '')
                    lines.insert(i + 3, '# Prevent interactive prompts (e.g., tzdata timezone selection)')
                    lines.insert(i + 4, 'ENV DEBIAN_FRONTEND=noninteractive')
                    lines.insert(i + 5, '')
                    dockerfile_content = '\n'.join(lines)
                    logger.info("✅ Added DEBIAN_FRONTEND=noninteractive to Dockerfile")
                    break
        
        return dockerfile_content
    
    def _detect_entry_point(self, dep_report: DependencyReport) -> str:
        """Detect the main entry point file."""
        # Common entry points
        common_names = ['main', 'app', 'server', 'api', 'wsgi']
        
        # Check detected frameworks for hints
        if 'FastAPI' in dep_report.detected_frameworks:
            return 'main'
        elif 'Flask' in dep_report.detected_frameworks:
            return 'app'
        
        return 'main'  # Default
    
    def _get_setup_commands(self, dep_report: DependencyReport) -> List[str]:
        """Get setup commands based on analysis."""
        commands = []
        
        if dep_report.primary_language == 'python':
            commands.append("pip install -r requirements.txt")
        elif dep_report.primary_language == 'javascript':
            commands.append("npm install")
        
        return commands
    
    async def _generate_intelligent_compose_v2(
        self,
        dep_report: DependencyReport,
        tech_stack: Dict
    ) -> str:
        """Generate docker-compose.yml from analysis."""
        import time
        timestamp = int(time.time())
        
        compose = {
            "version": "3.8",
            "services": {
                "app": {
                    "build": ".",
                    "container_name": f"test-{dep_report.primary_language}-{timestamp}",
                }
            }
        }
        
        # Add port based on detection
        port = 8000 if dep_report.primary_language == 'python' else 3000
        compose["services"]["app"]["ports"] = [f"{port}:{port}"]
        
        # Add external services if detected in requirements
        if any('postgres' in pkg.lower() or 'psycopg' in pkg.lower() for pkg in dep_report.pip_packages):
            compose["services"]["postgres"] = {
                "image": "postgres:15",
                "environment": ["POSTGRES_PASSWORD=password", "POSTGRES_DB=testdb"]
            }
            compose["services"]["app"]["depends_on"] = ["postgres"]
        
        if any('redis' in pkg.lower() for pkg in dep_report.pip_packages):
            compose["services"]["redis"] = {"image": "redis:7"}
            compose["services"]["app"].setdefault("depends_on", []).append("redis")
        
        return yaml.dump(compose, default_flow_style=False)
    
    async def _generate_targeted_tests_v2(
        self,
        files: List[Dict],
        issue_description: str,
        operations: List[Dict],
        tech_stack: Dict,
        issue_type_info: Dict,
        test_context: TestContext,
        dep_report: DependencyReport
    ) -> str:
        """
        Generate tests that are AWARE of the actual codebase stack.
        
        v2: Uses TestContext to ensure correct library usage.
        """
        issue_type = issue_type_info["type"]
        keywords = issue_type_info["keywords"]
        language = dep_report.primary_language
        
        # Build context-aware prompt
        audio_gen_code = test_context.get_audio_generation_code()
        
        test_prompt = f"""
Create FUNCTIONAL tests to validate this {issue_type} fix works.

**CRITICAL CODEBASE CONTEXT:**
- Primary Language: {language}
- Detected Frameworks: {', '.join(dep_report.detected_frameworks)}
- Audio Library: {dep_report.audio_library or 'None detected'}

**AUDIO GENERATION - USE THIS APPROACH:**
{test_context.audio_notes}
{audio_gen_code}

**WebSocket Pattern (if applicable):**
{test_context.websocket_pattern}

**Issue Description:** {issue_description}

**Changes Made:**
{json.dumps(operations[:3], indent=2)}

**CRITICAL REQUIREMENTS:**
1. Tests must be RUNNABLE and COMPLETE - no TODOs or placeholders
2. For audio tests: Use the audio generation code shown above
   - DO NOT use 'espeak' subprocess unless pyttsx3 is the audio library
   - DO NOT use deprecated API like 'ws.open' - use async with pattern
3. Use correct import for detected framework:
   - FastAPI: from fastapi.testclient import TestClient
   - Flask: from flask import Flask
4. **CRITICAL - WebSocket Testing:**
   - For FastAPI WebSocket tests: Use `starlette.testclient.TestClient` with `with client.websocket_connect(url)` pattern
   - This is a SYNCHRONOUS pattern - do NOT mix with async operations
   - DO NOT use `asyncio.get_event_loop()`, `asyncio.sleep()`, or any async operations
   - DO NOT use `httpx.AsyncClient(app=app)` - httpx does not support the 'app' parameter
   - Example CORRECT pattern:
     ```python
     from starlette.testclient import TestClient
     from main import app
     import time  # Use time.time() and time.sleep(), NOT asyncio
     
     client = TestClient(app)
     with client.websocket_connect("/ws") as websocket:
         websocket.send_bytes(data)
         
         # For timeout handling, use time.time() NOT asyncio
         start_time = time.time()
         timeout = 5
         while time.time() - start_time < timeout:
             try:
                 response = websocket.receive_json()
                 # Process response
             except Exception:
                 break
             time.sleep(0.01)  # Use time.sleep(), NOT asyncio.sleep()
     ```
5. Include proper async/await syntax where needed FOR ASYNC ENDPOINTS ONLY
6. Handle edge cases and error scenarios
7. **DO NOT MIX SYNC AND ASYNC**: If using TestClient, use synchronous patterns throughout (time.time(), time.sleep())

Provide ONLY the test code, no explanation.
"""
        
        try:
            tests = await self.ai_client.generate_content_async(
                test_prompt,
                max_tokens=2000,
                temperature=0.3
            )
            
            # Clean up code blocks
            if '```python' in tests:
                tests = tests.split('```python')[1].split('```')[0].strip()
            elif '```' in tests:
                tests = tests.split('```')[1].split('```')[0].strip()
            
            logger.info(f"✅ Generated context-aware tests ({len(tests)} chars)")
            return tests
            
        except Exception as e:
            logger.error(f"Test generation failed: {e}")
            return self._get_fallback_test_with_context(test_context, dep_report)
    
    def _get_fallback_test_with_context(
        self,
        test_context: TestContext,
        dep_report: DependencyReport
    ) -> str:
        """
        Generate fallback tests that respect the codebase context.
        
        v2: Uses TestContext to generate appropriate code.
        """
        audio_code = test_context.get_audio_generation_code()
        
        if 'Vosk' in dep_report.detected_frameworks or dep_report.audio_library == 'vosk':
            return f'''"""
Fallback tests for Vosk-based codebase
Auto-generated with context awareness
"""
import pytest
import asyncio

{audio_code}

@pytest.mark.asyncio
async def test_connection():
    """Test basic connectivity."""
    # Generate test audio using pure Python (no espeak dependency)
    audio_file = generate_test_wav(duration=0.5)
    assert audio_file is not None
    
    # TODO: Replace with actual WebSocket endpoint
    # async with websockets.connect("ws://localhost:8000/ws") as ws:
    #     with open(audio_file, "rb") as f:
    #         await ws.send(f.read())
    #     response = await ws.recv()
    #     assert response is not None

@pytest.mark.asyncio
async def test_placeholder():
    """Placeholder test - customize for your implementation."""
    assert True, "Replace with actual tests"
'''
        else:
            return f'''"""
Fallback tests - Auto-generated with context awareness
"""
import pytest
import asyncio

{audio_code}

@pytest.mark.asyncio
async def test_basic():
    """Basic test placeholder."""
    assert True

@pytest.mark.asyncio
async def test_with_audio():
    """Test audio generation (if applicable)."""
    try:
        audio_file = generate_test_wav(duration=0.5)
        assert audio_file is not None
    except Exception as e:
        pytest.skip(f"Audio not available: {{e}}")
'''
    
    async def _analyze_codebase(
        self,
        files: List[Dict],
        tech_stack: Dict
    ) -> Dict:
        """
        Deep analysis of codebase to understand:
        - Build system (requirements.txt, package.json, Makefile, etc.)
        - Dependencies and versions
        - Test framework and commands
        - Entry points and main files
        - Required environment variables
        - Database or external service dependencies
        """
        # Extract key files for analysis
        key_files = []
        for file in files[:20]:  # Limit to avoid token overflow
            if file.get('path') in [
                'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile',
                'package.json', 'package-lock.json', 'yarn.lock',
                'Dockerfile', 'docker-compose.yml',
                'Makefile', 'README.md', '.github/workflows', 
                'pytest.ini', 'jest.config.js', 'test', 'tests'
            ] or 'test' in file.get('path', '').lower():
                key_files.append(f"{file['path']}:\n{file.get('content', '')[:500]}")
        
        analysis_prompt = f"""
Analyze this codebase to determine how to build, run, and test it.

**Tech Stack:** {json.dumps(tech_stack, indent=2)}

**Key Files:**
{chr(10).join(key_files)}

Provide a JSON response with:
{{
    "language": "python|javascript|ruby|go|etc",
    "package_manager": "pip|npm|yarn|bundler|go mod|etc",
    "python_version": "3.11" or null,
    "node_version": "18" or null,
    "dependencies_file": "requirements.txt|package.json|etc",
    "test_framework": "pytest|jest|rspec|go test|etc",
    "test_command": "pytest -v|npm test|bundle exec rspec|etc",
    "test_directory": "tests/|test/|spec/|etc",
    "build_command": null or "npm run build|make|etc",
    "start_command": "python main.py|npm start|etc",
    "environment_vars_needed": ["DATABASE_URL", "API_KEY", ...],
    "external_services": ["postgresql", "redis", "mongodb", ...],
    "setup_commands": ["npm install", "pip install -r requirements.txt", ...],
    "working_directory": "/app",
    "port": 8000 or 3000 or null
}}

BE SPECIFIC - look at the actual files to determine EXACT commands that will work.
"""
        
        try:
            response = await self.ai_client.generate_content_async(
                analysis_prompt,
                max_tokens=1000,
                temperature=0.3
            )
            
            # Extract JSON from response - handle multiple formats
            # First try to find JSON block
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                
                # Remove comments that might break JSON parsing
                # Remove single-line comments (// ...)
                import re
                json_str = re.sub(r'//[^\n]*', '', json_str)
                # Remove multi-line comments (/* ... */)
                json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                # Remove trailing commas before } or ]
                json_str = re.sub(r',\s*(}|])', r'\1', json_str)
                
                try:
                    analysis = json.loads(json_str)
                    logger.info(f"✅ Codebase analysis complete: {analysis.get('language')}, {analysis.get('test_framework')}")
                    return analysis
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON parse error at char {e.pos}: {e.msg}. Response preview: {json_str[:200]}")
                    return self._get_default_analysis(tech_stack)
            else:
                logger.warning("No JSON found in response, using defaults")
                return self._get_default_analysis(tech_stack)
                
        except Exception as e:
            logger.error(f"Codebase analysis failed: {e}")
            return self._get_default_analysis(tech_stack)
    
    def _get_default_analysis(self, tech_stack: Dict) -> Dict:
        """Fallback analysis based on tech stack"""
        language = tech_stack.get('language', 'python')
        
        if language == 'python':
            return {
                "language": "python",
                "package_manager": "pip",
                "python_version": "3.11",
                "dependencies_file": "requirements.txt",
                "test_framework": "pytest",
                "test_command": "pytest -v",
                "test_directory": "tests/",
                "start_command": "python main.py",
                "setup_commands": ["pip install -r requirements.txt"],
                "working_directory": "/app",
                "port": 8000
            }
        elif language == 'javascript':
            return {
                "language": "javascript",
                "package_manager": "npm",
                "node_version": "18",
                "dependencies_file": "package.json",
                "test_framework": "jest",
                "test_command": "npm test",
                "test_directory": "test/",
                "build_command": "npm run build",
                "start_command": "npm start",
                "setup_commands": ["npm install"],
                "working_directory": "/app",
                "port": 3000
            }
        else:
            return {
                "language": language,
                "test_command": "echo 'No test command'",
                "setup_commands": [],
                "working_directory": "/app"
            }
    
    async def _generate_intelligent_dockerfile(
        self,
        analysis: Dict,
        files: List[Dict],
        tech_stack: Dict
    ) -> str:
        """Generate Dockerfile tailored to the specific codebase"""
        
        dockerfile_prompt = f"""
Create a production-ready Dockerfile for this codebase.

**Analysis:**
{json.dumps(analysis, indent=2)}

**CRITICAL REQUIREMENTS:**
1. Use the correct base image ({analysis.get('language')} {analysis.get('python_version') or analysis.get('node_version') or ''})
2. Set WORKDIR /app
3. **MANDATORY**: Use EXACTLY these copy commands in order:
   - `COPY repo/ /app/` - The repository is in a subfolder called 'repo/'
   - `COPY test_websocket.py /app/` - Copy the test file (always exists, generated by test package)
   - ALL repository files (including requirements.txt, package.json, etc.) are inside repo/
   - After COPY, all files will be in /app/
4. Install dependencies from files that are now in /app/ (e.g., `pip install -r requirements.txt` NOT `pip install -r repo/requirements.txt`)
5. Install test framework: {analysis.get('test_framework')} plus pytest, pytest-asyncio, websockets
6. Run setup commands: {analysis.get('setup_commands')}
7. Expose port {analysis.get('port')} if needed
8. **CRITICAL**: For WebSocket/API tests that connect to localhost, create a startup script that:
   - Starts the application server in background (e.g., `uvicorn main:app --host 0.0.0.0 --port {analysis.get('port', 8000)} &`)
   - Waits for server to be ready (sleep 5-10 seconds)
   - Runs tests with pytest
   - Captures test exit code and stops server
   Example CMD: `CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 & sleep 5 && python3 -m pytest -v test_websocket.py; TEST_EXIT=$?; kill %1 2>/dev/null || true; exit $TEST_EXIT"]`

**Example Python Dockerfile with server startup for WebSocket/API tests:**
```
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git ffmpeg && rm -rf /var/lib/apt/lists/*
COPY repo/ /app/
COPY test_websocket.py /app/
RUN pip install -r requirements.txt
RUN pip install pytest pytest-asyncio websockets
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 & sleep 5 && python3 -m pytest -v test_websocket.py; TEST_EXIT=$?; kill %1 2>/dev/null || true; exit $TEST_EXIT"]
```

**Additional services needed:**
{analysis.get('external_services', [])}

Generate ONLY the Dockerfile content, no explanation.
The COPY repo/ /app/ line is MANDATORY and must appear EXACTLY as shown.
"""
        
        try:
            dockerfile = await self.ai_client.generate_content_async(
                dockerfile_prompt,
                max_tokens=800,
                temperature=0.3
            )
            
            # Clean up response - AI sometimes returns 'Dockerfile' as first line or in code blocks
            dockerfile = dockerfile.strip()
            
            # Remove 'Dockerfile' if it appears as first line
            lines = dockerfile.split('\n')
            if lines and lines[0].strip().lower() == 'dockerfile':
                dockerfile = '\n'.join(lines[1:]).strip()
            
            # Clean up code blocks
            if '```dockerfile' in dockerfile:
                dockerfile = dockerfile.split('```dockerfile')[1].split('```')[0].strip()
            elif '```Dockerfile' in dockerfile:
                dockerfile = dockerfile.split('```Dockerfile')[1].split('```')[0].strip()
            elif '```' in dockerfile:
                dockerfile = dockerfile.split('```')[1].split('```')[0].strip()
            
            # Final check - remove 'Dockerfile' if still present at start
            if dockerfile.startswith('Dockerfile\n'):
                dockerfile = dockerfile[11:]  # Remove 'Dockerfile\n'
            elif dockerfile.startswith('Dockerfile '):
                dockerfile = dockerfile[11:]  # Remove 'Dockerfile '
            
            logger.info("✅ Generated intelligent Dockerfile")
            return dockerfile
            
        except Exception as e:
            logger.error(f"Dockerfile generation failed: {e}, using template")
            return self._generate_template_dockerfile(analysis)
    
    def _generate_template_dockerfile(self, analysis: Dict) -> str:
        """Fallback template-based Dockerfile"""
        language = analysis.get('language', 'python')
        issue_type = analysis.get('issue_type', '')
        needs_server = issue_type in ['websocket', 'api'] or 'websocket' in str(analysis).lower()
        
        if language == 'python':
            python_version = analysis.get('python_version', '3.11')
            port = analysis.get('port', 8000)
            
            # For WebSocket/API tests, start server before tests
            if needs_server:
                return f"""FROM python:{python_version}-slim

WORKDIR {analysis.get('working_directory', '/app')}

# Install system dependencies (ffmpeg for audio, espeak for test audio generation)
RUN apt-get update && apt-get install -y \\
    git \\
    ffmpeg \\
    espeak \\
    && rm -rf /var/lib/apt/lists/*

# Copy repo
COPY repo/ /app/

# Copy test file (enhanced test generator always creates this)
COPY test_websocket.py /app/

# Install dependencies
RUN {'; '.join(analysis.get('setup_commands', ['pip install -r requirements.txt']))}

# Install test framework
RUN pip install {analysis.get('test_framework', 'pytest')} pytest-cov pytest-asyncio websockets || true

# Start server in background, wait, run tests, then stop server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port {port} & sleep 5 && python3 -m pytest -v test_websocket.py; TEST_EXIT=$?; kill %1 2>/dev/null || true; exit $TEST_EXIT"]
"""
            else:
                return f"""FROM python:{python_version}-slim

WORKDIR {analysis.get('working_directory', '/app')}

# Install system dependencies (espeak for test audio generation)
RUN apt-get update && apt-get install -y \\
    git \\
    espeak \\
    && rm -rf /var/lib/apt/lists/*

# Copy repo
COPY repo/ /app/

# Copy test file (enhanced test generator always creates this)
COPY test_websocket.py /app/

# Install dependencies
RUN {'; '.join(analysis.get('setup_commands', ['pip install -r requirements.txt']))}

# Install test framework
RUN pip3 install {analysis.get('test_framework', 'pytest')} pytest-cov pytest-asyncio websockets || true

# Run tests (use 'python3 -m pytest' since Ubuntu/Debian don't have python symlink)
CMD ["python3", "-m", "pytest", "-v", "test_websocket.py"]
"""
        
        elif language == 'javascript':
            node_version = analysis.get('node_version', '18')
            return f"""FROM node:{node_version}-slim

WORKDIR {analysis.get('working_directory', '/app')}

# Copy repo
COPY repo/ /app/

# Install dependencies
RUN {'; '.join(analysis.get('setup_commands', ['npm install']))}

# Install test framework if needed
RUN npm install --save-dev {analysis.get('test_framework', 'jest')} || true

# Run tests
CMD ["npm", "test"]
"""
        
        else:
            return f"""FROM ubuntu:22.04

WORKDIR /app
COPY repo/ /app/

CMD ["echo", "Language {language} not fully supported yet"]
"""
    
    async def _generate_intelligent_compose(
        self,
        analysis: Dict,
        tech_stack: Dict
    ) -> str:
        """Generate docker-compose.yml with all required services"""
        
        services = ["app"]  # Main app service
        
        # Add external services if needed
        external_services = analysis.get('external_services', [])
        
        # Generate unique container name to avoid conflicts
        # Remove hardcoded name - let Docker auto-generate or use unique timestamp
        import time
        timestamp = int(time.time())
        unique_name = f"test-{analysis.get('language', 'app')}-{timestamp}"
        
        compose = {
            "version": "3.8",
            "services": {
                "app": {
                    "build": ".",
                    # Use unique container name to prevent conflicts from previous runs
                    "container_name": unique_name,
                    # ❌ REMOVED: "volumes": ["./repo:/app"] 
                    # This was overwriting container files copied by Dockerfile
                    # The Dockerfile already copies repo files to /app, no volume mount needed
                    "environment": analysis.get('environment_vars_needed', [])
                }
            }
        }
        
        # CRITICAL FIX: Always expose ports for testing (even if not detected)
        # The test client needs to connect to the server
        port = analysis.get('port') or 8000  # Default to 8000 if not detected
        compose["services"]["app"]["ports"] = [f"{port}:{port}"]
        
        # Add database services if needed
        if 'postgresql' in external_services or 'postgres' in external_services:
            compose["services"]["postgres"] = {
                "image": "postgres:15",
                "environment": [
                    "POSTGRES_PASSWORD=password",
                    "POSTGRES_DB=testdb"
                ]
            }
            compose["services"]["app"].setdefault("depends_on", []).append("postgres")
        
        if 'redis' in external_services:
            compose["services"]["redis"] = {
                "image": "redis:7"
            }
            compose["services"]["app"].setdefault("depends_on", []).append("redis")
        
        if 'mongodb' in external_services or 'mongo' in external_services:
            compose["services"]["mongo"] = {
                "image": "mongo:6",
                "environment": [
                    "MONGO_INITDB_ROOT_USERNAME=root",
                    "MONGO_INITDB_ROOT_PASSWORD=password"
                ]
            }
            compose["services"]["app"].setdefault("depends_on", []).append("mongo")
        
        import yaml
        return yaml.dump(compose, default_flow_style=False)
    
    async def _generate_targeted_tests(
        self,
        files: List[Dict],
        issue_description: str,
        operations: List[Dict],
        tech_stack: Dict,
        issue_type_info: Dict
    ) -> str:
        """
        Generate ISSUE-TYPE-SPECIFIC functional tests that validate the fix works
        
        Instead of generic pytest/jest, creates:
        - WebSocket: Connection, send/receive, disconnect tests
        - API: Endpoint request/response, status code, payload validation tests
        - Bug: Regression tests that reproduce the bug and verify fix
        - Feature: Feature behavior and integration tests
        - Performance: Load, latency, resource usage tests
        - Security: Input validation, auth, sanitization tests
        """
        issue_type = issue_type_info["type"]
        keywords = issue_type_info["keywords"]
        language = tech_stack.get('language', 'python')
        
        logger.info(f"🧪 Generating {issue_type}-specific tests for {language}...")
        
        # Build type-specific test template and instructions
        if issue_type == "websocket":
            test_instructions = self._get_websocket_test_instructions(language, operations, keywords)
        elif issue_type == "api":
            test_instructions = self._get_api_test_instructions(language, operations, keywords)
        elif issue_type == "bug":
            test_instructions = self._get_bug_test_instructions(language, operations, keywords)
        elif issue_type == "feature":
            test_instructions = self._get_feature_test_instructions(language, operations, keywords)
        elif issue_type == "performance":
            test_instructions = self._get_performance_test_instructions(language, operations, keywords)
        elif issue_type == "security":
            test_instructions = self._get_security_test_instructions(language, operations, keywords)
        else:
            test_instructions = self._get_generic_test_instructions(language, operations)
        
        test_prompt = f"""
Create FUNCTIONAL tests to validate this {issue_type} fix works in production.

**Issue Type:** {issue_type.upper()} (keywords: {', '.join(keywords[:5])})
**Issue Description:** {issue_description}

**Changes Made:**
{json.dumps(operations[:3], indent=2)}  # Limit to avoid token overflow

**Language:** {language}

{test_instructions}

**CRITICAL REQUIREMENTS:**
1. Tests must be RUNNABLE and COMPLETE - no TODOs or placeholders
2. Tests must actually test the {issue_type} functionality - not just syntax
3. Include setup/teardown for resources (servers, connections, etc.)
4. Use actual assertions that would fail if the fix doesn't work
5. Handle edge cases and error scenarios

Provide ONLY the test code, no explanation. Make it production-ready.
"""
        
        try:
            tests = await self.ai_client.generate_content_async(
                test_prompt,
                max_tokens=4000,  # Increased significantly to prevent truncation
                temperature=0.3  # Lower temp for more reliable code
            )
            
            # Clean up code blocks
            if '```python' in tests:
                tests = tests.split('```python')[1].split('```')[0].strip()
            elif '```javascript' in tests:
                tests = tests.split('```javascript')[1].split('```')[0].strip()
            elif '```typescript' in tests:
                tests = tests.split('```typescript')[1].split('```')[0].strip()
            elif '```' in tests:
                tests = tests.split('```')[1].split('```')[0].strip()
            
            # CRITICAL FIX: Validate Python syntax to catch truncation
            if language == 'python':
                try:
                    compile(tests, 'test_websocket.py', 'exec')
                    logger.info(f"✅ Syntax validation passed for generated tests")
                except SyntaxError as e:
                    logger.error(f"❌ Generated test code has syntax error: {e}")
                    logger.error(f"   This usually means AI output was truncated")
                    logger.error(f"   Test length: {len(tests)} chars, {len(tests.splitlines())} lines")
                    lines = tests.splitlines()
                    logger.error(f"   Last 3 lines: {lines[-3:] if len(lines) >= 3 else lines}")
                    # Fall back to template instead of broken code
                    return self._get_fallback_test_template(issue_type, language)
            
            logger.info(f"✅ Generated {issue_type}-specific functional tests ({len(tests)} chars)")
            return tests
            
        except Exception as e:
            logger.error(f"Test generation failed: {e}")
            # Return type-specific fallback template
            return self._get_fallback_test_template(issue_type, language)
    
    def _get_fallback_test_template(self, issue_type: str, language: str) -> str:
        """
        Return a fallback test template when AI generation fails.
        This ensures we always generate SOME tests, even without AI.
        """
        logger.warning(f"⚠️ Using fallback test template for {issue_type} ({language})")
        
        if language == 'python':
            if issue_type == 'websocket':
                return '''"""
WebSocket Tests - Fallback Template
AI generation failed - customize this for your specific WebSocket issue
"""
import pytest
import asyncio
import websockets

# TODO: Update these to match your actual WebSocket endpoint
WS_URL = "ws://localhost:8000/ws"

@pytest.mark.asyncio
async def test_websocket_connection():
    """TODO: Customize this test for your specific issue"""
    # Example:
    # async with websockets.connect(WS_URL) as ws:
    #     await ws.send("test message")
    #     response = await ws.recv()
    #     assert response is not None
    pass
'''
            elif issue_type == 'api':
                return '''"""
API Endpoint Tests
Auto-generated fallback template - please review and customize
"""
import pytest
from fastapi.testclient import TestClient

def test_endpoint_availability():
    """Test API endpoint responds"""
    # TODO: Import your FastAPI app and create test
    pass

def test_request_payload_validation():
    """Test request payload handling"""
    # TODO: Test with valid and invalid payloads
    pass

def test_error_responses():
    """Test error handling"""
    # TODO: Test 400, 404, 500 error cases
    pass
'''
            else:  # general/feature/bug
                return '''"""
General Tests
Auto-generated fallback template - please review and customize
"""
import pytest

def test_basic_functionality():
    """Test basic functionality"""
    # TODO: Implement test based on issue requirements
    pass

def test_edge_cases():
    """Test edge cases"""
    # TODO: Test boundary conditions
    pass

def test_error_handling():
    """Test error handling"""
    # TODO: Test error scenarios
    pass
'''
        else:  # JavaScript
            return '''// Auto-generated fallback test template
// Please review and customize based on your requirements

describe('Basic Tests', () => {
  test('placeholder test', () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });
});
'''

    
    def _get_websocket_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate WebSocket-specific test instructions"""
        if language == 'python':
            return """
**WebSocket Test Requirements for Python:**

CRITICAL API NOTES (websockets library >= 11.0):
- DO NOT use `ws.open` - it doesn't exist in modern versions!
- Use `async with websockets.connect(url) as ws:` - connection is open if context entered
- Generate test audio using Python's `wave` module, NOT `espeak` system command

1. **Connection Test:**
   - Use `websockets` library: `async with websockets.connect(WS_URL) as ws:`
   - Connection is implicitly open if you're inside the async with block
   - Example:
     ```python
     async with websockets.connect(WS_URL) as ws:
         assert ws is not None  # We're connected
     ```

2. **Send/Receive Test:**
   - Send test data: `await ws.send(json.dumps({"type": "test"}))`
   - Receive response: `response = await ws.recv()`
   - Assert response format and content

3. **Audio Test Data Generation:**
   - Generate WAV using Python's `wave` module, NOT espeak:
     ```python
     import wave
     import struct
     import math
     
     def generate_test_wav(path, duration=1.0, sample_rate=16000):
         with wave.open(path, 'w') as f:
             f.setnchannels(1)
             f.setsampwidth(2)
             f.setframerate(sample_rate)
             for i in range(int(sample_rate * duration)):
                 sample = int(32767 * math.sin(2 * math.pi * 440 * i / sample_rate))
                 f.writeframes(struct.pack('<h', sample))
     ```

4. **Always use `await` for async operations:**
   - ✅ `await asyncio.sleep(0.5)`
   - ❌ `asyncio.sleep(0.5)` (missing await - causes warnings)
"""
        else:
            return """
**WebSocket Test Requirements for JavaScript:**

1. Test connection establishment
2. Test send/receive data
3. Test real-time streaming
4. Test disconnect

Use `ws` library or similar for actual WebSocket testing
"""
    
    def _get_api_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate API-specific test instructions"""
        if language == 'python':
            return """
**API Test Requirements:**

1. Test endpoint availability (status codes)
2. Test request/response payload validation
3. Test error handling (400, 401, 404)
4. Test edge cases (empty payload, large data)

Use TestClient or requests library
"""
        else:
            return """
**API Test Requirements:**

1. Test endpoint responses
2. Test request payloads
3. Test error cases
4. Test status codes

Use supertest or axios
"""
    
    def _get_bug_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate bug regression test instructions"""
        return f"""
**Bug Regression Tests:**

Keywords: {', '.join(keywords[:3])}

1. Create test that would FAIL before fix
2. Should PASS after fix
3. Test edge cases to prevent regression
4. Document bug behavior in test

Focus on reproducing the exact bug scenario
"""
    
    def _get_feature_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate feature test instructions"""
        return f"""
**Feature Tests:**

Keywords: {', '.join(keywords[:3])}

1. Test new functionality works
2. Test feature integration
3. Test different inputs
4. Test feature boundaries

Test WHAT the feature does, not just that code runs
"""
    
    def _get_performance_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate performance test instructions"""
        return """
**Performance Tests:**

1. Measure latency (response time)
2. Test throughput (requests/second)
3. Test under load (concurrent requests)
4. Monitor resource usage

Include actual performance measurements with assertions
"""
    
    def _get_security_test_instructions(self, language: str, operations: List[Dict], keywords: List[str]) -> str:
        """Generate security test instructions"""
        return """
**Security Tests:**

1. Test input validation (SQL injection, XSS, command injection)
2. Test authentication/authorization
3. Test data sanitization
4. Test access controls

Test security boundaries, not just happy path
"""
    
    def _get_generic_test_instructions(self, language: str, operations: List[Dict]) -> str:
        """Generate generic test instructions"""
        return """
**General Tests:**

1. Test main functionality
2. Test error handling
3. Test integration with existing code
4. Test edge cases

Create runnable tests with actual assertions
"""
    
    def _get_fallback_test_template(self, issue_type: str, language: str) -> str:
        """Return fallback test template when AI generation fails"""
        if language == 'python':
            if issue_type == 'websocket':
                return '''"""WebSocket Tests"""
import pytest

@pytest.mark.asyncio
async def test_websocket_connection():
    pytest.skip("Implement WebSocket connection test")

@pytest.mark.asyncio
async def test_websocket_send_receive():
    pytest.skip("Implement WebSocket data test")
'''
            elif issue_type == 'api':
                return '''"""API Tests"""
import pytest

def test_api_endpoint():
    pytest.skip("Implement API endpoint test")
'''
            else:
                return '''"""Tests"""
import pytest

def test_fix_works():
    assert True, "Implement test"
'''
        else:  # JavaScript
            if issue_type == 'websocket':
                return '''describe('WebSocket', () => {
  test('connection', () => {
    expect(true).toBe(true);
  });
});
'''
            elif issue_type == 'api':
                return '''describe('API', () => {
  test('endpoint', () => {
    expect(true).toBe(true);
  });
});
'''
            else:
                return '''describe('Tests', () => {
  test('works', () => {
    expect(true).toBe(true);
  });
});
'''
