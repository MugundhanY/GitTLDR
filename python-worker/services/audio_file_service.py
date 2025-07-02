# audio_file_service.py
"""
Service abstraction for downloading meeting audio files from Backblaze B2.
Reads all config from settings, uses B2 service abstraction, and returns local file path.
"""
import os
from config.settings import get_settings
from services.b2_singleton import get_b2_storage
import tempfile
import asyncio

settings = get_settings()


async def download_meeting_audio(meeting_id: str, b2_file_key: str = None, dest_path: str = None) -> str:
    """
    Downloads the meeting audio file from B2 to a local path.
    Uses settings for bucket name and credentials. Returns the local file path.
    """
    # Use the main B2 bucket, not a separate meeting bucket
    bucket_name = getattr(settings, "b2_bucket_name", None)
    if not bucket_name:
        raise ValueError("B2 bucket name not set in settings")
    
    if not b2_file_key:
        # Default convention: meetings are stored in meetings/ folder
        b2_file_key = f"meetings/{meeting_id}.wav"
    
    # Ensure the b2_file_key includes the meetings/ prefix if not already present
    if not b2_file_key.startswith("meetings/"):
        b2_file_key = f"meetings/{b2_file_key}"
    
    if dest_path is None:
        temp_dir = tempfile.mkdtemp()
        dest_path = os.path.join(temp_dir, f"{meeting_id}.wav")
    
    b2 = get_b2_storage()
    if not b2:
        raise RuntimeError("B2 storage service is not available")
    
    # Download file as raw bytes and write to dest_path
    content = b2.download_file_bytes(b2_file_key)
    with open(dest_path, "wb") as f:
        f.write(content)
    
    return dest_path
