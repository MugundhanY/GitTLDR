# audio_file_service.py
"""
Service abstraction for downloading meeting audio files from Backblaze B2.
Reads all config from settings, uses B2 service abstraction, and returns local file path.
"""
import os
from config.settings import get_settings
from services.b2_singleton import get_b2_storage
import tempfile

settings = get_settings()


def download_meeting_audio(meeting_id: str, b2_file_key: str = None, dest_path: str = None) -> str:
    """
    Downloads the meeting audio file from B2 to a local path.
    Uses settings for bucket name and credentials. Returns the local file path.
    """
    bucket_name = getattr(settings, "b2_meeting_audio_bucket", None)
    if not bucket_name:
        raise ValueError("B2 meeting audio bucket name not set in settings")
    if not b2_file_key:
        # Default convention: use meeting_id as file key
        b2_file_key = f"meetings/{meeting_id}.wav"
    if dest_path is None:
        temp_dir = tempfile.mkdtemp()
        dest_path = os.path.join(temp_dir, f"{meeting_id}.wav")
    b2 = get_b2_storage()
    if not b2:
        raise RuntimeError("B2 storage service is not available")
    b2.download_file(bucket_name, b2_file_key, dest_path)
    return dest_path
