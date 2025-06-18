"""
Singleton B2 Storage Service to prevent multiple initializations.
"""
from typing import Optional
from services.b2_storage_sdk_fixed import B2StorageService
from utils.logger import get_logger

logger = get_logger(__name__)


class B2StorageSingleton:
    """Singleton wrapper for B2StorageService to prevent multiple initializations."""
    
    _instance: Optional[B2StorageService] = None
    _initialized: bool = False
    
    @classmethod
    def get_instance(cls) -> Optional[B2StorageService]:
        """Get the singleton B2StorageService instance."""
        if not cls._initialized:
            try:
                cls._instance = B2StorageService()
                logger.info("B2 SDK storage service initialized successfully (singleton)")
                cls._initialized = True
            except Exception as e:
                logger.warning(f"B2 storage not available: {str(e)}")
                cls._instance = None
                cls._initialized = True
        
        return cls._instance
    
    @classmethod
    def is_available(cls) -> bool:
        """Check if B2 storage is available."""
        return cls.get_instance() is not None


# Convenience function for easy access
def get_b2_storage() -> Optional[B2StorageService]:
    """Get the B2 storage service instance."""
    return B2StorageSingleton.get_instance()
