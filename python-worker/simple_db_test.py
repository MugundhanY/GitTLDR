#!/usr/bin/env python3
"""
Simple test to check repository files in database.
"""
import asyncio
import asyncpg
import os

async def check_repo_files():
    try:
        # Connect directly to database
        conn = await asyncpg.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', 5432),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'gittldr')
        )
        
        # Check repositories
        repos = await conn.fetch("SELECT id, name, embedding_status FROM repositories LIMIT 5")
        print(f"Found {len(repos)} repositories:")
        for repo in repos:
            print(f"  - {repo['name']} ({repo['id']}) - Status: {repo['embedding_status']}")
            
            # Check files for this repo
            files = await conn.fetch("SELECT id, path, name, file_key FROM repository_files WHERE repository_id = $1 LIMIT 5", repo['id'])
            print(f"    Files: {len(files)}")
            for file in files:
                print(f"      - {file['path']} (Key: {file['file_key']})")
            
            if len(files) == 0:
                print("    No files found - this could be the issue!")
            print()
            
        await conn.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_repo_files())
