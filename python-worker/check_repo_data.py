#!/usr/bin/env python3

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database_service import DatabaseService
import json

async def check_repository_data():
    db = DatabaseService()
    
    print("=== Repository Data Analysis ===")
    
    try:
        # Test getting repository files for a sample repository ID
        # Let's try a couple of common IDs
        test_ids = ["1", "2", "test", "sample"]
        
        for repo_id in test_ids:
            print(f"\nTesting Repository ID: {repo_id}")
            
            try:
                # Check repository status
                status = await db.get_repository_status(repo_id)
                if status:
                    print(f"  Repository found: {status}")
                else:
                    print(f"  Repository not found")
                    continue
                
                # Get files for this repository
                files = await db.get_repository_files(repo_id)
                print(f"  Files: {len(files)} total")
                
                if files:
                    # Language breakdown
                    languages = {}
                    total_size = 0
                    for file in files:
                        lang = file.get('language', 'Unknown')
                        size = file.get('size', 0)
                        languages[lang] = languages.get(lang, 0) + 1
                        total_size += size
                    
                    print(f"  Total size: {total_size:,} bytes ({total_size / 1024 / 1024:.1f} MB)")
                    print(f"  Languages: {dict(sorted(languages.items(), key=lambda x: x[1], reverse=True))}")
                    
                    # Show some sample files
                    print("  Sample files:")
                    for file in files[:5]:
                        print(f"    - {file['path']} ({file.get('language', 'Unknown')}, {file.get('size', 0)} bytes)")
                
            except Exception as e:
                print(f"  Error checking repository {repo_id}: {e}")
        
        # Also check if there's a specific query to get all repositories
        print("\n=== Testing Direct Database Query ===")
        
        # Get connection pool and run a direct query
        pool = await db._get_connection_pool()
        async with pool.acquire() as conn:
            # Check repositories table
            repos = await conn.fetch("SELECT id, name, url, created_at FROM repositories LIMIT 10")
            print(f"Found {len(repos)} repositories:")
            for repo in repos:
                print(f"  - {dict(repo)}")
                
                # Check files for each repository
                files = await conn.fetch("SELECT COUNT(*) as count FROM repository_files WHERE repository_id = $1", repo['id'])
                file_count = files[0]['count'] if files else 0
                print(f"    Files: {file_count}")
    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(check_repository_data())
