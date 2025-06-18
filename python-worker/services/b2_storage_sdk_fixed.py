"""
B2 storage service using the official B2 Python SDK.
Uses direct B2 API calls, completely bypassing AWS S3 compatibility layer.
"""
import os
import logging
import base64
from io import BytesIO
from typing import Optional, Dict, Any
from b2sdk.v2 import InMemoryAccountInfo, B2Api
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)
# Disable verbose logging from b2sdk
logging.getLogger('b2sdk').setLevel(logging.WARNING)


class B2StorageService:
    """B2 storage service using the official B2 Python SDK."""
    
    def __init__(self):
        """Initialize B2 storage service with official SDK."""
        settings = get_settings()
        
        # B2 credentials from settings
        self.application_key_id = settings.b2_application_key_id
        self.application_key = settings.b2_application_key
        self.bucket_name = settings.b2_bucket_name
        
        if not all([self.application_key_id, self.application_key, self.bucket_name]):
            raise ValueError("Missing required B2 credentials.")
        
        # Initialize B2 API with in-memory account info
        self.info = InMemoryAccountInfo()
        self.api = B2Api(self.info)
        
        # Authorize account
        self.api.authorize_account("production", self.application_key_id, self.application_key)
          # Get bucket
        self.bucket = self.api.get_bucket_by_name(self.bucket_name)
        
        logger.info("B2 SDK storage service initialized successfully")

    def generate_file_key(self, repo_id: str, file_path: str) -> str:
        """Generate a unique key for storing a file in B2."""
        # Normalize Windows path separators to forward slashes for B2 compatibility
        normalized_path = file_path.replace('\\', '/').lstrip('/')
        return f"repositories/{repo_id}/files/{normalized_path}"

    async def test_connection(self) -> bool:
        """Test B2 connection."""
        try:
            # Try to list files to check connection - use correct B2 SDK API
            file_list = list(self.bucket.ls(folder_to_list='', recursive=False))
            logger.info("B2 SDK connection test successful")
            return True
        except Exception as e:
            logger.error(f"B2 SDK connection test failed: {str(e)}")
            return False

    async def check_connection(self) -> bool:
        """Alias for test_connection for compatibility."""
        return await self.test_connection()

    async def upload_file_content(self, repo_id: str, file_path: str, content: str) -> Dict[str, Any]:
        """Upload file content to B2 using the official SDK."""
        try:
            file_key = self.generate_file_key(repo_id, file_path)
            content_bytes = content.encode('utf-8')
            
            logger.info(f"Uploading file to B2 using SDK: {file_key}")
            
            # Upload bytes directly
            file_info = self.bucket.upload_bytes(
                data_bytes=content_bytes,
                file_name=file_key,
                content_type='text/plain'
            )
            
            # Get download URL (won't be directly accessible unless bucket is public)
            file_url = f"https://f002.backblazeb2.com/file/{self.bucket_name}/{file_key}"
            
            logger.info(f"Successfully uploaded file to B2: {file_key}")
            
            return {
                'file_url': file_url,
                'file_key': file_key,
                'bucket': self.bucket_name,
                'size': len(content_bytes),
                'uploaded_at': None
            }
        except Exception as e:
            logger.error(f"B2 SDK upload failed for {file_path}: {str(e)}")
            
            raise Exception(f"Failed to upload file: {str(e)}")

    async def download_file_content(self, file_key: str) -> str:
        """Download file content from B2 using the official SDK."""
        try:
            logger.info(f"Downloading file from B2 using SDK: {file_key}")
            
            # Download file using BytesIO
            downloaded_file = self.bucket.download_file_by_name(file_key)
            content_io = BytesIO()
            downloaded_file.save(content_io)
            content_bytes = content_io.getvalue()
            content = content_bytes.decode('utf-8')
            
            logger.info(f"Successfully downloaded file from B2: {file_key}")
            return content
        except Exception as e:
            error_str = str(e)
            if "not_found" in error_str.lower() or "404" in error_str:
                logger.error(f"File not found: {file_key}")
                raise FileNotFoundError(f"File not found: {file_key}")
            else:
                logger.error(f"Download error: {error_str}")
                raise Exception(f"Failed to download file from B2: {error_str}")

    async def download_file_by_key(self, file_key: str) -> str:
        """Alias for download_file_content for compatibility."""
        return await self.download_file_content(file_key)

    async def delete_file(self, file_key: str) -> bool:
        """Delete a file from B2 using the official SDK."""
        try:
            logger.info(f"Deleting file from B2 using SDK: {file_key}")
            
            # Find file versions - use correct B2 SDK API without limit
            versions = list(self.bucket.list_file_versions(file_key))
            
            if not versions:
                logger.warning(f"File not found for deletion: {file_key}")
                return True  # Consider it a success if file doesn't exist
            
            # Delete all versions of the file
            for file_version in versions:
                self.bucket.delete_file_version(file_version.id_, file_version.file_name)
            
            logger.info(f"Successfully deleted file from B2: {file_key}")
            return True
        except Exception as e:
            logger.error(f"B2 SDK delete failed for {file_key}: {str(e)}")
            return False    
    async def list_repository_files(self, repo_id: str) -> list:
        """List files for a repository from B2 using the official SDK."""
        try:
            prefix = f"repositories/{repo_id}/files/"
            files = []
            
            # Use correct B2 SDK API - handle both tuple and object responses
            for item in self.bucket.ls(folder_to_list=prefix, recursive=True):
                try:
                    # Handle different return types from B2 SDK
                    if isinstance(item, tuple):
                        # Some versions return (file_info, folder_name) tuples
                        file_version = item[0] if len(item) > 0 else None
                        if file_version is None:
                            continue
                    else:
                        # Direct file version object
                        file_version = item
                    
                    # Extract file information safely
                    if hasattr(file_version, 'file_name') and hasattr(file_version, 'size'):
                        file_path = file_version.file_name.replace(prefix, '')
                        files.append({
                            'file_path': file_path,
                            'file_key': file_version.file_name,
                            'size': getattr(file_version, 'size', 0),
                            'last_modified': getattr(file_version, 'upload_timestamp', None)
                        })
                    else:
                        logger.warning(f"Unexpected item type in B2 listing: {type(item)}")
                        
                except Exception as item_error:
                    logger.warning(f"Error processing B2 list item: {str(item_error)}")
                    continue
            
            logger.info(f"Listed {len(files)} files for repository {repo_id}")
            return files
        except Exception as e:
            logger.error(f"Failed to list repository files: {str(e)}")
            return []