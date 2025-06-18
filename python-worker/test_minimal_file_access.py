#!/usr/bin/env python3
"""
Minimal test to verify file access is working for attachments and repository files.
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.b2_storage_sdk_fixed import B2StorageService
from services.database_service import database_service
from services.redis_client import redis_client
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_complete_file_access():
    """Test the complete file access pipeline that the AI uses."""
    
    print("🔧 TESTING COMPLETE FILE ACCESS PIPELINE")
    print("=" * 60)
    
    # Test repository
    repo_id = "cmc0s3wtg0007u9dg0panakse"
    
    # 1. Test Redis Connection
    print("\n1️⃣ Testing Redis Connection...")
    try:
        await redis_client.connect()
        redis_ok = await redis_client.ping()
        print(f"   Redis: {'✅ CONNECTED' if redis_ok else '❌ FAILED'}")
    except Exception as e:
        print(f"   Redis: ❌ ERROR - {e}")
        redis_ok = False
    
    # 2. Test B2 Storage
    print("\n2️⃣ Testing B2 Storage...")
    try:
        b2_service = B2StorageService()
        b2_ok = await b2_service.test_connection()
        print(f"   B2 Connection: {'✅ CONNECTED' if b2_ok else '❌ FAILED'}")
        
        if b2_ok:
            files = await b2_service.list_repository_files(repo_id)
            print(f"   B2 Files Found: {len(files)}")
            
            if files:
                # Test downloading first file
                try:
                    content = await b2_service.download_file_content(files[0]['file_key'])
                    print(f"   B2 Download: ✅ SUCCESS ({len(content)} chars)")
                    b2_download_ok = True
                except Exception as e:
                    print(f"   B2 Download: ❌ FAILED - {e}")
                    b2_download_ok = False
            else:
                b2_download_ok = False
        else:
            b2_download_ok = False
            
    except Exception as e:
        print(f"   B2 Storage: ❌ ERROR - {e}")
        b2_ok = False
        b2_download_ok = False
    
    # 3. Test Database Service (This is what the AI uses)
    print("\n3️⃣ Testing Database Service (AI Pipeline)...")
    try:
        # Check repository status
        repo_status = await database_service.get_repository_status(repo_id)
        print(f"   Repository Status: {repo_status.get('embedding_status', 'UNKNOWN')}")
        
        # Get file metadata
        files_metadata = await database_service.get_repository_files(repo_id)
        print(f"   Files in Database: {len(files_metadata)}")
        
        if files_metadata:
            # Test the exact method the AI uses to load file content
            question_analysis = {
                "keywords": ["test", "docker", "python"],
                "tech_stack": ["python", "docker"]
            }
            
            print("   Testing AI file loading method...")
            files_with_content = await database_service.load_file_contents(
                files_metadata[:3],  # Test first 3 files
                question_analysis
            )
            
            if files_with_content:
                print(f"   ✅ AI can load {len(files_with_content)} files with content")
                
                # Show sample content
                sample_file = files_with_content[0]
                print(f"   Sample file: {sample_file['path']}")
                print(f"   Content length: {len(sample_file.get('content', ''))} chars")
                
                db_ok = True
            else:
                print("   ❌ AI cannot load file content")
                db_ok = False
        else:
            print("   ❌ No files found in database")
            db_ok = False
            
    except Exception as e:
        print(f"   Database Service: ❌ ERROR - {e}")
        db_ok = False
    
    # 4. Test Attachment Processing (B2 Direct)
    print("\n4️⃣ Testing Attachment Processing...")
    try:
        # Simulate attachment upload and retrieval
        test_content = "# Test Attachment\nThis is a test attachment content.\n"
        test_repo_id = "test-attachment-repo"
        test_file_path = "test-attachment.md"
        
        # Upload test attachment
        upload_result = await b2_service.upload_file_content(
            test_repo_id, 
            test_file_path, 
            test_content
        )
        print(f"   Attachment Upload: ✅ SUCCESS")
        
        # Download test attachment
        downloaded_content = await b2_service.download_file_content(upload_result['file_key'])
        
        if downloaded_content == test_content:
            print(f"   Attachment Download: ✅ SUCCESS (content matches)")
            attachment_ok = True
        else:
            print(f"   Attachment Download: ❌ CONTENT MISMATCH")
            attachment_ok = False
            
        # Clean up test file
        await b2_service.delete_file(upload_result['file_key'])
        print(f"   Attachment Cleanup: ✅ SUCCESS")
        
    except Exception as e:
        print(f"   Attachment Processing: ❌ ERROR - {e}")
        attachment_ok = False
    
    # 5. Final Summary
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS:")
    print(f"   Redis Connection: {'✅' if redis_ok else '❌'}")
    print(f"   B2 Storage: {'✅' if b2_ok else '❌'}")  
    print(f"   B2 Download: {'✅' if b2_download_ok else '❌'}")
    print(f"   Database/AI Pipeline: {'✅' if db_ok else '❌'}")
    print(f"   Attachment System: {'✅' if attachment_ok else '❌'}")
    
    all_systems_working = all([redis_ok, b2_ok, b2_download_ok, db_ok, attachment_ok])
    
    if all_systems_working:
        print("\n🎉 ALL SYSTEMS WORKING - AI can access both repository files and attachments!")
    else:
        print("\n🚨 SOME SYSTEMS NEED FIXING")
        
        if not db_ok:
            print("   🔥 CRITICAL: AI cannot access repository files!")
        if not attachment_ok:
            print("   🔥 CRITICAL: Attachment system not working!")
    
    # Clean up
    try:
        await redis_client.disconnect()
    except:
        pass
    
    return all_systems_working

if __name__ == "__main__":
    success = asyncio.run(test_complete_file_access())
    sys.exit(0 if success else 1)
