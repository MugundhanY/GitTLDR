"""
File processor for GitTLDR Python Worker.
Handles repository file processing and content extraction.
"""
import os
import re
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import mimetypes
import tiktoken
from datetime import datetime

from config.settings import get_settings
from utils.logger import get_logger
from processors.document_processor import document_processor

logger = get_logger(__name__)


class FileProcessor:
    """Handles file processing and content extraction."""
    
    def __init__(self):
        self.settings = get_settings()
        self.encoding = tiktoken.get_encoding("cl100k_base")
          # Batch commit summarization configuration
        self.batch_summarize_count = getattr(self.settings, 'batch_commit_summarize_count', 10)
        
        # Supported file extensions (expanded for comprehensive format support)
        self.supported_extensions = {
            # Text and code files
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.md', '.txt', '.yml', '.yaml', '.json', '.xml', '.html', '.css',
            '.sh', '.bash', '.sql', '.r', '.m', '.pl', '.ps1', '.dockerfile',
            '.gitignore', '.env.example', 'makefile', 'readme', 'license',
            
            # Document formats
            '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
            
            # Data formats
            '.csv',
            
            # Image formats
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
            
            # Audio formats
            '.mp3', '.wav', '.flac', '.m4a', '.ogg'
        }
        
        # Binary file extensions to skip (reduced list - now we can process many "binary" formats)
        self.binary_extensions = {
            '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.deb', '.rpm',
            '.tar', '.gz', '.zip', '.rar', '.7z', '.bz2', '.xz',
            '.ttf', '.otf', '.woff', '.woff2', '.eot'
        }
        
        # Directories to skip
        self.skip_dirs = {
            'node_modules', '.git', '.vscode', '.idea', '__pycache__',
            'venv', 'env', '.env', 'dist', 'build', 'out', 'target',
            '.next', '.nuxt', 'coverage', '.nyc_output', 'logs', 'tmp'
        }

    async def process_repository_files(self, repo_path: str, repo_id: str) -> Dict[str, Any]:
        """Process all files in a repository."""
        logger.info(f"Processing repository files for {repo_id}")
        
        try:
            files = []
            total_size = 0
            total_tokens = 0
            processed_count = 0
            skipped_count = 0
            
            # Walk through repository directory
            for root, dirs, filenames in os.walk(repo_path):
                # Skip directories in skip_dirs
                dirs[:] = [d for d in dirs if d not in self.skip_dirs]
                
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(file_path, repo_path)
                    
                    # Process file
                    file_info = await self._process_single_file(
                        file_path, relative_path, repo_id
                    )
                    
                    if file_info:
                        files.append(file_info)
                        total_size += file_info['size']
                        total_tokens += file_info['tokens']
                        processed_count += 1
                    else:
                        skipped_count += 1
            
            result = {
                'repo_id': repo_id,
                'files': files,
                'stats': {
                    'total_files': processed_count,
                    'skipped_files': skipped_count,
                    'total_size': total_size,
                    'total_tokens': total_tokens
                },
                'processed_at': datetime.utcnow().isoformat()
            }
            
            logger.info(
                f"Repository processing complete for {repo_id}",
                processed=processed_count,
                skipped=skipped_count,
                total_size=total_size,
                total_tokens=total_tokens
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing repository {repo_id}: {str(e)}")
            raise

    async def _process_single_file(
        self, file_path: str, relative_path: str, repo_id: str
    ) -> Optional[Dict[str, Any]]:
        """Process a single file and extract metadata."""
        try:
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > self.settings.max_file_size:
                logger.debug(f"Skipping large file: {relative_path}")
                return None
            
            # Check if file should be processed
            if not self._should_process_file(file_path, relative_path):
                return None
            
            # Read file content
            content = await self._read_file_content(file_path)
            if not content:
                return None
            
            # Count tokens
            tokens = len(self.encoding.encode(content))
            
            # Extract file metadata
            file_ext = Path(file_path).suffix.lower()
            file_type = self._get_file_type(file_ext, relative_path)
            
            # Create chunks if content is too large
            chunks = self._create_chunks(content, relative_path)
            
            file_info = {
                'path': relative_path,
                'name': os.path.basename(file_path),
                'extension': file_ext,
                'type': file_type,
                'size': file_size,
                'tokens': tokens,
                'content': content[:10000] if len(content) > 10000 else content,  # Limit for storage
                'chunks': chunks,
                'repo_id': repo_id,
                'language': file_type,  # Add language field for database
                'processed_at': datetime.utcnow().isoformat()
            }
            
            return file_info
            
        except Exception as e:
            logger.warning(f"Error processing file {relative_path}: {str(e)}")
            return None

    def _should_process_file(self, file_path: str, relative_path: str) -> bool:
        """Determine if a file should be processed."""
        # Check file extension
        file_ext = Path(file_path).suffix.lower()
        
        # Skip binary files that we can't process
        if file_ext in self.binary_extensions:
            return False
        
        # Check if supported extension or special file
        filename = os.path.basename(file_path).lower()
        
        # Special files without extensions
        if filename in {'readme', 'license', 'makefile', 'dockerfile'}:
            return True
        
        # Check supported extensions (now includes PDFs, docs, images, audio, etc.)
        if file_ext in self.supported_extensions:
            return True
        
        # For files without extensions, try to detect if they're text files
        if not file_ext and filename not in {'readme', 'license', 'makefile', 'dockerfile'}:
            return False
        
        # Try to read the file to see if it's text-based
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                sample = f.read(1024)
                # If we can read it and it contains mostly printable characters, process it
                if len(sample) > 0:
                    printable_chars = sum(1 for c in sample if c.isprintable() or c in '\n\r\t')
                    if printable_chars / len(sample) > 0.7:  # 70% printable characters
                        return True
        except:
            pass
        
        return False

    async def _read_file_content(self, file_path: str) -> Optional[str]:
        """Read file content safely, with enhanced support for various formats."""
        try:
            file_ext = Path(file_path).suffix.lower()
            
            # For binary formats that need special processing, use document processor
            binary_formats = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', 
                            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
                            '.mp3', '.wav', '.flac', '.m4a', '.ogg'}
            
            if file_ext in binary_formats:
                logger.info(f"Processing binary format {file_ext} with document processor: {file_path}")
                try:
                    # Read as bytes first
                    with open(file_path, 'rb') as f:
                        content_bytes = f.read()
                    
                    # Use document processor
                    result = await document_processor.process_document(
                        content=content_bytes,
                        filename=os.path.basename(file_path),
                        mime_type=None
                    )
                    
                    if result.get('success'):
                        return result['content']
                    else:
                        logger.warning(f"Document processor failed for {file_path}: {result.get('error')}")
                        return f"[Failed to process {file_ext.upper()} file: {os.path.basename(file_path)}]\n{result.get('error', 'Unknown error')}"
                        
                except Exception as doc_error:
                    logger.error(f"Document processor error for {file_path}: {str(doc_error)}")
                    return f"[Error processing {file_ext.upper()} file: {os.path.basename(file_path)}]\n{str(doc_error)}"
            
            # For text files, try UTF-8 first
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with error handling
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
            except:
                # Try latin-1 as fallback
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        return f.read()
                except:
                    logger.warning(f"Could not read file: {file_path}")
                    return None
        except Exception as e:
            logger.warning(f"Error reading file {file_path}: {str(e)}")
            return None

    def _get_file_type(self, extension: str, relative_path: str) -> str:
        """Get file type category."""
        filename = os.path.basename(relative_path).lower()
        
        # Documentation
        if extension in {'.md', '.txt'} or filename in {'readme', 'license'}:
            return 'documentation'
        
        # Configuration  
        elif extension in {'.yml', '.yaml', '.json', '.xml', '.toml', '.ini'} or filename in {'makefile', 'dockerfile'}:
            return 'configuration'
        
        # Web
        elif extension in {'.html', '.css', '.js', '.ts', '.jsx', '.tsx'}:
            return 'web'
        
        # Python
        elif extension == '.py':
            return 'python'
        
        # Database
        elif extension == '.sql':
            return 'database'
        
        # Scripts
        elif extension in {'.sh', '.bash', '.ps1', '.bat'}:
            return 'script'
        
        # Source code
        elif extension in {'.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'}:
            return 'source'
        
        # Documents
        elif extension in {'.pdf', '.docx', '.doc'}:
            return 'document'
        
        # Spreadsheets
        elif extension in {'.xlsx', '.xls', '.csv'}:
            return 'spreadsheet'
        
        # Presentations
        elif extension in {'.pptx', '.ppt'}:
            return 'presentation'
        
        # Images
        elif extension in {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}:
            return 'image'
        
        # Audio
        elif extension in {'.mp3', '.wav', '.flac', '.m4a', '.ogg'}:
            return 'audio'
        
        else:
            return 'other'

    def _create_chunks(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Create content chunks for large files."""
        if len(content) <= self.settings.chunk_size:
            return [{
                'index': 0,
                'content': content,
                'tokens': len(self.encoding.encode(content)),
                'start_line': 1,
                'end_line': len(content.split('\n'))
            }]
        
        chunks = []
        lines = content.split('\n')
        current_chunk = []
        current_size = 0
        chunk_index = 0
        start_line = 1
        
        for i, line in enumerate(lines):
            line_size = len(line.encode('utf-8'))
            
            if current_size + line_size > self.settings.chunk_size and current_chunk:
                # Save current chunk
                chunk_content = '\n'.join(current_chunk)
                chunks.append({
                    'index': chunk_index,
                    'content': chunk_content,
                    'tokens': len(self.encoding.encode(chunk_content)),
                    'start_line': start_line,
                    'end_line': start_line + len(current_chunk) - 1
                })
                
                # Start new chunk
                current_chunk = [line]
                current_size = line_size
                chunk_index += 1
                start_line = i + 1
            else:
                current_chunk.append(line)
                current_size += line_size
        
        # Add final chunk
        if current_chunk:
            chunk_content = '\n'.join(current_chunk)
            chunks.append({
                'index': chunk_index,
                'content': chunk_content,
                'tokens': len(self.encoding.encode(chunk_content)),
                'start_line': start_line,
                'end_line': start_line + len(current_chunk) - 1
            })
        
        return chunks

    async def extract_repository_structure(self, repo_path: str) -> Dict[str, Any]:
        """Extract repository structure and key files."""
        structure = {
            'directories': [],
            'files_by_type': {},
            'key_files': {},
            'stats': {}
        }
        
        try:
            for root, dirs, files in os.walk(repo_path):
                # Skip directories in skip_dirs
                dirs[:] = [d for d in dirs if d not in self.skip_dirs]
                
                rel_root = os.path.relpath(root, repo_path)
                if rel_root != '.':
                    structure['directories'].append(rel_root)
                
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, repo_path)
                    file_ext = Path(file).suffix.lower()
                    file_type = self._get_file_type(file_ext, rel_path)
                    
                    # Group by type
                    if file_type not in structure['files_by_type']:
                        structure['files_by_type'][file_type] = []
                    structure['files_by_type'][file_type].append(rel_path)
                    
                    # Identify key files
                    filename = file.lower()
                    if filename in {'readme.md', 'readme.txt', 'readme'}:
                        structure['key_files']['readme'] = rel_path
                    elif filename in {'license', 'license.txt', 'license.md'}:
                        structure['key_files']['license'] = rel_path
                    elif filename in {'package.json'}:
                        structure['key_files']['package'] = rel_path
                    elif filename in {'requirements.txt'}:
                        structure['key_files']['requirements'] = rel_path
                    elif filename in {'dockerfile'}:
                        structure['key_files']['dockerfile'] = rel_path
                    elif filename in {'makefile'}:
                        structure['key_files']['makefile'] = rel_path
            
            # Calculate stats
            structure['stats'] = {
                'total_directories': len(structure['directories']),
                'total_files': sum(len(files) for files in structure['files_by_type'].values()),
                'file_types': list(structure['files_by_type'].keys())
            }
            
            return structure
            
        except Exception as e:
            logger.error(f"Error extracting repository structure: {str(e)}")
            raise    
    async def process_full_repository(self, task_data: Dict[str, Any], task_logger) -> Dict[str, Any]:
        """Complete repository processing: clone, analyze, store, and update status."""
        import asyncio
        import subprocess
        import tempfile
        import shutil
        import os
        from pathlib import Path
        
        repo_id = task_data.get("repositoryId")
        user_id = task_data.get("userId") 
        repo_url = task_data.get("repoUrl")
        
        task_logger.info("Starting full repository analysis", 
                        repo_id=repo_id, 
                        repo_url=repo_url)
        
        temp_dir = None
        try:
            # Update status to processing
            await self._update_repository_status(repo_id, "PROCESSING")
            
            # Create temporary directory for cloning
            temp_dir = tempfile.mkdtemp(prefix=f"gittldr_repo_{repo_id}_")
            task_logger.info("Created temp directory", path=temp_dir)
              # Clone repository
            task_logger.info("Cloning repository...")
            clone_result = subprocess.run([
                "git", "clone", repo_url, temp_dir
            ], capture_output=True, text=True, timeout=300)
            
            if clone_result.returncode != 0:
                raise Exception(f"Git clone failed: {clone_result.stderr}")
            
            task_logger.info("Repository cloned successfully")
            
            # Process all files
            files_result = await self.process_repository_files(temp_dir, repo_id)
              # Store files in database
            await self._store_files_in_database(repo_id, files_result['files'], task_logger)            # Generate individual file summaries
            await self._generate_file_summaries(repo_id, files_result['files'], task_logger)
            
            # Generate embeddings for processed files
            await self._generate_embeddings(repo_id, files_result['files'], task_logger)
            
            # Build code graph if enabled
            if self.settings.enable_graph_retrieval:
                await self._build_code_graph(repo_id, repo_url, files_result['files'], task_logger)
            
            # Generate summary (optional - can be done later)
            summary = await self._generate_repository_summary(files_result, task_logger)
            
            # Update repository with completion status and summary
            await self._update_repository_completion(repo_id, summary, files_result['stats'])
            
            task_logger.info("Full repository analysis completed successfully")
            
            return {
                "repository_id": repo_id,
                "status": "completed",
                "files_processed": files_result['stats']['total_files'],
                "files_skipped": files_result['stats']['skipped_files'],
                "total_size": files_result['stats']['total_size'],
                "summary_generated": bool(summary)
            }
            
        except subprocess.TimeoutExpired:
            task_logger.error("Repository clone timed out")
            await self._update_repository_status(repo_id, "FAILED")
            raise Exception("Repository clone timed out after 5 minutes")
            
        except Exception as e:
            task_logger.error("Full repository analysis failed", error=str(e))
            await self._update_repository_status(repo_id, "FAILED")
            raise
            
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                    task_logger.info("Cleaned up temp directory")
                except Exception as e:
                    task_logger.warning("Failed to cleanup temp directory", error=str(e))    
    async def _update_repository_status(self, repo_id: str, status: str):
        """Update repository embedding status via Redis (for node-worker to pick up)."""
        from services.redis_client import redis_client
        
        try:
            # Store status update in Redis for node-worker to process
            await redis_client.hset(
                f"repository_status:{repo_id}",
                mapping={
                    "embedding_status": status,
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": "python_worker"
                }
            )
            
            # Also publish an event for real-time updates
            await redis_client.publish(
                "repository_updates",
                f"{repo_id}:{status}"
            )
            
            logger.info(f"Updated repository {repo_id} status to {status}")
            
        except Exception as e:
            logger.error(f"Failed to update repository status: {str(e)}")
            # Don't fail the entire task for status update issues
    async def _store_files_in_database(self, repo_id: str, files: List[Dict], task_logger):
        """Store processed files in B2 storage and queue metadata for node-worker to handle."""
        from services.b2_storage_sdk_fixed import B2StorageService
        from services.redis_client import redis_client
        
        try:            # Initialize B2 storage service
            b2_storage = B2StorageService()
            
            # Test B2 connection
            if not await b2_storage.test_connection():
                task_logger.warning("B2 storage connection failed, will store files with fallback content")
            
            successful_uploads = 0
            failed_uploads = 0
            file_metadata_list = []
            
            # Upload files to B2 and collect metadata
            for file_data in files:                
                try:
                    # Upload file content to B2
                    upload_result = await b2_storage.upload_file_content(
                        repo_id=repo_id,
                        file_path=file_data['path'],
                        content=file_data['content']
                    )
                    
                    # Check if upload succeeded or failed with fallback content
                    if upload_result.get('fallback_content'):
                        # Upload failed, but we have fallback content
                        failed_uploads += 1
                        task_logger.warning(f"B2 upload failed for {file_data['path']}, using fallback content")
                        
                        file_metadata = {
                            "repository_id": repo_id,
                            "path": file_data['path'],
                            "name": file_data['name'],
                            "type": 'file',
                            "size": file_data['size'],
                            "language": file_data.get('language', ''),
                            "content": upload_result['fallback_content'],  # Store fallback content
                            "file_key": upload_result['file_key'],  # Keep file key for potential retry
                            "uploaded_at": datetime.utcnow().isoformat(),
                            "upload_failed": True
                        }
                    else:
                        # Upload succeeded
                        successful_uploads += 1
                        file_metadata = {
                            "repository_id": repo_id,
                            "path": file_data['path'],
                            "name": file_data['name'],
                            "type": 'file',
                            "size": file_data['size'],
                            "language": file_data.get('language', ''),
                            "file_url": upload_result['file_url'],
                            "file_key": upload_result['file_key'],
                            "uploaded_at": datetime.utcnow().isoformat()
                        }
                    
                    file_metadata_list.append(file_metadata)
                    
                except Exception as file_error:
                    failed_uploads += 1
                    task_logger.warning(f"Failed to upload file {file_data['path']}: {str(file_error)}")
                    
                    # Store metadata with content as fallback (no B2 URL)
                    file_metadata = {
                        "repository_id": repo_id,
                        "path": file_data['path'],
                        "name": file_data['name'],
                        "type": 'file',
                        "size": file_data['size'],
                        "language": file_data.get('language', ''),
                        "content": file_data['content'],
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "upload_failed": True
                    }
                    file_metadata_list.append(file_metadata)
              # Store file metadata in Redis for node-worker to process
            if file_metadata_list:
                # Queue for node-worker to process (store in database)
                await redis_client.lpush(
                    "file_metadata_queue",
                    *[json.dumps(metadata) for metadata in file_metadata_list]
                )
                  # Store individual file metadata for Q&A retrieval
                for metadata in file_metadata_list:
                    file_key = f"file:{repo_id}:{metadata['path']}"
                    # Convert all values to strings for Redis
                    string_metadata = {k: str(v) for k, v in metadata.items()}
                    await redis_client.hset(file_key, mapping=string_metadata)
                
                # Store file list for easy Q&A access
                file_paths_list = [metadata['path'] for metadata in file_metadata_list]
                await redis_client.hset(
                    f"repo_files:{repo_id}",
                    mapping={
                        "file_count": str(len(file_metadata_list)),
                        "successful_uploads": str(successful_uploads),
                        "failed_uploads": str(failed_uploads),
                        "processed_at": datetime.utcnow().isoformat(),
                        "file_paths": json.dumps(file_paths_list)
                    }
                )
            
            task_logger.info(
                f"File storage complete: {successful_uploads} uploaded to B2, {failed_uploads} stored as fallback"
            )
            
        except Exception as e:
            task_logger.error("Failed to store files", error=str(e))
            # Don't fail the entire task for storage issues            raise Exception(f"File storage failed: {str(e)}")

    async def _generate_embeddings(self, repo_id: str, files: List[Dict[str, Any]], task_logger):
        """Generate embeddings for processed files."""
        from services.gemini_client import gemini_client
        from services.qdrant_client import qdrant_client
        
        try:
            task_logger.info(f"Starting embedding generation for {len(files)} files")
            
            embeddings_created = 0
            embeddings_failed = 0
            
            for file_data in files:
                try:                    # Skip empty files or very large files, but allow short meaningful files
                    content = file_data.get('content', '')
                    if not content or len(content.strip()) < 1 or len(content) > 100000:  # 100KB limit
                        task_logger.debug(f"Skipping embedding for {file_data['path']}: empty, too short, or too large")
                        continue
                    
                    # Generate embedding using Gemini
                    task_logger.debug(f"Generating embedding for {file_data['path']}")
                    embedding = await gemini_client.generate_embedding(content)
                    
                    # Prepare metadata for Qdrant
                    metadata = {
                        "repo_id": repo_id,
                        "file_path": file_data['path'],
                        "file_name": file_data['name'],
                        "file_type": file_data.get('type', 'unknown'),
                        "language": file_data.get('language', ''),
                        "content_type": "file",
                        "size": file_data.get('size', 0),
                        "tokens": file_data.get('tokens', 0),
                        "created_at": datetime.utcnow().isoformat()                    }
                    
                    # Store embedding in Qdrant with repo-specific filtering
                    point_id = str(uuid.uuid4())  # Generate a proper UUID for Qdrant
                    await qdrant_client.store_embedding_with_metadata(
                        embedding=embedding,
                        metadata=metadata,
                        point_id=point_id
                    )
                    
                    embeddings_created += 1
                    task_logger.debug(f"Created embedding for {file_data['path']}")
                    
                except Exception as e:
                    embeddings_failed += 1
                    task_logger.warning(f"Failed to create embedding for {file_data['path']}: {str(e)}")
                    continue
                task_logger.info(f"Embedding generation complete: {embeddings_created} created, {embeddings_failed} failed")
            
        except Exception as e:
            task_logger.error(f"Error in embedding generation: {str(e)}")
            # Don't fail the entire task for embedding issues

    async def _generate_file_summaries(self, repo_id: str, files: List[Dict[str, Any]], task_logger):
        """Generate summaries for individual files."""
        from services.redis_client import redis_client
        
        try:
            task_logger.info(f"Starting file summary generation for {len(files)} files")
            
            summaries_created = 0
            summaries_failed = 0
            file_summary_updates = []
            
            for file_data in files:
                try:
                    # Skip empty files, very large files, or binary files
                    content = file_data.get('content', '')
                    file_path = file_data.get('path', '')
                    file_ext = file_data.get('extension', '').lower()                    # Skip files that don't need summaries
                    if not content or len(content.strip()) < 3:  # Lowered from 10 to 3 characters
                        task_logger.debug(f"Skipping summary for {file_path}: too short or empty")
                        continue
                    
                    # Lower threshold for important config/documentation files
                    is_important_file = any(file_path.lower().endswith(ext) for ext in [
                        '.md', '.txt', '.json', '.yml', '.yaml', '.toml', '.ini', '.conf', 
                        '.cfg', '.env', '.gitignore', 'dockerfile', 'makefile', 'readme', 'license'
                    ]) or any(name in file_path.lower() for name in [
                        'readme', 'license', 'changelog', 'contributing', 'dockerfile', 'makefile'
                    ])
                    
                    # For important files, process even very short content (3+ chars)
                    # For code files, require at least 10 characters
                    min_length = 3 if is_important_file else 10
                    if len(content.strip()) < min_length:
                        task_logger.debug(f"Skipping summary for {file_path}: too short")
                        continue
                    
                    if len(content) > 50000:  # 50KB limit for summarization
                        task_logger.debug(f"Skipping summary for {file_path}: too large")
                        continue
                    
                    # Skip binary-like files
                    if file_ext in {'.png', '.jpg', '.jpeg', '.gif', '.pdf', '.exe', '.dll', '.bin'}:
                        task_logger.debug(f"Skipping summary for {file_path}: binary file")
                        continue
                    
                    # Generate file summary using summarization processor
                    from processors.summarization import SummarizationProcessor
                    summarization_processor = SummarizationProcessor()
                    
                    summary_task_data = {
                        "filePath": file_path,
                        "content": content,
                        "language": file_data.get('language', ''),
                        "repositoryId": repo_id
                    }
                    
                    summary_result = await summarization_processor.summarize_file(
                        summary_task_data, task_logger
                    )
                    
                    if summary_result.get('status') == 'completed':
                        # Queue file summary update for node-worker to handle
                        file_summary_update = {
                            "type": "file_summary",
                            "repository_id": repo_id,
                            "file_path": file_path,
                            "summary": summary_result.get('summary', ''),
                            "updated_at": datetime.utcnow().isoformat()
                        }
                        file_summary_updates.append(file_summary_update)
                        summaries_created += 1
                        
                        task_logger.debug(f"Generated summary for {file_path}")
                    
                except Exception as e:
                    summaries_failed += 1
                    task_logger.warning(f"Failed to create summary for {file_data.get('path', 'unknown')}: {str(e)}")
                    continue
            
            # Queue all file summary updates for node-worker to process
            if file_summary_updates:
                await redis_client.lpush(
                    "file_summary_queue",
                    *[json.dumps(update) for update in file_summary_updates]
                )
                task_logger.info(f"Queued {len(file_summary_updates)} file summary updates")
            
            task_logger.info(f"File summary generation complete: {summaries_created} created, {summaries_failed} failed")
            
        except Exception as e:
            task_logger.error(f"Error in file summary generation: {str(e)}")
            # Don't fail the entire task for summary issues

    async def _generate_repository_summary(self, files_result: Dict, task_logger) -> str:
        """Generate AI summary of the repository."""
        try:
            # Simple summary based on file statistics
            stats = files_result['stats']
            files_by_lang = {}
            
            for file_data in files_result['files']:
                lang = file_data.get('language', 'unknown')
                files_by_lang[lang] = files_by_lang.get(lang, 0) + 1
            
            # Create basic summary
            summary_parts = []
            summary_parts.append(f"Repository contains {stats['total_files']} files")
            
            if files_by_lang:
                top_languages = sorted(files_by_lang.items(), key=lambda x: x[1], reverse=True)[:3]
                lang_str = ", ".join([f"{lang} ({count})" for lang, count in top_languages])
                summary_parts.append(f"Primary languages: {lang_str}")
            
            summary_parts.append(f"Total size: {stats['total_size']} bytes")
            
            summary = ". ".join(summary_parts) + "."
            task_logger.info("Generated repository summary")
            return summary
            
        except Exception as e:
            task_logger.warning("Failed to generate summary", error=str(e))
            return ""    
    async def _update_repository_completion(self, repo_id: str, summary: str, stats: Dict):
        """Update repository with completion data via Redis."""
        from services.redis_client import redis_client
        
        try:            # Store completion data in Redis for node-worker to update database
            completion_data = {
                "embedding_status": "COMPLETED",
                "summary": summary,
                "file_count": str(stats['total_files']),
                "total_size": str(stats['total_size']),
                "updated_at": datetime.utcnow().isoformat(),
                "completed_by": "python_worker"
            }
            
            await redis_client.hset(
                f"repository_completion:{repo_id}",
                mapping=completion_data
            )
            
            # Also update the status tracking
            await redis_client.hset(
                f"repository_status:{repo_id}",
                mapping={
                    "embedding_status": "COMPLETED",
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": "python_worker"
                }
            )
            
            # Publish completion event
            await redis_client.publish(
                "repository_updates",
                f"{repo_id}:COMPLETED"
            )
            
            logger.info(f"Updated repository {repo_id} completion data")
            
        except Exception as e:
            logger.error(f"Failed to update repository completion: {str(e)}")
            # Don't fail the entire task for status update issues

    def _extract_github_avatar_url(self, author_email: str, author_name: str) -> Optional[str]:
        """
        Extract GitHub avatar URL from author information without requiring API tokens.
        Enhanced to handle initial commits and various email formats consistently.
        """
        try:
            # Handle GitHub noreply emails (most common for GitHub users)
            if 'users.noreply.github.com' in author_email:
                import re
                match = re.match(r'^(\d+)\+(.+)@users\.noreply\.github\.com$', author_email)
                if match:
                    github_user_id = match.group(1)
                    github_username = match.group(2)
                    
                    # GitHub's public avatar URL pattern (no auth required)
                    avatar_url = f"https://avatars.githubusercontent.com/u/{github_user_id}?v=4"
                    
                    logger.debug(f"Extracted GitHub avatar for {github_username}: {avatar_url}")
                    return avatar_url
            
            # Handle regular GitHub emails - try to extract username
            elif author_email and '@' in author_email:
                # For initial commits or regular emails, try to guess GitHub username
                potential_username = None
                
                # Try email prefix (before @) if it looks like a GitHub username
                email_prefix = author_email.split('@')[0].lower()
                if self._is_likely_github_username(email_prefix):
                    potential_username = email_prefix
                
                # Try author name (remove spaces, convert to lowercase) if email didn't work
                elif author_name:
                    # Clean author name: remove spaces, special chars, convert to lowercase
                    clean_name = re.sub(r'[^a-zA-Z0-9-]', '', author_name.replace(' ', '')).lower()
                    if self._is_likely_github_username(clean_name):
                        potential_username = clean_name
                    
                    # Also try just the first name if full name didn't work
                    if not potential_username and ' ' in author_name:
                        first_name = author_name.split()[0].lower()
                        clean_first_name = re.sub(r'[^a-zA-Z0-9-]', '', first_name)
                        if self._is_likely_github_username(clean_first_name):
                            potential_username = clean_first_name
                
                if potential_username:
                    avatar_url = f"https://avatars.githubusercontent.com/{potential_username}?v=4"
                    logger.debug(f"Inferred GitHub avatar for {author_name} ({author_email}): {avatar_url}")
                    return avatar_url
            
            # Fallback: try Gravatar if we have an email
            elif author_email and '@' in author_email:
                import hashlib
                email_hash = hashlib.md5(author_email.lower().strip().encode()).hexdigest()
                gravatar_url = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s=40"
                logger.debug(f"Using Gravatar fallback for {author_email}: {gravatar_url}")
                return gravatar_url
            
            # No avatar could be determined
            return None
            
        except Exception as e:
            logger.warning(f"Error extracting avatar from {author_email}: {str(e)}")
            return None

    def _is_likely_github_username(self, username: str) -> bool:
        """Check if a string looks like a valid GitHub username."""
        import re
        if not username or len(username) < 1 or len(username) > 39:
            return False
        
        # GitHub usernames: alphanumeric and hyphens, can't start/end with hyphen
        # Must not be all numbers (likely not a username)
        if username.isdigit():
            return False
            
        # Check valid GitHub username pattern
        return bool(re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$', username))
    
    def _generate_github_commit_url(self, repo_id: str, commit_sha: str, repo_url: str = None) -> str:
        """Generate GitHub commit URL from repository information."""
        try:
            # If we have the repo URL, extract owner/repo from it
            if repo_url:
                import re
                match = re.match(r'https://github\.com/([^/]+)/([^/]+)(?:\.git)?/?$', repo_url)
                if match:
                    owner, repo_name = match.groups()
                    return f"https://github.com/{owner}/{repo_name}/commit/{commit_sha}"
            
            # Fallback: try to construct from repo_id if it contains owner/repo info
            # This assumes repo_id might be in format "owner_repo" or similar
            return f"https://github.com/unknown/repository/commit/{commit_sha}"
            
        except Exception as e:
            logger.warning(f"Error generating commit URL: {str(e)}")
            return f"https://github.com/unknown/repository/commit/{commit_sha}"
    
    async def _build_code_graph(
        self, 
        repo_id: str, 
        repo_url: str,
        files: List[Dict[str, Any]], 
        task_logger
    ) -> None:
        """Build code graph structure in Neo4j."""
        from services.code_graph_builder import code_graph_builder
        from services.neo4j_client import neo4j_client
        from services.database_service import database_service
        
        try:
            if not neo4j_client.is_connected():
                task_logger.warning("Neo4j not connected, skipping graph building")
                return
            
            task_logger.info("🕸️ Building code graph structure...")
            
            # Get repository metadata from database
            repo_status = await database_service.get_repository_status(repo_id)
            
            repository_metadata = {
                'name': repo_status.get('name', 'Unknown'),
                'url': repo_url,
                'language': repo_status.get('language', ''),
                'description': repo_status.get('description', ''),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Build graph from files
            graph_stats = await code_graph_builder.build_repository_graph(
                repository_id=repo_id,
                repository_metadata=repository_metadata,
                files=files
            )
            
            task_logger.info("✅ Code graph built successfully", **graph_stats)
            
            # Store graph stats in database
            try:
                neo4j_stats = await neo4j_client.get_repository_stats(repo_id)
                task_logger.info("📊 Graph statistics", **neo4j_stats)
            except Exception as e:
                task_logger.warning(f"Failed to get graph stats: {str(e)}")
        
        except Exception as e:
            task_logger.error(f"Failed to build code graph: {str(e)}")
            # Don't fail the entire task for graph building issues
            task_logger.warning("Continuing without code graph")

