"""
System Dependency Mapper - Map Language Packages to System Dependencies
========================================================================

Maps pip/npm packages to their system-level (apt) dependencies.

This is the KEY innovation - instead of hardcoding "install espeak",
we detect "codebase uses vosk" -> "vosk needs libvosk-dev"

This is Phase 2 of the Intelligent Docker Generator v2 pipeline.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SystemRequirements:
    """System-level requirements for a codebase."""
    
    # apt packages to install
    apt_packages: List[str] = field(default_factory=list)
    
    # Binaries that must be available in PATH
    required_binaries: List[str] = field(default_factory=list)
    
    # Environment variables to set
    env_vars: Dict[str, str] = field(default_factory=dict)
    
    # Reasons for each package (for traceability)
    package_reasons: Dict[str, str] = field(default_factory=dict)


class SystemDependencyMapper:
    """
    Knowledge base: pip/npm package -> system packages needed.
    
    This eliminates the need for hardcoded template dependencies.
    We detect what packages are actually used and map to system deps.
    """
    
    # =========================================================================
    # Python Package -> APT Package Mapping
    # =========================================================================
    PYTHON_SYSTEM_DEPS: Dict[str, Dict] = {
        # ----- Audio/Speech -----
        'vosk': {
            'apt': [],  # vosk wheel is self-contained, no apt deps needed
            'binaries': [],
            'notes': 'Vosk Speech Recognition - self-contained wheel'
        },
        'pyttsx3': {
            'apt': ['espeak', 'libespeak1', 'libespeak-dev'],
            'binaries': ['espeak'],
            'notes': 'Text-to-speech using espeak backend'
        },
        'pyaudio': {
            'apt': ['portaudio19-dev', 'python3-pyaudio'],
            'binaries': [],
            'notes': 'Audio I/O library'
        },
        'soundfile': {
            'apt': ['libsndfile1'],
            'binaries': [],
            'notes': 'Audio file reading/writing'
        },
        'librosa': {
            'apt': ['libsndfile1', 'ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'Audio analysis library'
        },
        'pydub': {
            'apt': ['ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'Audio manipulation'
        },
        'openai-whisper': {
            'apt': ['ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'OpenAI Whisper transcription'
        },
        'whisper': {
            'apt': ['ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'OpenAI Whisper transcription'
        },
        
        # ----- Image Processing -----
        'pillow': {
            'apt': ['libjpeg-dev', 'libpng-dev', 'zlib1g-dev'],
            'binaries': [],
            'notes': 'Python Imaging Library'
        },
        'opencv-python': {
            'apt': ['libgl1-mesa-glx', 'libglib2.0-0', 'libsm6', 'libxext6', 'libxrender1'],
            'binaries': [],
            'notes': 'OpenCV computer vision'
        },
        'opencv-python-headless': {
            'apt': ['libgl1-mesa-glx', 'libglib2.0-0'],
            'binaries': [],
            'notes': 'OpenCV headless (no GUI)'
        },
        'imageio': {
            'apt': ['ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'Image/video I/O'
        },
        'imageio-ffmpeg': {
            'apt': ['ffmpeg'],
            'binaries': ['ffmpeg'],
            'notes': 'FFmpeg backend for imageio'
        },
        
        # ----- Database -----
        'psycopg2': {
            'apt': ['libpq-dev', 'python3-dev'],
            'binaries': [],
            'notes': 'PostgreSQL adapter'
        },
        'psycopg2-binary': {
            'apt': [],  # Pre-compiled, no deps needed
            'binaries': [],
            'notes': 'PostgreSQL adapter (pre-compiled)'
        },
        'mysqlclient': {
            'apt': ['default-libmysqlclient-dev', 'build-essential'],
            'binaries': [],
            'notes': 'MySQL adapter'
        },
        'pymysql': {
            'apt': [],  # Pure Python
            'binaries': [],
            'notes': 'MySQL adapter (pure Python)'
        },
        
        # ----- ML/AI -----
        'torch': {
            'apt': [],  # Wheels are self-contained
            'binaries': [],
            'notes': 'PyTorch (self-contained wheels)'
        },
        'tensorflow': {
            'apt': [],  # Wheels are self-contained
            'binaries': [],
            'notes': 'TensorFlow (self-contained wheels)'
        },
        'transformers': {
            'apt': [],
            'binaries': [],
            'notes': 'Hugging Face Transformers'
        },
        'sentence-transformers': {
            'apt': [],
            'binaries': [],
            'notes': 'Sentence embeddings'
        },
        
        # ----- Web -----
        'uvicorn': {
            'apt': [],
            'binaries': [],
            'notes': 'ASGI server'
        },
        'fastapi': {
            'apt': [],
            'binaries': [],
            'notes': 'FastAPI framework'
        },
        'flask': {
            'apt': [],
            'binaries': [],
            'notes': 'Flask framework'
        },
        'websockets': {
            'apt': [],
            'binaries': [],
            'notes': 'WebSocket library'
        },
        'httpx': {
            'apt': [],
            'binaries': [],
            'notes': 'HTTP client'
        },
        
        # ----- XML/Parsing -----
        'lxml': {
            'apt': ['libxml2-dev', 'libxslt1-dev'],
            'binaries': [],
            'notes': 'XML/HTML processing'
        },
        'beautifulsoup4': {
            'apt': [],  # Pure Python
            'binaries': [],
            'notes': 'HTML parsing (pure Python)'
        },
        
        # ----- Crypto -----
        'cryptography': {
            'apt': ['libffi-dev', 'libssl-dev', 'python3-dev'],
            'binaries': [],
            'notes': 'Cryptographic recipes'
        },
        'bcrypt': {
            'apt': ['libffi-dev'],
            'binaries': [],
            'notes': 'Password hashing'
        },
        'pynacl': {
            'apt': ['libsodium-dev'],
            'binaries': [],
            'notes': 'NaCl cryptography bindings'
        },
        
        # ----- PDF/Documents -----
        'pypdf2': {
            'apt': [],
            'binaries': [],
            'notes': 'PDF library (pure Python)'
        },
        'reportlab': {
            'apt': ['libfreetype6-dev'],
            'binaries': [],
            'notes': 'PDF generation'
        },
        'weasyprint': {
            'apt': ['libpango-1.0-0', 'libpangocairo-1.0-0', 'libgdk-pixbuf2.0-0', 'libffi-dev'],
            'binaries': [],
            'notes': 'HTML to PDF'
        },
        
        # ----- Git -----
        'gitpython': {
            'apt': ['git'],
            'binaries': ['git'],
            'notes': 'Git repository access'
        },
        'pygit2': {
            'apt': ['libgit2-dev'],
            'binaries': [],
            'notes': 'Git bindings'
        },
        
        # ----- Scientific -----
        'numpy': {
            'apt': [],  # Wheels include BLAS
            'binaries': [],
            'notes': 'Numerical computing'
        },
        'scipy': {
            'apt': [],  # Wheels include BLAS
            'binaries': [],
            'notes': 'Scientific computing'
        },
        'pandas': {
            'apt': [],
            'binaries': [],
            'notes': 'Data analysis'
        },
        'matplotlib': {
            'apt': ['libfreetype6-dev', 'python3-tk'],  # For GUI backends
            'binaries': [],
            'notes': 'Plotting library'
        },
        
        # ----- System -----
        'psutil': {
            'apt': [],
            'binaries': [],
            'notes': 'System monitoring'
        },
        'watchdog': {
            'apt': [],
            'binaries': [],
            'notes': 'File system watching'
        },
    }
    
    # =========================================================================
    # NPM Package -> APT Package Mapping
    # =========================================================================
    NPM_SYSTEM_DEPS: Dict[str, Dict] = {
        'sharp': {
            'apt': ['libvips-dev'],
            'binaries': [],
            'notes': 'Image processing'
        },
        'canvas': {
            'apt': ['libcairo2-dev', 'libpango1.0-dev', 'libjpeg-dev', 'libgif-dev', 'librsvg2-dev'],
            'binaries': [],
            'notes': 'Canvas rendering'
        },
        'bcrypt': {
            'apt': ['build-essential', 'python3'],
            'binaries': [],
            'notes': 'Password hashing (uses node-gyp)'
        },
        'sqlite3': {
            'apt': ['build-essential', 'python3'],
            'binaries': [],
            'notes': 'SQLite bindings'
        },
        'node-sass': {
            'apt': ['build-essential', 'python3'],
            'binaries': [],
            'notes': 'SASS compilation (deprecated)'
        },
        'puppeteer': {
            'apt': ['libnss3', 'libxss1', 'libasound2', 'libatk-bridge2.0-0', 'libgtk-3-0'],
            'binaries': [],
            'notes': 'Chrome/Chromium browser automation'
        },
        'playwright': {
            'apt': ['libnss3', 'libxss1', 'libasound2', 'libatk-bridge2.0-0', 'libgtk-3-0'],
            'binaries': [],
            'notes': 'Browser automation'
        },
    }
    
    # =========================================================================
    # Common base packages always needed
    # =========================================================================
    BASE_PACKAGES = ['ca-certificates', 'curl']
    
    def get_system_requirements(
        self,
        pip_packages: List[str],
        npm_packages: List[str] = None,
        include_base: bool = True
    ) -> SystemRequirements:
        """
        Given list of packages, return system requirements.
        
        Args:
            pip_packages: List of pip package names
            npm_packages: List of npm package names
            include_base: Whether to include base packages (curl, ca-certs)
            
        Returns:
            SystemRequirements with apt packages and binaries needed
        """
        requirements = SystemRequirements()
        npm_packages = npm_packages or []
        
        # Include base packages
        if include_base:
            for pkg in self.BASE_PACKAGES:
                requirements.apt_packages.append(pkg)
                requirements.package_reasons[pkg] = 'base requirement'
        
        # Process Python packages
        for pip_pkg in pip_packages:
            pip_pkg_lower = pip_pkg.lower().replace('_', '-')
            
            if pip_pkg_lower in self.PYTHON_SYSTEM_DEPS:
                dep_info = self.PYTHON_SYSTEM_DEPS[pip_pkg_lower]
                
                for apt_pkg in dep_info.get('apt', []):
                    if apt_pkg not in requirements.apt_packages:
                        requirements.apt_packages.append(apt_pkg)
                        requirements.package_reasons[apt_pkg] = f"required by {pip_pkg}"
                
                for binary in dep_info.get('binaries', []):
                    if binary not in requirements.required_binaries:
                        requirements.required_binaries.append(binary)
        
        # Process NPM packages
        for npm_pkg in npm_packages:
            npm_pkg_lower = npm_pkg.lower()
            
            if npm_pkg_lower in self.NPM_SYSTEM_DEPS:
                dep_info = self.NPM_SYSTEM_DEPS[npm_pkg_lower]
                
                for apt_pkg in dep_info.get('apt', []):
                    if apt_pkg not in requirements.apt_packages:
                        requirements.apt_packages.append(apt_pkg)
                        requirements.package_reasons[apt_pkg] = f"required by {npm_pkg}"
                
                for binary in dep_info.get('binaries', []):
                    if binary not in requirements.required_binaries:
                        requirements.required_binaries.append(binary)
        
        # Log what we found
        if requirements.apt_packages:
            logger.info(f"📦 System dependencies detected: {len(requirements.apt_packages)} apt packages")
            for pkg in requirements.apt_packages:
                reason = requirements.package_reasons.get(pkg, 'unknown')
                logger.debug(f"   - {pkg}: {reason}")
        else:
            logger.info("📦 No system dependencies needed (pure Python/JS packages)")
        
        return requirements
    
    def get_audio_requirements(self, audio_library: Optional[str]) -> SystemRequirements:
        """
        Get system requirements specifically for audio processing.
        
        This is used by TestContextBuilder to ensure test audio generation works.
        
        Args:
            audio_library: Detected audio library (vosk, whisper, pyttsx3, etc.)
            
        Returns:
            SystemRequirements for audio processing
        """
        requirements = SystemRequirements()
        
        if audio_library:
            audio_lower = audio_library.lower()
            
            if audio_lower in self.PYTHON_SYSTEM_DEPS:
                dep_info = self.PYTHON_SYSTEM_DEPS[audio_lower]
                requirements.apt_packages.extend(dep_info.get('apt', []))
                requirements.required_binaries.extend(dep_info.get('binaries', []))
                
                for apt_pkg in dep_info.get('apt', []):
                    requirements.package_reasons[apt_pkg] = f"audio: {audio_library}"
        
        return requirements
    
    def has_mapping(self, package: str) -> bool:
        """Check if we have a mapping for a package."""
        pkg_lower = package.lower().replace('_', '-')
        return pkg_lower in self.PYTHON_SYSTEM_DEPS or pkg_lower in self.NPM_SYSTEM_DEPS
    
    def get_package_info(self, package: str) -> Optional[Dict]:
        """Get detailed info about a package's requirements."""
        pkg_lower = package.lower().replace('_', '-')
        
        if pkg_lower in self.PYTHON_SYSTEM_DEPS:
            return self.PYTHON_SYSTEM_DEPS[pkg_lower]
        elif pkg_lower in self.NPM_SYSTEM_DEPS:
            return self.NPM_SYSTEM_DEPS[pkg_lower]
        
        return None


# Singleton instance
system_dependency_mapper = SystemDependencyMapper()
