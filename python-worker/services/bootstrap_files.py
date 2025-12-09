"""
Bootstrap File Detection - Always fetch these for context
==========================================================

For "add feature" requests, the AI needs to see the main application
structure even if the feature doesn't exist yet. This prevents hallucination
by providing framework context.

Example: Adding WebSocket to FastAPI app
- Without bootstrap: AI sees 0 files, generates generic websockets.serve() code
- With bootstrap: AI sees main.py with FastAPI app, generates @app.websocket()
"""

import asyncio
from typing import List, Dict, Any
from utils.logger import get_logger
from services.github_tools import GitHubTools

logger = get_logger(__name__)


class BootstrapFileDetector:
    """Detect main application entry points and core files."""
    
    # Priority-ordered patterns for main files
    MAIN_FILE_PATTERNS = [
        # Python
        'main.py', 'app.py', '__main__.py', 'server.py', 'application.py',
        'manage.py',  # Django
        'wsgi.py', 'asgi.py',  # WSGI/ASGI
        
        # Node.js
        'index.js', 'app.js', 'server.js', 'main.js',
        'index.ts', 'app.ts', 'server.ts', 'main.ts',
        
        # Next.js
        'pages/_app.js', 'pages/_app.tsx', 'app/layout.tsx',
        
        # Configuration (useful for detecting tech stack)
        'package.json', 'requirements.txt', 'pyproject.toml',
        'tsconfig.json', 'vite.config.js', 'next.config.js', 'webpack.config.js',
        
        # API/Routes
        'routes.py', 'api.py', 'router.py', 'urls.py',  # Python
        'routes.js', 'api.js', 'router.js', 'routes.ts',  # Node.js
    ]
    
    async def get_bootstrap_files(
        self,
        repository_id: str,
        issue_type: str,
        max_files: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get essential bootstrap files for context.
        
        Args:
            repository_id: GitHub repo identifier (owner/name)
            issue_type: 'feature', 'bug', 'performance', etc.
            max_files: Maximum bootstrap files to retrieve
            
        Returns:
            List of file objects with path, content, language
        """
        logger.info(f"🔍 Detecting bootstrap files for {issue_type} request")
        
        bootstrap_files = []
        
        # For features, ALWAYS include main files
        if issue_type in ['feature', 'enhancement', 'feat']:
            logger.info("📦 Feature request detected - fetching main app files")
            
            # Try to get files from repository root
            try:
                # List files in repository root
                root_files = await GitHubTools.list_files(repository_id, pattern='*.*')
                logger.debug(f"Found {len(root_files)} files in repository root")
                
                # Also check common subdirectories
                common_dirs = ['src', 'app', 'pages', 'api']
                all_files = list(root_files)
                
                for dir_name in common_dirs:
                    try:
                        dir_files = await GitHubTools.list_files(repository_id, pattern=f'{dir_name}/*.*')
                        all_files.extend(dir_files)
                    except Exception:
                        pass  # Directory doesn't exist, skip
                
                logger.debug(f"Total files to check: {len(all_files)}")
                
                # Match against known patterns
                for pattern in self.MAIN_FILE_PATTERNS:
                    for file_path in all_files:
                        filename = file_path.split('/')[-1]
                        
                        # Exact match on filename
                        if filename == pattern:
                            try:
                                logger.info(f"📄 Fetching bootstrap file: {file_path}")
                                file_data = await GitHubTools.get_file(repository_id, file_path)
                                bootstrap_files.append(file_data)
                                logger.info(f"✅ Retrieved bootstrap file: {file_path}")
                                
                                if len(bootstrap_files) >= max_files:
                                    break
                            except Exception as e:
                                logger.warning(f"Failed to fetch {file_path}: {e}")
                    
                    if len(bootstrap_files) >= max_files:
                        break
                        
            except Exception as e:
                logger.error(f"Failed to list repository files: {e}")
        
        logger.info(f"📦 Retrieved {len(bootstrap_files)} bootstrap files")
        return bootstrap_files


# Global instance
bootstrap_detector = BootstrapFileDetector()
