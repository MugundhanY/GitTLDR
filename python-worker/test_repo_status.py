#!/usr/bin/env python3
"""
Quick test to check repository status and files in database.
"""
import asyncio
from services.database_service import database_service
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_repo_status():
    try:
        # First check if we have any repositories
        pool = await database_service._get_connection_pool()
        async with pool.acquire() as connection:
            # List all tables
            tables = await connection.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            print(f"Found {len(tables)} tables in database:")
            for table in tables:
                print(f"  - {table['table_name']}")
            print()
            
            # List all repositories
            repos = await connection.fetch("SELECT id, name, full_name, embedding_status FROM repositories LIMIT 10")
            print(f"Found {len(repos)} repositories in database:")
            for repo in repos:
                print(f"  - {repo['name']} (ID: {repo['id']}) - Status: {repo['embedding_status']}")
                print()
                
    except Exception as e:
        logger.error(f"Error checking repo status: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_repo_status())
