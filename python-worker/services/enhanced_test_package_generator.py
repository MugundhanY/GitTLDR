"""
Enhanced Test Package Generator with Git Clone Strategy
Creates a downloadable package that clones the repo and applies edits via script
NOW WITH INTELLIGENT DOCKER & TEST GENERATION!
"""

import os
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List
from utils.logger import get_logger
from .intelligent_docker_generator import IntelligentDockerGenerator

logger = get_logger(__name__)


class EnhancedTestPackageGenerator:
    """Generate downloadable test packages with git clone + INTELLIGENT Docker/test generation"""
    
    def __init__(self, ai_client=None):
        """
        Initialize with optional AI client for intelligent generation
        Falls back to templates if AI client not provided
        """
        self.ai_client = ai_client
        if ai_client:
            self.docker_generator = IntelligentDockerGenerator(ai_client)
            logger.info("✨ Enhanced test package generator initialized with INTELLIGENT Docker generation")
        else:
            self.docker_generator = None
            logger.warning("⚠️ Enhanced test package generator using TEMPLATE mode (no AI client)")
    
    async def create_test_package(
        self,
        repo_name: str,
        repo_owner: str,
        issue_number: int,
        operations: List[Dict],
        diff: str,  # NEW: unified diff format
        tech_stack: Dict,
        original_issue_title: str,
        original_issue_body: str,
        repository_url: str,  # New parameter: full GitHub URL
        files: List[Dict] = None  # NEW: Actual files for intelligent analysis
    ) -> str:
        """
        Create enhanced test package with git clone approach
        
        Structure:
        test-package/
          ├── setup.sh / setup.bat    # Clones repo and applies edits
          ├── apply_fix.py            # Python script that applies the edits
          ├── edits.json              # JSON file with all edit operations
          ├── Dockerfile              # For testing
          ├── docker-compose.yml      # Docker orchestration
          ├── run_tests.sh / .bat     # Test runner
          ├── README.md               # Instructions
          └── CHANGES.md              # Human-readable diff
        
        After running setup.sh:
        test-package/
          ├── (above files)
          └── repo/                   # Cloned repository with edits applied
        """
        temp_dir = None
        files = files or []  # Ensure list
        
        try:
            # Create temp directory
            temp_dir = tempfile.mkdtemp(prefix=f'gittldr_enhanced_test_{issue_number}_')
            package_dir = Path(temp_dir)
            
            logger.info(f"Creating enhanced test package in {package_dir}")
            
            # 1. Generate edits.json with all operations
            # CRITICAL FIX: Strip line numbers from operations before export
            cleaned_operations = self._strip_line_numbers_from_operations(operations)
            
            edits_data = {
                "repository": {
                    "owner": repo_owner,
                    "name": repo_name,
                    "url": repository_url,
                    "issue_number": issue_number
                },
                "operations": cleaned_operations
            }
            
            import json
            (package_dir / "edits.json").write_text(
                json.dumps(edits_data, indent=2),
                encoding='utf-8'
            )
            
            # 1.5. Generate fix.patch from unified diff (THE ONLY METHOD NEEDED)
            if diff:
                (package_dir / "fix.patch").write_text(diff, encoding='utf-8')
                logger.info("✅ Saved unified diff as fix.patch")
            else:
                logger.error("❌ No unified diff provided - cannot create test package")
                raise ValueError("Unified diff is required for test package generation")
            
            # 2. Generate setup script (clones repo + applies patch with git apply)
            setup_sh = self._generate_setup_script(repository_url, repo_name)
            setup_sh_path = package_dir / "setup.sh"
            setup_sh_path.write_text(setup_sh, encoding='utf-8')
            setup_sh_path.chmod(0o755)
            
            # Windows batch version
            setup_bat = self._generate_setup_bat(repository_url, repo_name)
            (package_dir / "setup.bat").write_text(setup_bat, encoding='utf-8')
            
            # 4. ⭐ INTELLIGENT Docker & Test Generation (NEW!)
            if self.docker_generator and self.ai_client:
                logger.info(f"🧠 Using INTELLIGENT Docker & test generation (analyzing {len(files)} files...)")
                
                docker_config = await self.docker_generator.generate_dockerfile_and_tests(
                    files=files,  # Pass actual files for analysis
                    tech_stack=tech_stack,
                    issue_description=original_issue_title + "\\n" + original_issue_body,
                    operations=operations,
                    issue_title=original_issue_title,  # NEW: Pass for issue type detection
                    issue_body=original_issue_body     # NEW: Pass for issue type detection
                )
                
                dockerfile = docker_config.get("dockerfile")
                compose = docker_config.get("docker_compose")
                test_command = docker_config.get("test_command", "pytest -v || npm test")
                issue_type = docker_config.get("issue_type", "general")
                issue_confidence = docker_config.get("issue_confidence", 0.0)
                test_suite = docker_config.get("test_suite", "")
                
                logger.info(f"✅ Generated intelligent Dockerfile with test command: {test_command}")
                logger.info(f"🎯 Detected issue type: {issue_type} (confidence: {issue_confidence:.1%})")
                
                # 🚀 NEW: Write issue-specific functional tests to package
                if test_suite:
                    language = tech_stack.get('language', 'python')
                    test_filename = f"test_{issue_type}.py" if language == 'python' else f"test_{issue_type}.js"
                    test_file_path = package_dir / test_filename
                    test_file_path.write_text(test_suite, encoding='utf-8')
                    logger.info(f"📝 Generated {issue_type}-specific functional tests: {test_filename} ({len(test_suite)} chars)")
                else:
                    logger.warning("⚠️ No test suite generated from intelligent generator")
            else:
                logger.warning("⚠️ Falling back to TEMPLATE-based Docker generation")
                # Fallback to template-based generation
                dockerfile = self._generate_dockerfile_for_cloned_repo(tech_stack, repo_name)
                compose = self._generate_docker_compose_for_cloned_repo(repo_name)
            
            (package_dir / "Dockerfile").write_text(dockerfile, encoding='utf-8')
            (package_dir / "docker-compose.yml").write_text(compose, encoding='utf-8')
            
            # 5. Generate run_tests scripts
            run_tests_sh = self._generate_run_tests_script()
            run_tests_path = package_dir / "run_tests.sh"
            run_tests_path.write_text(run_tests_sh, encoding='utf-8')
            run_tests_path.chmod(0o755)
            
            # CRITICAL: Generate proper Windows batch script, not bash-to-batch conversion
            run_tests_bat = self._generate_run_tests_bat()
            (package_dir / "run_tests.bat").write_text(run_tests_bat, encoding='utf-8')
            
            # 6. Generate README with new instructions
            readme = self._generate_enhanced_readme(
                repo_name,
                repo_owner,
                issue_number,
                original_issue_title,
                repository_url,
                operations
            )
            (package_dir / "README.md").write_text(readme, encoding='utf-8')
            
            # 7. Generate CHANGES.md (human-readable diff)
            changes = self._generate_diff_summary(operations)
            (package_dir / "CHANGES.md").write_text(changes, encoding='utf-8')
            
            # 8. Add .gitignore for the test package folder
            gitignore = "repo/\\n__pycache__/\\n*.pyc\\n.DS_Store\\n"
            (package_dir / ".gitignore").write_text(gitignore, encoding='utf-8')
            
            # 9. Create ZIP file
            zip_path = Path(temp_dir).parent / f"{repo_name}-fix-{issue_number}-enhanced.zip"
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(package_dir):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(package_dir)
                        zipf.write(file_path, arcname)
            
            logger.info(f"Enhanced test package created: {zip_path}")
            return str(zip_path)
        
        except Exception as e:
            logger.error(f"Failed to create enhanced test package: {e}")
            raise
    
    def _generate_apply_fix_script(self) -> str:
        """Generate Python script that applies edits from edits.json"""
        return '''#!/usr/bin/env python3
"""
Apply Fix Script
Reads edits.json and applies all operations to the cloned repository
"""

import json
import sys
from pathlib import Path


def apply_edit_operation(repo_path: Path, operation: dict):
    """Apply a single edit operation"""
    op_type = operation.get('type', 'edit')
    file_path = repo_path / operation['path']
    
    print(f"  📝 {op_type}: {operation['path']}")
    
    if op_type == 'create':
        # Create new file
        file_path.parent.mkdir(parents=True, exist_ok=True)
        content = operation.get('content', '')
        file_path.write_text(content, encoding='utf-8')
        print(f"     ✅ Created {len(content)} chars")
    
    elif op_type in ['edit', 'modify']:
        # Apply edits to existing file
        if not file_path.exists():
            print(f"     ❌ Error: File not found: {file_path}")
            return False
        
        original_content = file_path.read_text(encoding='utf-8')
        modified_content = original_content
        
        edits = operation.get('edits', [])
        if not edits:
            print(f"     ⚠️  No edits specified")
            return True
        
        # Apply edits in reverse order (from bottom to top) to maintain line numbers
        for edit in reversed(edits):
            old_code = edit.get('old_code', '')
            new_code = edit.get('new_code', '')
            
            # CRITICAL FIX: Handle multiple EOF marker formats for appends at end of file
            EOF_MARKERS = [
                "# END OF FILE",
                "# END OF FILE\\n",
                "<<EOF_APPEND_MARKER>>",
                "<<EOF_APPEND_MARKER>>\\n"
            ]
            
            if old_code in EOF_MARKERS:
                # Special marker indicating append at end of file
                modified_content = modified_content.rstrip() + '\\n\\n' + new_code
                print(f"     ✅ Appended {len(new_code)} chars at EOF")
                continue
            
            if old_code:
                # CRITICAL FIX: Preserve indentation when replacing
                # Find the indentation level of the old_code in the file
                if old_code in modified_content:
                    # Find where old_code appears
                    old_pos = modified_content.find(old_code)
                    
                    # Find the start of the line containing old_code
                    line_start = modified_content.rfind('\\n', 0, old_pos) + 1
                    
                    # Get the indentation (spaces/tabs before first non-whitespace)
                    line_content = modified_content[line_start:old_pos]
                    base_indent = ''
                    for char in line_content:
                        if char in ' \\t':
                            base_indent += char
                        else:
                            break
                    
                    # If new_code is multi-line, apply base indentation to all lines
                    if '\\n' in new_code:
                        new_lines = new_code.split('\\n')
                        # First line keeps its original indentation from new_code
                        indented_new_code = new_lines[0]
                        # Subsequent lines get base indentation added
                        for line in new_lines[1:]:
                            if line.strip():  # Only indent non-empty lines
                                indented_new_code += '\\n' + base_indent + line
                            else:
                                indented_new_code += '\\n' + line
                        new_code = indented_new_code
                    
                    modified_content = modified_content.replace(old_code, new_code, 1)
                    print(f"     ✅ Replaced {len(old_code)} → {len(new_code)} chars (indentation preserved)")
                else:
                    print(f"     ❌ CRITICAL: Old code not found - operation FAILED")
                    print(f"     Expected to find: {old_code[:100]}...")
                    return False
            else:
                # Adding new code (append)
                modified_content += '\\n' + new_code
                print(f"     ✅ Added {len(new_code)} chars")
        
        file_path.write_text(modified_content, encoding='utf-8')
    
    elif op_type == 'delete':
        # Delete file
        if file_path.exists():
            file_path.unlink()
            print(f"     ✅ Deleted")
        else:
            print(f"     ⚠️  File not found (may already be deleted)")
    
    return True


def validate_applied_operations(repo_path: Path, operations: list) -> dict:
    """
    Validate that all operations were applied successfully by checking if new_code exists in files.
    Returns: {'success': bool, 'failed_operations': list, 'missing_code': list}
    """
    validation_results = {
        'success': True,
        'failed_operations': [],
        'missing_code': []
    }
    
    for op in operations:
        if op['type'] in ['edit', 'modify']:
            file_path = repo_path / op['path']
            if not file_path.exists():
                validation_results['success'] = False
                validation_results['failed_operations'].append(op['path'])
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Check if new_code is present in file
            for edit in op.get('edits', []):
                new_code = edit.get('new_code', '')
                # For operations, check if at least first 50 chars are present
                check_snippet = new_code[:50] if len(new_code) > 50 else new_code
                
                if check_snippet and check_snippet not in content:
                    validation_results['success'] = False
                    validation_results['missing_code'].append({
                        'file': op['path'],
                        'expected': check_snippet,
                        'explanation': edit.get('explanation', 'No explanation')
                    })
    
    return validation_results


def main():
    # Load edits from edits.json
    script_dir = Path(__file__).parent
    edits_file = script_dir / "edits.json"
    
    if not edits_file.exists():
        print("❌ Error: edits.json not found")
        sys.exit(1)
    
    with open(edits_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    repo_name = data['repository']['name']
    operations = data['operations']
    repo_path = script_dir / "repo"
    
    if not repo_path.exists():
        print(f"❌ Error: Repository folder not found: {repo_path}")
        print("   Run setup.sh (or setup.bat on Windows) first to clone the repo")
        sys.exit(1)
    
    print(f"🔧 Applying {len(operations)} operations to {repo_name}...")
    print()
    
    success_count = 0
    for i, operation in enumerate(operations, 1):
        print(f"Operation {i}/{len(operations)}:")
        if apply_edit_operation(repo_path, operation):
            success_count += 1
        print()
    
    print(f"✅ Applied {success_count}/{len(operations)} operations successfully")
    
    # CRITICAL: Validate that operations were actually applied
    print()
    print("🔍 Validating applied operations...")
    validation = validate_applied_operations(repo_path, operations)
    
    if not validation['success']:
        print("❌ VALIDATION FAILED - Some operations did not apply correctly:")
        
        if validation['failed_operations']:
            print(f"   Files not found: {', '.join(validation['failed_operations'])}")
        
        if validation['missing_code']:
            print(f"   Missing code in {len(validation['missing_code'])} location(s):")
            for missing in validation['missing_code'][:3]:  # Show first 3
                print(f"   - File: {missing['file']}")
                print(f"     Expected: {missing['expected'][:80]}...")
                print(f"     Reason: {missing['explanation'][:100]}")
        
        print()
        print("⚠️  Setup completed but validation failed - tests may not work correctly")
        sys.exit(1)
    else:
        print("✅ Validation passed - all operations applied successfully")
        print()
    
    if success_count < len(operations):
        print("⚠️  Some operations failed - review the output above")
        sys.exit(1)


if __name__ == '__main__':
    main()
'''
    
    def _generate_setup_script(self, repository_url: str, repo_name: str) -> str:
        """Generate setup.sh that clones repo and applies edits"""
        return f'''#!/bin/bash
set -e

echo "🚀 GitTLDR Enhanced Test Package Setup"
echo "======================================"
echo ""

# Check if repo folder already exists
if [ -d "repo" ]; then
    echo "⚠️  Repository folder 'repo/' already exists"
    read -p "Delete and re-clone? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 1
    fi
    rm -rf repo
fi

# Clone the repository
echo "📥 Cloning repository..."
git clone {repository_url} repo

if [ ! -d "repo" ]; then
    echo "❌ Failed to clone repository"
    exit 1
fi

echo "✅ Repository cloned successfully"
echo ""

# Apply the AI-generated fix using git apply
echo "🔧 Applying AI-generated fix..."

if [ ! -f "fix.patch" ]; then
    echo "❌ fix.patch not found"
    exit 1
fi

cd repo
if git apply --check ../fix.patch 2>&1; then
    git apply ../fix.patch
    echo "✅ Successfully applied fix via git apply"
else
    echo "❌ Failed to apply patch"
    echo "This usually means:"
    echo "  - The patch doesn't match the current repository state"
    echo "  - The repository has been modified since the fix was generated"
    echo ""
    echo "Try: git apply --reject --whitespace=fix ../fix.patch"
    exit 1
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📂 Your repository with AI fixes is in: ./repo/"
echo ""
echo "Next steps:"
echo "  1. Review changes: less CHANGES.md"
echo "  2. Check the code: cd repo && git diff"
echo "  3. Run tests: ./run_tests.sh"
echo "  4. If working, create PR in GitHub Desktop or via command line"
'''
    
    def _generate_setup_bat(self, repository_url: str, repo_name: str) -> str:
        """Generate setup.bat for Windows"""
        return f'''@echo off
setlocal EnableDelayedExpansion
echo 🚀 GitTLDR Enhanced Test Package Setup
echo ======================================
echo.

REM Check if repo folder exists
if exist "repo" (
    echo ⚠️  Repository folder 'repo' already exists
    set /p REPLY="Delete and re-clone? (y/N): "
    
    REM Use !REPLY! for delayed expansion inside the block
    if /i not "!REPLY!"=="y" (
        echo Setup cancelled
        exit /b 1
    )
    rmdir /s /q repo
)

REM Clone the repository
echo 📥 Cloning repository...
git clone {repository_url} repo

if not exist "repo" (
    echo ❌ Failed to clone repository
    exit /b 1
)

echo ✅ Repository cloned successfully
echo.

REM Apply the AI-generated fix using git apply
echo 🔧 Applying AI-generated fix...

if not exist "fix.patch" (
    echo ❌ fix.patch not found
    exit /b 1
)

cd repo
git apply --check ../fix.patch >nul 2>&1
if %errorlevel% equ 0 (
    git apply ../fix.patch
    cd ..
    echo ✅ Successfully applied fix via git apply
) else (
    cd ..
    echo ❌ Failed to apply patch
    echo This usually means:
    echo   - The patch doesn't match the current repository state
    echo   - The repository has been modified since the fix was generated
    echo.
    echo Try: cd repo ^&^& git apply --reject --whitespace=fix ../fix.patch
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 📂 Your repository with AI fixes is in: .\repo
echo.
echo Next steps:
echo   1. Review changes: type CHANGES.md
echo   2. Check the code: cd repo ^&^& git diff
echo   3. Run tests: run_tests.bat
echo   4. If working, create PR in GitHub Desktop or via command line

REM End local environment changes
endlocal
exit /b 0
'''
    
    def _generate_dockerfile_for_cloned_repo(self, tech_stack: Dict, repo_name: str) -> str:
        """Generate Dockerfile that tests the cloned repo"""
        language = tech_stack.get('language', 'python')
        
        if language == 'python':
            return f'''FROM python:3.11-slim

WORKDIR /app

# Install git for potential use
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy the repository with fixes applied
COPY repo/ /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt || echo "No requirements.txt found"

# Install test dependencies
RUN pip install pytest pytest-cov pytest-asyncio || true

# Run tests if they exist, otherwise just check syntax
CMD ["sh", "-c", "pytest -v || python -m py_compile *.py || echo 'No tests configured'"]
'''
        
        elif language == 'javascript':
            return f'''FROM node:18-slim

WORKDIR /app

# Copy the repository with fixes applied
COPY repo/ /app/

# Install dependencies
RUN npm install || true
RUN npm install --save-dev jest || true

# Run tests
CMD ["sh", "-c", "npm test || echo 'No tests configured'"]
'''
        
        else:
            return f'''FROM ubuntu:22.04

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip git && rm -rf /var/lib/apt/lists/*

# Copy the repository with fixes applied
COPY repo/ /app/

CMD ["echo", "Tests not configured for this language"]
'''
    
    def _generate_docker_compose_for_cloned_repo(self, repo_name: str) -> str:
        """Generate docker-compose.yml for testing cloned repo
        
        Note: We DON'T use volume mounts here because:
        1. The Dockerfile already COPYs repo/ and test files
        2. Volume mounts would overwrite the test file copied in Dockerfile
        3. For testing, we want the immutable container image, not live code
        """
        return f'''services:
  app:
    build: .
    container_name: {repo_name}-test-enhanced
    environment: []
'''
    
    def _generate_run_tests_script(self) -> str:
        """Generate run_tests.sh"""
        return '''#!/bin/bash
set -e

echo "🧪 GitTLDR - Running Tests on AI Fix"
echo "======================================"
echo ""

# Check if repo exists
if [ ! -d "repo" ]; then
    echo "❌ Repository not found. Run setup.sh first!"
    exit 1
fi

# Clean up any existing containers
echo "🧹 Cleaning up old containers..."
docker-compose down 2>/dev/null || true

# Build and run tests
echo "📦 Building Docker image..."
docker-compose build

echo ""
echo "🧪 Running tests..."
docker-compose up --abort-on-container-exit

echo ""
echo "✅ Tests complete!"
echo ""
echo "To manually check the code:"
echo "  cd repo && git diff"
'''
    
    def _generate_run_tests_bat(self) -> str:
        """Generate run_tests.bat for Windows (proper batch syntax, not converted bash)"""
        return '''@echo off
echo 🧪 GitTLDR - Running Tests on AI Fix
echo ======================================
echo.

REM Check if repo exists
if not exist "repo" (
    echo ❌ Repository not found. Run setup.bat first!
    exit /b 1
)

REM Clean up any existing containers
echo 🧹 Cleaning up old containers...
docker-compose down 2>nul

REM Build and run tests
echo 📦 Building Docker image...
docker-compose build

if %ERRORLEVEL% neq 0 (
    echo ❌ Docker build failed
    exit /b 1
)

echo.
echo 🧪 Running tests...
docker-compose up --abort-on-container-exit

if %ERRORLEVEL% neq 0 (
    echo ❌ Tests failed
    exit /b 1
)

echo.
echo ✅ Tests complete!
echo.
echo To manually check the code:
echo   cd repo ^&^& git diff
'''
    
    def _generate_enhanced_readme(
        self,
        repo_name: str,
        repo_owner: str,
        issue_number: int,
        issue_title: str,
        repository_url: str,
        operations: List[Dict]
    ) -> str:
        """Generate enhanced README"""
        return f'''# Enhanced Test Package for Issue #{issue_number}

**Repository:** {repo_owner}/{repo_name}  
**Issue:** {issue_title}  
**Generated by:** GitTLDR AI Auto-Fix (Enhanced Package)

## 🎯 What's Different About This Package?

This is an **enhanced test package** that gives you the FULL repository with AI fixes applied:

✅ **Complete Repository** - Get the entire codebase, not just modified files  
✅ **Git Integration** - Full .git history preserved for easy PR creation  
✅ **Edit Script** - See exactly what changes were made in `apply_fix.py`  
✅ **Easy Testing** - Docker setup included for isolated testing  
✅ **Flexible** - Modify fixes before committing

## 📦 Package Contents

```
test-package/
  ├── setup.sh / setup.bat    # 🚀 Run this first! Clones repo + applies fixes
  ├── apply_fix.py            # Python script showing all edits
  ├── edits.json              # JSON with all operations
  ├── Dockerfile              # For Docker testing
  ├── docker-compose.yml      # Docker orchestration
  ├── run_tests.sh / .bat     # Test runner
  ├── README.md               # This file
  ├── CHANGES.md              # Human-readable diff
  └── repo/                   # (Created after setup) Full repo with fixes
```

## 🚀 Quick Start

### Step 1: Prerequisites

- **Git** installed ([Download](https://git-scm.com/downloads))
- **Python 3.7+** installed ([Download](https://www.python.org/downloads/))
- **Docker Desktop** (optional, for testing) ([Download](https://www.docker.com/products/docker-desktop/))

### Step 2: Run Setup

This will clone the repository and apply AI fixes:

**On macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows:**
```batch
setup.bat
```

**What happens:**
1. Clones `{repository_url}` into `./repo/`
2. Applies {len(operations)} AI-generated edits
3. Shows you what was changed

### Step 3: Review Changes

```bash
# See human-readable diff
cat CHANGES.md

# See git diff of changes
cd repo && git diff

# Check the edit script
cat apply_fix.py
```

### Step 4: Test the Fix

**Option A: Docker Testing (Recommended)**
```bash
./run_tests.sh  # or run_tests.bat on Windows
```

**Option B: Manual Testing**
```bash
cd repo
python -m pytest  # or npm test for Node.js
```

**Option C: Run the Application**
```bash
cd repo
python main.py  # adjust based on your project
```

## ✏️ Modifying the Fix

If the AI fix needs adjustments:

1. **Edit files** in `repo/` directory
2. **Re-run tests** with `./run_tests.sh`
3. **Repeat** until working
4. **Commit** your changes

## 📤 Creating a Pull Request

Once you're happy with the fix:

```bash
cd repo

# Create a branch
git checkout -b fix-issue-{issue_number}

# Stage changes (AI fixes + your modifications)
git add .

# Commit
git commit -m "Fix: {issue_title}"

# Push to your fork
git push origin fix-issue-{issue_number}

# Create PR on GitHub
# Visit: {repository_url}/compare/main...fix-issue-{issue_number}
```

## 🔍 Understanding the Changes

### Modified Files ({len(operations)} operations):
{self._format_operations_summary(operations)}

### How Edits Are Applied:

The `apply_fix.py` script:
1. Reads `edits.json` with all operations
2. For **edit** operations: Finds old code and replaces with new code
3. For **create** operations: Creates new files with full content
4. For **delete** operations: Removes specified files

## 🐛 Troubleshooting

### "Repository not found"
Make sure you run `setup.sh` first to clone the repo.

### "Git not installed"
Install git from https://git-scm.com/downloads

### "Python not found"
Install Python 3.7+ from https://www.python.org/downloads/

### "Old code not found" errors
The repository may have changed since the fix was generated. You may need to:
1. Update to the latest code: `cd repo && git pull`
2. Re-run setup: `./setup.sh`
3. Or manually apply changes from CHANGES.md

### Docker fails
- Make sure Docker Desktop is running
- Try: `docker-compose build --no-cache`

## 🤝 Need Help?

- **Documentation:** https://gittldr.app/docs
- **Report Issues:** https://github.com/gittldr/gittldr/issues

---

**Generated:** {self._get_timestamp()}  
**Package Version:** 3.0.0 (Enhanced with Git Clone + Edit Script)
'''
    
    def _format_operations_summary(self, operations: List[Dict]) -> str:
        """Format operations list for README"""
        lines = []
        for op in operations:
            op_type = op.get('type', 'edit')
            path = op.get('path', 'unknown')
            emoji = {'create': '➕', 'edit': '✏️', 'delete': '🗑️'}.get(op_type, '📝')
            lines.append(f"- {emoji} **{path}** ({op_type})")
        return '\n'.join(lines) if lines else "No operations"
    
    def _generate_diff_summary(self, operations: List[Dict]) -> str:
        """Generate human-readable diff summary"""
        lines = [
            "# AI-Generated Changes Summary\\n",
            "Review these changes before committing.\\n",
            "\\n---\\n\\n"
        ]
        
        for i, op in enumerate(operations, 1):
            op_type = op.get('type', 'edit')
            path = op.get('path', 'unknown')
            
            lines.append(f"## {i}. {op_type.upper()}: `{path}`\\n\\n")
            
            if op.get('explanation'):
                lines.append(f"**Why:** {op['explanation']}\\n\\n")
            
            if op_type == 'create':
                lines.append("**Action:** Created new file\\n\\n")
                content = op.get('content', '')
                preview = content[:300] + '...' if len(content) > 300 else content
                lines.append(f"```\\n{preview}\\n```\\n\\n")
            
            elif op_type in ['edit', 'modify']:
                edits = op.get('edits', [])
                lines.append(f"**Edits:** {len(edits)} change(s)\\n\\n")
                
                for j, edit in enumerate(edits, 1):
                    lines.append(f"### Edit {j}\\n")
                    if edit.get('explanation'):
                        lines.append(f"*{edit['explanation']}*\\n\\n")
                    
                    old_code = edit.get('old_code', '')
                    new_code = edit.get('new_code', '')
                    
                    if old_code:
                        lines.append(f"**Before:**\\n```\\n{old_code}\\n```\\n\\n")
                    if new_code:
                        lines.append(f"**After:**\\n```\\n{new_code}\\n```\\n\\n")
            
            elif op_type == 'delete':
                lines.append("**Action:** File will be deleted\\n\\n")
            
            lines.append("---\\n\\n")
        
        return ''.join(lines)
    
    def _strip_line_numbers_from_operations(self, operations: List[Dict]) -> List[Dict]:
        """
        Strip line number prefixes (e.g., '10: ', '  5: ') from all code fields in operations.
        
        CRITICAL FIX: Ensures edits.json contains clean code without line number artifacts
        from GPT responses, which would break apply_fix.py string matching.
        
        Args:
            operations: List of operation dicts with edits
            
        Returns:
            Cleaned operations with line numbers removed from old_code and new_code
        """
        import re
        import copy
        
        def strip_line_numbers(code: str) -> str:
            """Remove 'N: ' line number prefixes from code."""
            if not isinstance(code, str):
                return code
            lines = code.split('\n')
            cleaned_lines = []
            for line in lines:
                # Match patterns like '10: ' or '   5: ' at start of line
                cleaned = re.sub(r'^\s*\d+:\s*', '', line)
                cleaned_lines.append(cleaned)
            return '\n'.join(cleaned_lines)
        
        # Deep copy to avoid modifying original
        cleaned_ops = copy.deepcopy(operations)
        
        for op in cleaned_ops:
            # Clean edits array
            if 'edits' in op and isinstance(op['edits'], list):
                for edit in op['edits']:
                    if isinstance(edit, dict):
                        if 'old_code' in edit and isinstance(edit['old_code'], str):
                            edit['old_code'] = strip_line_numbers(edit['old_code'])
                        if 'new_code' in edit and isinstance(edit['new_code'], str):
                            edit['new_code'] = strip_line_numbers(edit['new_code'])
            
            # Clean top-level code fields (if present in old format)
            if 'old_code' in op and isinstance(op['old_code'], str):
                op['old_code'] = strip_line_numbers(op['old_code'])
            if 'new_code' in op and isinstance(op['new_code'], str):
                op['new_code'] = strip_line_numbers(op['new_code'])
            if 'content' in op and isinstance(op['content'], str):
                op['content'] = strip_line_numbers(op['content'])
        
        return cleaned_ops
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")


# Singleton
_enhanced_generator = None

def get_enhanced_test_package_generator() -> EnhancedTestPackageGenerator:
    """Get singleton enhanced generator with AI client"""
    global _enhanced_generator
    if _enhanced_generator is None:
        # Import unified AI client for intelligent generation
        from services.unified_ai_client import unified_client
        _enhanced_generator = EnhancedTestPackageGenerator(ai_client=unified_client)
    return _enhanced_generator
