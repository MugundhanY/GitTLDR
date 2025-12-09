"""
Dependency Analyzer - Language-Agnostic Codebase Dependency Detection
=====================================================================

Analyzes codebase files to extract ALL dependencies:
- Python: requirements.txt, setup.py, pyproject.toml, import statements
- JavaScript: package.json, import/require statements
- Go: go.mod
- Rust: Cargo.toml

This is Phase 1 of the Intelligent Docker Generator v2 pipeline.
"""

import ast
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class DependencyReport:
    """Complete dependency analysis report for a codebase."""
    
    # Package manager dependencies
    pip_packages: List[str] = field(default_factory=list)
    npm_packages: List[str] = field(default_factory=list)
    go_modules: List[str] = field(default_factory=list)
    
    # Detected from source code scanning
    python_imports: Set[str] = field(default_factory=set)
    js_imports: Set[str] = field(default_factory=set)
    
    # Framework/library detection
    detected_frameworks: List[str] = field(default_factory=list)
    
    # Inferred requirements
    system_packages_needed: List[str] = field(default_factory=list)
    binaries_needed: List[str] = field(default_factory=list)
    
    # Metadata
    primary_language: str = "unknown"
    has_existing_dockerfile: bool = False
    existing_dockerfile_content: Optional[str] = None
    
    # Audio/ML specific detection (important for test generation)
    audio_library: Optional[str] = None  # vosk, whisper, pyttsx3, etc.
    ml_framework: Optional[str] = None   # torch, tensorflow, etc.


class DependencyAnalyzer:
    """
    Analyzes codebase to extract ALL dependencies.
    
    Multi-phase analysis:
    1. Parse dependency files (requirements.txt, package.json, etc.)
    2. Scan source files for imports
    3. Detect frameworks from import patterns
    4. Cross-reference to find missing dependencies
    """
    
    # Standard library modules to ignore (Python)
    PYTHON_STDLIB = {
        'abc', 'aifc', 'argparse', 'array', 'ast', 'asyncio', 'atexit',
        'base64', 'bdb', 'binascii', 'binhex', 'bisect', 'builtins',
        'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd',
        'code', 'codecs', 'codeop', 'collections', 'colorsys', 'compileall',
        'concurrent', 'configparser', 'contextlib', 'contextvars', 'copy',
        'copyreg', 'cProfile', 'crypt', 'csv', 'ctypes', 'curses',
        'dataclasses', 'datetime', 'dbm', 'decimal', 'difflib', 'dis',
        'distutils', 'doctest', 'email', 'encodings', 'enum', 'errno',
        'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch',
        'fractions', 'ftplib', 'functools', 'gc', 'getopt', 'getpass',
        'gettext', 'glob', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac',
        'html', 'http', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect',
        'io', 'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3',
        'linecache', 'locale', 'logging', 'lzma', 'mailbox', 'mailcap',
        'marshal', 'math', 'mimetypes', 'mmap', 'modulefinder', 'multiprocessing',
        'netrc', 'nis', 'nntplib', 'numbers', 'operator', 'optparse', 'os',
        'ossaudiodev', 'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes',
        'pkgutil', 'platform', 'plistlib', 'poplib', 'posix', 'posixpath',
        'pprint', 'profile', 'pstats', 'pty', 'pwd', 'py_compile', 'pyclbr',
        'pydoc', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib',
        'resource', 'rlcompleter', 'runpy', 'sched', 'secrets', 'select',
        'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site', 'smtpd',
        'smtplib', 'sndhdr', 'socket', 'socketserver', 'spwd', 'sqlite3',
        'ssl', 'stat', 'statistics', 'string', 'stringprep', 'struct',
        'subprocess', 'sunau', 'symbol', 'symtable', 'sys', 'sysconfig',
        'syslog', 'tabnanny', 'tarfile', 'telnetlib', 'tempfile', 'termios',
        'test', 'textwrap', 'threading', 'time', 'timeit', 'tkinter',
        'token', 'tokenize', 'trace', 'traceback', 'tracemalloc', 'tty',
        'turtle', 'turtledemo', 'types', 'typing', 'unicodedata', 'unittest',
        'urllib', 'uu', 'uuid', 'venv', 'warnings', 'wave', 'weakref',
        'webbrowser', 'winreg', 'winsound', 'wsgiref', 'xdrlib', 'xml',
        'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib',
        # typing extras
        'typing_extensions', 'annotations',
    }
    
    # Framework detection patterns
    FRAMEWORK_PATTERNS = {
        'FastAPI': ['from fastapi import', 'FastAPI()', '@app.get', '@app.post', '@app.websocket'],
        'Flask': ['from flask import', 'Flask(__name__)', '@app.route'],
        'Django': ['from django', 'django.conf', 'INSTALLED_APPS'],
        'Express': ["require('express')", 'express()', 'app.listen'],
        'Next.js': ['next/router', 'next/link', 'getServerSideProps'],
        'Vosk': ['from vosk import', 'KaldiRecognizer', 'vosk.Model'],
        'Whisper': ['import whisper', 'whisper.load_model'],
        'PyTorch': ['import torch', 'from torch import', 'torch.nn'],
        'TensorFlow': ['import tensorflow', 'from tensorflow', 'tf.keras'],
        'OpenCV': ['import cv2', 'from cv2 import'],
        'Pillow': ['from PIL import', 'import PIL'],
    }
    
    # Audio library detection (for test generation context)
    AUDIO_LIBRARIES = {
        'vosk': ['from vosk import', 'KaldiRecognizer', 'vosk.Model'],
        'whisper': ['import whisper', 'whisper.load_model', 'openai-whisper'],
        'pyttsx3': ['import pyttsx3', 'pyttsx3.init'],
        'pyaudio': ['import pyaudio', 'from pyaudio import'],
        'soundfile': ['import soundfile', 'from soundfile import'],
        'librosa': ['import librosa', 'from librosa import'],
        'pydub': ['from pydub import', 'AudioSegment'],
    }
    
    async def analyze(self, files: List[Dict[str, Any]]) -> DependencyReport:
        """
        Perform complete dependency analysis on codebase files.
        
        Args:
            files: List of file dicts with 'path' and 'content' keys
            
        Returns:
            DependencyReport with all detected dependencies
        """
        report = DependencyReport()
        
        logger.info(f"🔍 Analyzing dependencies from {len(files)} files...")
        
        # Organize files by type
        files_by_type = self._categorize_files(files)
        
        # Phase 1: Parse dependency files
        await self._parse_dependency_files(files_by_type, report)
        
        # Phase 2: Scan source code for imports
        await self._scan_source_imports(files_by_type, report)
        
        # Phase 3: Detect frameworks
        self._detect_frameworks(files, report)
        
        # Phase 4: Detect audio library (critical for test context)
        self._detect_audio_library(files, report)
        
        # Phase 5: Determine primary language
        report.primary_language = self._determine_primary_language(files_by_type)
        
        # Phase 6: Check for existing Dockerfile
        self._check_existing_dockerfile(files, report)
        
        # Log summary
        logger.info(f"📦 Dependency analysis complete:")
        logger.info(f"   - pip packages: {len(report.pip_packages)}")
        logger.info(f"   - npm packages: {len(report.npm_packages)}")
        logger.info(f"   - Python imports: {len(report.python_imports)}")
        logger.info(f"   - Frameworks: {report.detected_frameworks}")
        logger.info(f"   - Audio library: {report.audio_library}")
        logger.info(f"   - Primary language: {report.primary_language}")
        
        return report
    
    def _categorize_files(self, files: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize files by type for efficient processing."""
        categories = {
            'python': [],
            'javascript': [],
            'typescript': [],
            'requirements': [],
            'package_json': [],
            'dockerfile': [],
            'go_mod': [],
            'cargo_toml': [],
            'other': []
        }
        
        for file in files:
            path = file.get('path', '').lower()
            
            if path.endswith('.py'):
                categories['python'].append(file)
            elif path.endswith('.js') or path.endswith('.mjs'):
                categories['javascript'].append(file)
            elif path.endswith('.ts') or path.endswith('.tsx'):
                categories['typescript'].append(file)
            elif path.endswith('requirements.txt') or path.endswith('requirements-dev.txt'):
                categories['requirements'].append(file)
            elif path.endswith('package.json'):
                categories['package_json'].append(file)
            elif path.endswith('dockerfile') or 'dockerfile' in path:
                categories['dockerfile'].append(file)
            elif path.endswith('go.mod'):
                categories['go_mod'].append(file)
            elif path.endswith('cargo.toml'):
                categories['cargo_toml'].append(file)
            else:
                categories['other'].append(file)
        
        return categories
    
    async def _parse_dependency_files(
        self,
        files_by_type: Dict[str, List[Dict]],
        report: DependencyReport
    ):
        """Parse explicit dependency files."""
        
        # Parse requirements.txt
        for req_file in files_by_type['requirements']:
            content = req_file.get('content', '')
            packages = self._parse_requirements_txt(content)
            report.pip_packages.extend(packages)
            logger.debug(f"   Found {len(packages)} packages in {req_file.get('path')}")
        
        # Parse package.json
        for pkg_file in files_by_type['package_json']:
            content = pkg_file.get('content', '')
            packages = self._parse_package_json(content)
            report.npm_packages.extend(packages)
            logger.debug(f"   Found {len(packages)} packages in {pkg_file.get('path')}")
        
        # Deduplicate
        report.pip_packages = list(set(report.pip_packages))
        report.npm_packages = list(set(report.npm_packages))
    
    def _parse_requirements_txt(self, content: str) -> List[str]:
        """Parse requirements.txt format."""
        packages = []
        
        for line in content.split('\n'):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            # Skip -r, -e, and other flags
            if line.startswith('-'):
                continue
            
            # Extract package name (before ==, >=, <=, ~=, etc.)
            match = re.match(r'^([a-zA-Z0-9_\-\[\]]+)', line)
            if match:
                pkg_name = match.group(1)
                # Remove extras like [dev] from package names
                pkg_name = re.sub(r'\[.*\]', '', pkg_name)
                packages.append(pkg_name.lower())
        
        return packages
    
    def _parse_package_json(self, content: str) -> List[str]:
        """Parse package.json for dependencies."""
        packages = []
        
        try:
            pkg = json.loads(content)
            
            # Get both dependencies and devDependencies
            deps = pkg.get('dependencies', {})
            dev_deps = pkg.get('devDependencies', {})
            
            packages.extend(deps.keys())
            packages.extend(dev_deps.keys())
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse package.json")
        
        return packages
    
    async def _scan_source_imports(
        self,
        files_by_type: Dict[str, List[Dict]],
        report: DependencyReport
    ):
        """Scan source files for import statements."""
        
        # Scan Python files
        for py_file in files_by_type['python']:
            content = py_file.get('content', '')
            imports = self._extract_python_imports(content)
            report.python_imports.update(imports)
        
        # Scan JavaScript/TypeScript files
        for js_file in files_by_type['javascript'] + files_by_type['typescript']:
            content = js_file.get('content', '')
            imports = self._extract_js_imports(content)
            report.js_imports.update(imports)
    
    def _extract_python_imports(self, content: str) -> Set[str]:
        """Extract top-level module names from Python imports."""
        imports = set()
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        # Get top-level module
                        top_module = alias.name.split('.')[0]
                        if top_module not in self.PYTHON_STDLIB:
                            imports.add(top_module)
                
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        top_module = node.module.split('.')[0]
                        if top_module not in self.PYTHON_STDLIB:
                            imports.add(top_module)
        
        except SyntaxError:
            # Fallback to regex for files that fail to parse
            import_pattern = r'^(?:from\s+(\w+)|import\s+(\w+))'
            for match in re.finditer(import_pattern, content, re.MULTILINE):
                module = match.group(1) or match.group(2)
                if module and module not in self.PYTHON_STDLIB:
                    imports.add(module)
        
        return imports
    
    def _extract_js_imports(self, content: str) -> Set[str]:
        """Extract module names from JavaScript/TypeScript imports."""
        imports = set()
        
        # ES6 imports: import X from 'package'
        es6_pattern = r"import\s+.*?\s+from\s+['\"]([^'\"./][^'\"]*)['\"]"
        for match in re.finditer(es6_pattern, content):
            pkg = match.group(1).split('/')[0]  # Get base package name
            if not pkg.startswith('@'):
                imports.add(pkg)
            else:
                # Scoped packages like @types/node
                imports.add(match.group(1).split('/')[0] + '/' + match.group(1).split('/')[1] if '/' in match.group(1) else pkg)
        
        # CommonJS: require('package')
        require_pattern = r"require\s*\(\s*['\"]([^'\"./][^'\"]*)['\"]"
        for match in re.finditer(require_pattern, content):
            pkg = match.group(1).split('/')[0]
            imports.add(pkg)
        
        return imports
    
    def _detect_frameworks(self, files: List[Dict], report: DependencyReport):
        """Detect frameworks from code patterns."""
        all_content = '\n'.join(f.get('content', '') for f in files)
        
        for framework, patterns in self.FRAMEWORK_PATTERNS.items():
            for pattern in patterns:
                if pattern in all_content:
                    if framework not in report.detected_frameworks:
                        report.detected_frameworks.append(framework)
                        logger.debug(f"   Detected framework: {framework}")
                    break
    
    def _detect_audio_library(self, files: List[Dict], report: DependencyReport):
        """Detect which audio library is used (critical for test generation)."""
        all_content = '\n'.join(f.get('content', '') for f in files)
        
        # Check pip packages first
        for pkg in report.pip_packages:
            pkg_lower = pkg.lower()
            if pkg_lower in self.AUDIO_LIBRARIES:
                report.audio_library = pkg_lower
                logger.info(f"🎵 Audio library detected from pip: {pkg_lower}")
                return
        
        # Check import patterns
        for lib, patterns in self.AUDIO_LIBRARIES.items():
            for pattern in patterns:
                if pattern in all_content:
                    report.audio_library = lib
                    logger.info(f"🎵 Audio library detected from imports: {lib}")
                    return
    
    def _determine_primary_language(self, files_by_type: Dict[str, List]) -> str:
        """Determine the primary language of the codebase."""
        counts = {
            'python': len(files_by_type.get('python', [])),
            'javascript': len(files_by_type.get('javascript', [])) + len(files_by_type.get('typescript', [])),
        }
        
        if not any(counts.values()):
            return 'unknown'
        
        return max(counts, key=counts.get)
    
    def _check_existing_dockerfile(self, files: List[Dict], report: DependencyReport):
        """Check if the repo already has a Dockerfile."""
        for file in files:
            path = file.get('path', '').lower()
            if path.endswith('dockerfile') or path == 'dockerfile':
                report.has_existing_dockerfile = True
                report.existing_dockerfile_content = file.get('content', '')
                logger.info("📄 Found existing Dockerfile in repository")
                break


# Singleton instance
dependency_analyzer = DependencyAnalyzer()
