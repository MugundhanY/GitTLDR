#!/usr/bin/env python3
"""
Test script to diagnose file retrieval issues.
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.b2_storage_sdk_fixed import B2StorageService
from services.database_service import database_service
from services.file_service import FileRetrievalService

async def test_file_retrieval():
    """Test file retrieval from different sources."""
    repository_id = 'cmc0s3wtg0007u9dg0panakse'
    
    print("=== Testing B2 Storage ===")
    try:
        b2_service = B2StorageService()
        connection_result = await b2_service.test_connection()
        print(f"B2 Connection: {'✅ SUCCESS' if connection_result else '❌ FAILED'}")
        
        if connection_result:
            files = await b2_service.list_repository_files(repository_id)
            print(f"Files in B2: {len(files)}")
            if files:
                print(f"Sample file: {files[0]['file_path']} ({files[0]['size']} bytes)")
                
                # Try to download the first file
                try:
                    content = b2_service.download_file_content(files[0]['file_key'])
                    print(f"Downloaded content length: {len(content)} characters")
                    print(f"Content preview: {content[:100]}...")
                except Exception as download_error:
                    print(f"❌ Download failed: {download_error}")
            
    except Exception as b2_error:
        print(f"❌ B2 Error: {b2_error}")
    
    print("\n=== Testing Database Service ===")
    try:
        repo_status = await database_service.get_repository_status(repository_id)
        print(f"Repository status: {repo_status}")
        
        files_metadata = await database_service.get_repository_files(repository_id)
        print(f"Files in database: {len(files_metadata)}")
        
        if files_metadata:
            print(f"Sample file metadata: {files_metadata[0]['path']}")
            
            # Try to load content for the first file
            try:
                content = await database_service._load_file_content(files_metadata[0])
                if content:
                    print(f"✅ Successfully loaded content: {len(content)} characters")
                else:
                    print("❌ No content returned")
            except Exception as load_error:
                print(f"❌ Content loading failed: {load_error}")
        
    except Exception as db_error:
        print(f"❌ Database Error: {db_error}")
    
    print("\n=== Testing File Retrieval Service ===")
    try:
        file_service = FileRetrievalService()
        
        # Check if repository is processed
        is_processed = await file_service.is_repository_processed(repository_id)
        print(f"Repository processed: {'✅ YES' if is_processed else '❌ NO'}")
        
        # Get repository files
        repo_files = await file_service.get_repository_files(repository_id)
        print(f"Files from file service: {len(repo_files)}")
        
        if repo_files:
            sample_file = repo_files[0]
            print(f"Sample file: {sample_file['path']}")
            
            # Try to get file content
            content = await file_service.get_file_content(repository_id, sample_file['path'])
            if content:
                print(f"✅ Retrieved content: {len(content)} characters")
            else:
                print("❌ No content retrieved")
                
    except Exception as file_service_error:
        print(f"❌ File Service Error: {file_service_error}")

if __name__ == "__main__":
    asyncio.run(test_file_retrieval())
