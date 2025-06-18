from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import time
from services.b2_storage_sdk_fixed import B2StorageService
from utils.logger import get_logger
import time

logger = get_logger(__name__)
router = APIRouter()

# Use snake_case for Pydantic models to match JSON standard
class DownloadUrlRequest(BaseModel):
    file_id: str
    file_name: str
    user_id: str

class DeleteAttachmentRequest(BaseModel):
    file_id: str
    user_id: str

class UploadUrlRequest(BaseModel):
    file_name: str
    file_type: str
    file_size: int
    user_id: str
    repository_id: str

def get_b2_service():
    """Dependency to get an instance of the B2StorageService."""
    try:
        return B2StorageService()
    except Exception as e:
        logger.error(f"Failed to initialize B2StorageService: {e}")
        raise HTTPException(status_code=500, detail="B2 storage service not configured")

@router.post("/get-download-url")
async def get_download_url(
    request: DownloadUrlRequest,
    b2_service: B2StorageService = Depends(get_b2_service)
):
    """
    Get a temporary download URL for a file from Backblaze B2.
    """
    try:
        logger.info(f"Generating download URL for file_name: {request.file_name}")
        # Use the file_name directly, which is simpler and more reliable.
        download_url = b2_service.get_download_url_by_name(request.file_name)
        return {"download_url": download_url}
    except Exception as e:
        logger.error(f"Failed to get download URL for file_name {request.file_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete-attachment")
async def delete_attachment(
    request: DeleteAttachmentRequest,
    b2_service: B2StorageService = Depends(get_b2_service)
):
    """
    Delete an attachment from Backblaze B2.
    """
    try:
        logger.info(f"Deleting attachment with file_id: {request.file_id}")
        
        # The service needs the file's unique ID to get info, then the file name to delete.
        file_info = b2_service.get_file_info(request.file_id)
        file_name_to_delete = file_info.get('fileName')
        
        if not file_name_to_delete:
            raise HTTPException(status_code=404, detail=f"File name not found for file_id {request.file_id}")

        # The delete_file method in the SDK service expects the file_name (which is the key).
        await b2_service.delete_file(file_name_to_delete)
        return {"success": True, "message": "Attachment deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete attachment with file_id {request.file_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-url")
async def get_upload_url(
    request: UploadUrlRequest,
    b2_service: B2StorageService = Depends(get_b2_service)
):
    """
    Get an upload URL for a file to be uploaded to Backblaze B2.
    """
    try:
        logger.info(f"Generating upload URL for file: {request.file_name}")
        
        # Generate unique file name with user/repo context
        timestamp = str(int(time.time() * 1000))
        file_extension = request.file_name.split('.')[-1] if '.' in request.file_name else ''
        unique_file_name = f"attachments/{request.user_id}/{request.repository_id}/{timestamp}_{request.file_name}"
        
        # Get upload URL from B2
        upload_url_data = await b2_service.get_upload_url(unique_file_name, request.file_type)
        
        return {
            "upload_url": upload_url_data["upload_url"],
            "authorization_token": upload_url_data["authorization_token"],
            "file_name": unique_file_name,
            "file_id": upload_url_data.get("file_id"),
            "download_url": f"https://f002.backblazeb2.com/file/{b2_service.bucket_name}/{unique_file_name}"
        }
    except Exception as e:
        logger.error(f"Failed to get upload URL for {request.file_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
