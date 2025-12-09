"""
Dockerfile Builder - Template-Free Dockerfile Construction
===========================================================

Uses the Builder pattern to construct Dockerfiles from analysis results.
No hardcoded packages - everything comes from codebase analysis.

This is Phase 3 of the Intelligent Docker Generator v2 pipeline.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
from utils.logger import get_logger

logger = get_logger(__name__)


class AudioGenStrategy(Enum):
    """Strategy for generating test audio files."""
    PYTHON_WAVE = "python_wave"      # Pure Python wave module (no deps)
    FFMPEG = "ffmpeg"                 # Use ffmpeg to generate
    ESPEAK = "espeak"                 # Use espeak TTS (only if pyttsx3 used)
    NONE = "none"                     # No audio generation needed


@dataclass
class AudioFormat:
    """Audio format specification for test generation."""
    sample_rate: int = 16000
    channels: int = 1
    bits: int = 16
    format: str = "wav"


@dataclass
class TestContext:
    """Context for test generation based on codebase analysis."""
    
    # Audio configuration
    audio_generation: AudioGenStrategy = AudioGenStrategy.PYTHON_WAVE
    audio_format: AudioFormat = field(default_factory=AudioFormat)
    audio_notes: str = ""
    
    # Framework-specific patterns
    test_client: str = "requests"
    websocket_pattern: str = "async with websockets.connect()"
    
    # Detected libraries (for context-aware test generation)
    detected_frameworks: List[str] = field(default_factory=list)
    audio_library: Optional[str] = None
    
    def get_audio_generation_code(self) -> str:
        """Get Python code for generating test audio."""
        if self.audio_generation == AudioGenStrategy.PYTHON_WAVE:
            return '''
import wave
import struct
import math
import tempfile
import os

def generate_test_wav(duration: float = 1.0, sample_rate: int = 16000) -> str:
    """Generate a simple sine wave test file using pure Python."""
    output_path = os.path.join(tempfile.gettempdir(), 'test_audio.wav')
    
    with wave.open(output_path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)  # 16-bit
        f.setframerate(sample_rate)
        
        # Generate 440Hz sine wave
        for i in range(int(sample_rate * duration)):
            sample = int(32767 * 0.5 * math.sin(2 * math.pi * 440 * i / sample_rate))
            f.writeframes(struct.pack('<h', sample))
    
    return output_path
'''
        elif self.audio_generation == AudioGenStrategy.FFMPEG:
            return '''
import subprocess
import tempfile
import os

def generate_test_wav(duration: float = 1.0, sample_rate: int = 16000) -> str:
    """Generate test audio using ffmpeg."""
    output_path = os.path.join(tempfile.gettempdir(), 'test_audio.wav')
    
    subprocess.run([
        'ffmpeg', '-y', '-f', 'lavfi',
        '-i', f'sine=frequency=440:duration={duration}',
        '-ar', str(sample_rate), '-ac', '1',
        output_path
    ], check=True, capture_output=True)
    
    return output_path
'''
        elif self.audio_generation == AudioGenStrategy.ESPEAK:
            return '''
import subprocess
import tempfile
import os

def generate_test_wav(text: str = "hello world") -> str:
    """Generate test audio using espeak (for pyttsx3 codebases)."""
    output_path = os.path.join(tempfile.gettempdir(), 'test_audio.wav')
    
    subprocess.run([
        'espeak', '-w', output_path, text
    ], check=True, capture_output=True)
    
    return output_path
'''
        else:
            return "# No audio generation needed for this test"


class TestContextBuilder:
    """
    Build context for test generation based on codebase analysis.
    
    Ensures tests use the RIGHT libraries:
    - If codebase uses Vosk -> tests use Vosk-compatible audio
    - If codebase uses pyttsx3 -> tests can use espeak for TTS
    """
    
    def build(
        self,
        detected_frameworks: List[str],
        audio_library: Optional[str],
        pip_packages: List[str]
    ) -> TestContext:
        """
        Build test context from analysis results.
        
        Args:
            detected_frameworks: List of detected frameworks (FastAPI, Vosk, etc.)
            audio_library: Detected audio library (vosk, whisper, pyttsx3)
            pip_packages: List of pip packages
            
        Returns:
            TestContext with appropriate configuration
        """
        context = TestContext()
        context.detected_frameworks = detected_frameworks
        context.audio_library = audio_library
        
        # Determine audio generation strategy
        if audio_library:
            audio_lower = audio_library.lower()
            
            if audio_lower == 'vosk':
                context.audio_generation = AudioGenStrategy.PYTHON_WAVE
                context.audio_format = AudioFormat(sample_rate=16000, channels=1, bits=16)
                context.audio_notes = "Vosk requires 16kHz mono PCM WAV - using pure Python generation"
                logger.info("🎵 Test context: Vosk detected -> Python wave generation")
                
            elif audio_lower in ('whisper', 'openai-whisper'):
                context.audio_generation = AudioGenStrategy.PYTHON_WAVE
                context.audio_format = AudioFormat(sample_rate=16000, channels=1, bits=16)
                context.audio_notes = "Whisper accepts various formats - using Python wave for compatibility"
                logger.info("🎵 Test context: Whisper detected -> Python wave generation")
                
            elif audio_lower == 'pyttsx3':
                context.audio_generation = AudioGenStrategy.ESPEAK
                context.audio_notes = "pyttsx3 uses espeak backend - tests can use espeak too"
                logger.info("🎵 Test context: pyttsx3 detected -> espeak generation")
                
            elif audio_lower in ('pydub', 'librosa', 'moviepy'):
                context.audio_generation = AudioGenStrategy.FFMPEG
                context.audio_notes = f"{audio_library} typically works with ffmpeg"
                logger.info(f"🎵 Test context: {audio_library} detected -> ffmpeg generation")
                
            else:
                context.audio_generation = AudioGenStrategy.PYTHON_WAVE
                context.audio_notes = f"Unknown audio library {audio_library} - using safe Python wave"
        else:
            context.audio_generation = AudioGenStrategy.PYTHON_WAVE
            context.audio_notes = "No audio library detected - using pure Python wave (no dependencies)"
        
        # Framework-specific test patterns
        if 'FastAPI' in detected_frameworks:
            context.test_client = 'httpx.AsyncClient or TestClient from fastapi.testclient'
            context.websocket_pattern = '''
async with httpx.AsyncClient(app=app, base_url="http://test") as client:
    async with client.websocket_connect("/ws") as ws:
        await ws.send_bytes(audio_data)
        response = await ws.receive_json()
'''
        elif 'Flask' in detected_frameworks:
            context.test_client = 'app.test_client()'
            context.websocket_pattern = 'flask_socketio.SocketIOTestClient'
        else:
            context.websocket_pattern = '''
async with websockets.connect(WS_URL) as ws:
    await ws.send(data)
    response = await ws.recv()
'''
        
        return context


class DockerfileBuilder:
    """
    Builder pattern for constructing Dockerfiles from analysis.
    No hardcoded packages - everything comes from analysis.
    """
    
    def __init__(self):
        self.base_image: Optional[str] = None
        self.workdir: str = "/app"
        self.system_packages: List[str] = []
        self.pip_packages: List[str] = []
        self.npm_packages: List[str] = []
        self.env_vars: Dict[str, str] = {}
        self.copy_commands: List[str] = []
        self.run_commands: List[str] = []
        self.expose_ports: List[int] = []
        self.cmd: Optional[List[str]] = None
        self.entrypoint: Optional[List[str]] = None
        
        # Traceability
        self._reasons: Dict[str, str] = {}
        
        # Test configuration
        self._test_command: Optional[str] = None
        self._start_server: bool = False
        self._server_command: Optional[str] = None
    
    def with_base_image(self, image: str, reason: str = "") -> 'DockerfileBuilder':
        """Set base image with reason."""
        self.base_image = image
        self._reasons['base'] = reason or f"Using {image}"
        return self
    
    def with_workdir(self, path: str) -> 'DockerfileBuilder':
        """Set working directory."""
        self.workdir = path
        return self
    
    def add_system_package(self, package: str, reason: str = "") -> 'DockerfileBuilder':
        """Add apt package with reason for traceability."""
        if package not in self.system_packages:
            self.system_packages.append(package)
            self._reasons[f'apt:{package}'] = reason or "required"
        return self
    
    def add_system_packages(self, packages: List[str], reason: str = "") -> 'DockerfileBuilder':
        """Add multiple apt packages."""
        for pkg in packages:
            self.add_system_package(pkg, reason)
        return self
    
    def add_pip_package(self, package: str) -> 'DockerfileBuilder':
        """Add pip package to install."""
        if package not in self.pip_packages:
            self.pip_packages.append(package)
        return self
    
    def add_env_var(self, key: str, value: str) -> 'DockerfileBuilder':
        """Add environment variable."""
        self.env_vars[key] = value
        return self
    
    def add_copy(self, src: str, dest: str) -> 'DockerfileBuilder':
        """Add COPY command."""
        self.copy_commands.append(f"COPY {src} {dest}")
        return self
    
    def add_run(self, command: str) -> 'DockerfileBuilder':
        """Add RUN command."""
        self.run_commands.append(command)
        return self
    
    def expose_port(self, port: int) -> 'DockerfileBuilder':
        """Expose a port."""
        if port not in self.expose_ports:
            self.expose_ports.append(port)
        return self
    
    def with_cmd(self, cmd: List[str]) -> 'DockerfileBuilder':
        """Set CMD."""
        self.cmd = cmd
        return self
    
    def with_test_command(self, cmd: str) -> 'DockerfileBuilder':
        """Set test command to run."""
        self._test_command = cmd
        return self
    
    def with_server_startup(self, server_cmd: str, port: int = 8000) -> 'DockerfileBuilder':
        """Configure server to start before tests."""
        self._start_server = True
        self._server_command = server_cmd
        self.expose_port(port)
        return self
    
    def build(self) -> str:
        """Generate Dockerfile content."""
        if not self.base_image:
            raise ValueError("Base image is required")
        
        lines = []
        
        # Header comment
        lines.append("# Auto-generated Dockerfile by Intelligent Docker Generator v2")
        lines.append("# Dependencies detected from codebase analysis")
        lines.append("")
        
        # Base image
        lines.append(f"FROM {self.base_image}")
        lines.append("")
        
        # CRITICAL: Always set DEBIAN_FRONTEND=noninteractive to prevent tzdata prompt
        lines.append("# Prevent interactive prompts (e.g., tzdata timezone selection)")
        lines.append("ENV DEBIAN_FRONTEND=noninteractive")
        lines.append("")
        
        # Working directory
        lines.append(f"WORKDIR {self.workdir}")
        lines.append("")
        
        # System packages (if any)
        if self.system_packages:
            lines.append("# System dependencies (auto-detected from pip packages)")
            for pkg in self.system_packages:
                reason = self._reasons.get(f'apt:{pkg}', '')
                if reason:
                    lines.append(f"#   {pkg}: {reason}")
            
            lines.append("RUN apt-get update && apt-get install -y \\")
            for i, pkg in enumerate(sorted(self.system_packages)):
                # Always add backslash because we have the cleanup command coming next
                suffix = " \\"
                lines.append(f"    {pkg}{suffix}")
            lines.append("    && rm -rf /var/lib/apt/lists/*")
            lines.append("")
        
        # Copy files
        lines.append("# Copy repository files")
        lines.append("COPY repo/ /app/")
        lines.append("")
        
        # Copy test file if exists
        lines.append("# Copy test file (generated by test package)")
        lines.append("COPY test_*.py /app/")
        lines.append("")
        
        # Environment variables
        if self.env_vars:
            lines.append("# Environment variables")
            for key, value in self.env_vars.items():
                lines.append(f"ENV {key}={value}")
            lines.append("")
        
        # Custom run commands
        for cmd in self.run_commands:
            lines.append(f"RUN {cmd}")
        
        if self.run_commands:
            lines.append("")
        
        # Additional pip packages
        if self.pip_packages:
            lines.append("# Additional test dependencies")
            lines.append(f"RUN pip install {' '.join(self.pip_packages)} || true")
            lines.append("")
        
        # Expose ports
        for port in self.expose_ports:
            lines.append(f"EXPOSE {port}")
        
        if self.expose_ports:
            lines.append("")
        
        # CMD - either run tests directly or start server first
        if self._start_server and self._server_command and self._test_command:
            # Start server in background, wait, run tests
            lines.append("# Start server, wait for ready, run tests")
            port = self.expose_ports[0] if self.expose_ports else 8000
            combined_cmd = (
                f'{self._server_command} & '
                f'sleep 5 && '
                f'{self._test_command}; '
                f'TEST_EXIT=$?; kill %1 2>/dev/null || true; exit $TEST_EXIT'
            )
            lines.append(f'CMD ["sh", "-c", "{combined_cmd}"]')
        elif self._test_command:
            lines.append("# Run tests")
            lines.append(f'CMD ["sh", "-c", "{self._test_command}"]')
        elif self.cmd:
            lines.append(f"CMD {self.cmd}")
        
        return "\n".join(lines)
    
    def get_reasons(self) -> Dict[str, str]:
        """Get reasons for all dependencies (for documentation)."""
        return self._reasons.copy()


class DockerfileLearner:
    """
    Parse existing Dockerfile to learn what the maintainers intended.
    Extend rather than replace.
    """
    
    @dataclass
    class DockerfileInsights:
        """Insights extracted from existing Dockerfile."""
        base_image: Optional[str] = None
        existing_apt_packages: List[str] = field(default_factory=list)
        env_vars: Dict[str, str] = field(default_factory=dict)
        exposed_port: Optional[int] = None
        workdir: str = "/app"
        has_multistage: bool = False
    
    def learn(self, dockerfile_content: str) -> 'DockerfileLearner.DockerfileInsights':
        """
        Extract insights from existing Dockerfile.
        
        Args:
            dockerfile_content: Content of existing Dockerfile
            
        Returns:
            DockerfileInsights with extracted information
        """
        insights = self.DockerfileInsights()
        
        if not dockerfile_content:
            return insights
        
        import re
        
        lines = dockerfile_content.split('\n')
        from_count = 0
        
        for line in lines:
            line = line.strip()
            
            # Skip comments
            if line.startswith('#'):
                continue
            
            # Base image
            if line.upper().startswith('FROM '):
                from_count += 1
                if from_count == 1:  # First FROM (or only FROM)
                    parts = line.split()
                    if len(parts) >= 2:
                        # Handle "FROM image AS stage"
                        insights.base_image = parts[1]
                if from_count > 1:
                    insights.has_multistage = True
            
            # apt-get install
            if 'apt-get install' in line.lower():
                packages = self._extract_apt_packages(line)
                insights.existing_apt_packages.extend(packages)
            
            # ENV
            if line.upper().startswith('ENV '):
                match = re.match(r'ENV\s+(\w+)[=\s](.+)', line, re.IGNORECASE)
                if match:
                    insights.env_vars[match.group(1)] = match.group(2).strip()
            
            # EXPOSE
            if line.upper().startswith('EXPOSE '):
                match = re.search(r'EXPOSE\s+(\d+)', line, re.IGNORECASE)
                if match:
                    insights.exposed_port = int(match.group(1))
            
            # WORKDIR
            if line.upper().startswith('WORKDIR '):
                parts = line.split(maxsplit=1)
                if len(parts) >= 2:
                    insights.workdir = parts[1]
        
        logger.info(f"📄 Learned from existing Dockerfile:")
        logger.info(f"   Base: {insights.base_image}")
        logger.info(f"   Packages: {insights.existing_apt_packages}")
        logger.info(f"   Port: {insights.exposed_port}")
        
        return insights
    
    def _extract_apt_packages(self, line: str) -> List[str]:
        """Extract package names from apt-get install command."""
        packages = []
        
        # Normalize: Replace && and \ with space to handle multi-line/chained commands
        cleaned = line.replace('&&', ' ').replace('\\', ' ')
        
        # Split into tokens
        parts = cleaned.split()
        
        # Keywords to ignore
        keywords = {
            'run', 'apt-get', 'apt', 'install', 'update', 'upgrade', 
            'rm', 'rf', 'echo', 'chown', 'chmod', 'mkdir', 'cd',
            'true', 'false', 'y', 'yes', 'q', 'qq'
        }
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
                
            # Skip flags (e.g., -y, --no-install-recommends)
            if part.startswith('-'):
                continue
                
            # Skip environment variable assignments (e.g., DEBIAN_FRONTEND=noninteractive)
            if '=' in part:
                continue
                
            # Skip paths (e.g., /var/lib/apt/lists/*)
            if part.startswith('/') or '*' in part:
                continue
                
            # Skip keywords
            if part.lower() in keywords:
                continue
                
            # It's likely a package
            # Verify it looks like a package (alphanumeric, -, ., +)
            if any(c.isalnum() for c in part):
                packages.append(part)
        
        return packages


# Singleton instances
test_context_builder = TestContextBuilder()
dockerfile_learner = DockerfileLearner()
