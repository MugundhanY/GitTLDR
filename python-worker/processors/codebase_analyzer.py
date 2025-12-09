"""
Codebase Analyzer - Understands repository structure and patterns
"""
import os
import ast
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from utils.logger import get_logger

logger = get_logger(__name__)


class CodebaseAnalyzer:
    """Analyzes codebase structure, patterns, and conventions."""
    
    def __init__(self):
        self.file_structure = {}
        self.language_breakdown = {}
        self.framework_detected = None
        self.conventions = {}
        
    async def analyze_repository(
        self,
        repo_path: str,
        file_service
    ) -> Dict[str, Any]:
        """
        Comprehensive codebase analysis.
        
        Returns:
            - Project type (backend, frontend, fullstack, library)
            - Languages and frameworks
            - Directory structure
            - Code conventions
            - Entry points
            - Testing setup
            - Dependencies
        """
        logger.info(f"Starting comprehensive codebase analysis for {repo_path}")
        
        analysis = {
            "project_type": await self._detect_project_type(repo_path, file_service),
            "languages": await self._detect_languages(repo_path, file_service),
            "frameworks": await self._detect_frameworks(repo_path, file_service),
            "structure": await self._analyze_structure(repo_path, file_service),
            "conventions": await self._detect_conventions(repo_path, file_service),
            "entry_points": await self._find_entry_points(repo_path, file_service),
            "test_setup": await self._analyze_test_setup(repo_path, file_service),
            "dependencies": await self._analyze_dependencies(repo_path, file_service),
            "config_files": await self._find_config_files(repo_path, file_service),
            "documentation": await self._find_documentation(repo_path, file_service)
        }
        
        logger.info(f"Analysis complete: {analysis['project_type']} project with {len(analysis['languages'])} languages")
        return analysis
    
    async def _detect_project_type(self, repo_path: str, file_service) -> str:
        """Detect if backend, frontend, fullstack, library, CLI, etc."""
        
        indicators = {
            "backend": ["api/", "server/", "controllers/", "models/", "routes/"],
            "frontend": ["components/", "pages/", "app/", "src/components/", "public/"],
            "fullstack": ["frontend/", "backend/", "client/", "server/"],
            "library": ["lib/", "pkg/", "setup.py", "pyproject.toml"],
            "cli": ["cmd/", "cli/", "bin/", "__main__.py"]
        }
        
        files = await file_service.list_files(repo_path)
        
        scores = {proj_type: 0 for proj_type in indicators}
        
        for file_path in files:
            for proj_type, patterns in indicators.items():
                for pattern in patterns:
                    if pattern in file_path.lower():
                        scores[proj_type] += 1
        
        # Special checks
        if any("package.json" in f for f in files):
            if any("next.config" in f for f in files):
                return "fullstack"
            if any("src/app" in f or "app/" in f for f in files):
                scores["frontend"] += 5
        
        if any("requirements.txt" in f or "pyproject.toml" in f for f in files):
            scores["backend"] += 3
        
        return max(scores, key=scores.get) if scores else "unknown"
    
    async def _detect_languages(self, repo_path: str, file_service) -> List[Dict[str, Any]]:
        """Detect all programming languages used."""
        
        extensions = {
            ".py": "Python",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".jsx": "JavaScript",
            ".go": "Go",
            ".rs": "Rust",
            ".java": "Java",
            ".cpp": "C++",
            ".c": "C",
            ".rb": "Ruby",
            ".php": "PHP",
            ".swift": "Swift",
            ".kt": "Kotlin",
            ".cs": "C#",
            ".scala": "Scala",
            ".r": "R"
        }
        
        files = await file_service.list_files(repo_path)
        language_counts = {}
        
        for file_path in files:
            ext = Path(file_path).suffix.lower()
            if ext in extensions:
                lang = extensions[ext]
                language_counts[lang] = language_counts.get(lang, 0) + 1
        
        # Sort by file count
        languages = [
            {"name": lang, "file_count": count}
            for lang, count in sorted(language_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return languages
    
    async def _detect_frameworks(self, repo_path: str, file_service) -> List[str]:
        """Detect frameworks and libraries used."""
        
        frameworks = []
        files = await file_service.list_files(repo_path)
        
        # Check for specific files/patterns
        framework_indicators = {
            "Next.js": ["next.config.js", "next.config.ts"],
            "React": ["package.json"],  # Check dependencies
            "Vue": ["vue.config.js", "vite.config.js"],
            "Angular": ["angular.json"],
            "Django": ["manage.py", "settings.py"],
            "Flask": ["app.py", "flask"],
            "FastAPI": ["main.py"],  # Check imports
            "Express": ["express"],
            "NestJS": ["nest-cli.json"],
            "Spring": ["pom.xml", "build.gradle"],
            "Laravel": ["artisan", "composer.json"]
        }
        
        for framework, indicators in framework_indicators.items():
            for indicator in indicators:
                if any(indicator in f.lower() for f in files):
                    if framework not in frameworks:
                        frameworks.append(framework)
                        break
        
        # Check package.json dependencies
        for file_path in files:
            if file_path.endswith("package.json"):
                try:
                    content = await file_service.read_file(file_path)
                    pkg = json.loads(content)
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                    
                    if "react" in deps and "React" not in frameworks:
                        frameworks.append("React")
                    if "vue" in deps and "Vue" not in frameworks:
                        frameworks.append("Vue")
                    if "express" in deps and "Express" not in frameworks:
                        frameworks.append("Express")
                    if "@nestjs/core" in deps and "NestJS" not in frameworks:
                        frameworks.append("NestJS")
                except:
                    pass
        
        # Check requirements.txt/pyproject.toml
        for file_path in files:
            if file_path.endswith("requirements.txt"):
                try:
                    content = await file_service.read_file(file_path)
                    if "django" in content.lower() and "Django" not in frameworks:
                        frameworks.append("Django")
                    if "flask" in content.lower() and "Flask" not in frameworks:
                        frameworks.append("Flask")
                    if "fastapi" in content.lower() and "FastAPI" not in frameworks:
                        frameworks.append("FastAPI")
                except:
                    pass
        
        return frameworks
    
    async def _analyze_structure(self, repo_path: str, file_service) -> Dict[str, Any]:
        """Analyze directory structure and organization."""
        
        files = await file_service.list_files(repo_path)
        
        structure = {
            "root_directories": set(),
            "src_location": None,
            "test_location": None,
            "docs_location": None,
            "config_location": None,
            "depth": 0
        }
        
        for file_path in files:
            parts = Path(file_path).parts
            
            if len(parts) > 0:
                structure["root_directories"].add(parts[0])
            
            structure["depth"] = max(structure["depth"], len(parts))
            
            # Find common directories
            path_lower = file_path.lower()
            if "/src/" in path_lower or path_lower.startswith("src/"):
                structure["src_location"] = "src/"
            if "/test" in path_lower or path_lower.startswith("test"):
                structure["test_location"] = path_lower.split("/test")[0] + "/test"
            if "/docs/" in path_lower or path_lower.startswith("docs/"):
                structure["docs_location"] = "docs/"
            if "/config/" in path_lower or path_lower.startswith("config/"):
                structure["config_location"] = "config/"
        
        structure["root_directories"] = list(structure["root_directories"])
        
        return structure
    
    async def _detect_conventions(self, repo_path: str, file_service) -> Dict[str, Any]:
        """Detect code conventions (naming, formatting, etc.)."""
        
        conventions = {
            "naming_style": "unknown",
            "indentation": "unknown",
            "quotes": "unknown",
            "line_length": 80,
            "import_style": "unknown"
        }
        
        files = await file_service.list_files(repo_path)
        python_files = [f for f in files if f.endswith(".py")]
        
        if python_files:
            # Sample a few files to detect conventions
            sample_file = python_files[0] if python_files else None
            if sample_file:
                try:
                    content = await file_service.read_file(sample_file)
                    
                    # Detect indentation
                    if "    " in content:  # 4 spaces
                        conventions["indentation"] = "4 spaces"
                    elif "  " in content:  # 2 spaces
                        conventions["indentation"] = "2 spaces"
                    elif "\t" in content:
                        conventions["indentation"] = "tabs"
                    
                    # Detect quotes
                    single_quotes = content.count("'")
                    double_quotes = content.count('"')
                    conventions["quotes"] = "single" if single_quotes > double_quotes else "double"
                    
                    # Detect naming (snake_case vs camelCase)
                    if "_" in content:
                        conventions["naming_style"] = "snake_case"
                    else:
                        conventions["naming_style"] = "camelCase"
                except:
                    pass
        
        return conventions
    
    async def _find_entry_points(self, repo_path: str, file_service) -> List[str]:
        """Find application entry points."""
        
        entry_points = []
        files = await file_service.list_files(repo_path)
        
        common_entry_points = [
            "main.py",
            "__main__.py",
            "app.py",
            "server.py",
            "index.py",
            "index.js",
            "index.ts",
            "main.go",
            "main.rs",
            "app.js",
            "server.js"
        ]
        
        for file_path in files:
            filename = Path(file_path).name.lower()
            if filename in common_entry_points:
                entry_points.append(file_path)
        
        return entry_points
    
    async def _analyze_test_setup(self, repo_path: str, file_service) -> Dict[str, Any]:
        """Analyze testing setup and conventions."""
        
        files = await file_service.list_files(repo_path)
        
        test_setup = {
            "has_tests": False,
            "test_framework": None,
            "test_directories": [],
            "test_files": []
        }
        
        test_patterns = ["test_", "_test.", "spec.", ".test.", ".spec."]
        test_dirs = ["tests/", "test/", "__tests__/", "spec/"]
        
        for file_path in files:
            # Check for test directories
            for test_dir in test_dirs:
                if test_dir in file_path.lower():
                    if test_dir not in test_setup["test_directories"]:
                        test_setup["test_directories"].append(test_dir)
                    test_setup["has_tests"] = True
            
            # Check for test files
            filename = Path(file_path).name.lower()
            for pattern in test_patterns:
                if pattern in filename:
                    test_setup["test_files"].append(file_path)
                    test_setup["has_tests"] = True
                    break
        
        # Detect test framework
        for file_path in files:
            if file_path.endswith(("requirements.txt", "package.json", "pyproject.toml")):
                try:
                    content = await file_service.read_file(file_path)
                    content_lower = content.lower()
                    
                    if "pytest" in content_lower:
                        test_setup["test_framework"] = "pytest"
                    elif "unittest" in content_lower:
                        test_setup["test_framework"] = "unittest"
                    elif "jest" in content_lower:
                        test_setup["test_framework"] = "jest"
                    elif "mocha" in content_lower:
                        test_setup["test_framework"] = "mocha"
                    elif "vitest" in content_lower:
                        test_setup["test_framework"] = "vitest"
                except:
                    pass
        
        return test_setup
    
    async def _analyze_dependencies(self, repo_path: str, file_service) -> Dict[str, List[str]]:
        """Extract all dependencies."""
        
        dependencies = {
            "python": [],
            "javascript": [],
            "go": [],
            "rust": []
        }
        
        files = await file_service.list_files(repo_path)
        
        # Python dependencies
        for file_path in files:
            if file_path.endswith("requirements.txt"):
                try:
                    content = await file_service.read_file(file_path)
                    deps = [line.split("==")[0].split(">=")[0].strip() 
                            for line in content.split("\n") 
                            if line.strip() and not line.startswith("#")]
                    dependencies["python"].extend(deps)
                except:
                    pass
        
        # JavaScript/TypeScript dependencies
        for file_path in files:
            if file_path.endswith("package.json"):
                try:
                    content = await file_service.read_file(file_path)
                    pkg = json.loads(content)
                    deps = list(pkg.get("dependencies", {}).keys())
                    dev_deps = list(pkg.get("devDependencies", {}).keys())
                    dependencies["javascript"].extend(deps + dev_deps)
                except:
                    pass
        
        return dependencies
    
    async def _find_config_files(self, repo_path: str, file_service) -> List[str]:
        """Find all configuration files."""
        
        config_patterns = [
            ".env",
            "config.py",
            "config.js",
            "config.ts",
            "settings.py",
            "next.config",
            "vite.config",
            "webpack.config",
            "tsconfig.json",
            "jest.config",
            "pytest.ini",
            ".eslintrc",
            ".prettierrc"
        ]
        
        files = await file_service.list_files(repo_path)
        config_files = []
        
        for file_path in files:
            filename = Path(file_path).name.lower()
            for pattern in config_patterns:
                if pattern in filename:
                    config_files.append(file_path)
                    break
        
        return config_files
    
    async def _find_documentation(self, repo_path: str, file_service) -> List[str]:
        """Find documentation files."""
        
        doc_patterns = [
            "README.md",
            "CONTRIBUTING.md",
            "CHANGELOG.md",
            "docs/",
            "documentation/"
        ]
        
        files = await file_service.list_files(repo_path)
        doc_files = []
        
        for file_path in files:
            for pattern in doc_patterns:
                if pattern.lower() in file_path.lower():
                    doc_files.append(file_path)
                    break
        
        return doc_files
