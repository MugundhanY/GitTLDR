#!/usr/bin/env python3
"""
Test script to inspect the database schema and find where GitHub tokens are stored.
"""
import asyncio
import sys
import os

# Add the python-worker directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database_service import database_service
from utils.logger import get_logger

logger = get_logger(__name__)

async def inspect_database_schema():
    """Inspect the database schema to find GitHub token storage."""
    print("🔍 Inspecting database schema for GitHub token storage...")
    print("=" * 60)
    
    try:
        pool = await database_service._get_connection_pool()
        
        async with pool.acquire() as connection:
            # Check users table structure
            print("📋 Users table columns:")
            result = await connection.fetch(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position
                """
            )
            
            for row in result:
                print(f"   - {row['column_name']}: {row['data_type']} ({'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'})")
            
            print("\n📋 All tables containing 'github' or 'token':")
            # Check for tables with 'github' or 'token' in name
            result = await connection.fetch(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name ILIKE '%github%' OR table_name ILIKE '%token%')
                """
            )
            
            for row in result:
                print(f"   - {row['table_name']}")
            
            print("\n📋 All columns containing 'github' or 'token':")
            # Check for columns with 'github' or 'token' in name
            result = await connection.fetch(
                """
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND (column_name ILIKE '%github%' OR column_name ILIKE '%token%')
                ORDER BY table_name, column_name
                """
            )
            
            for row in result:
                print(f"   - {row['table_name']}.{row['column_name']}: {row['data_type']}")
            
            # Check if there's a sample user to see the data format
            print("\n📋 Sample user data (first 3 users):")
            result = await connection.fetch(
                """
                SELECT id, email, github_login, created_at
                FROM users 
                LIMIT 3
                """
            )
            
            for row in result:
                print(f"   - User {row['id']}: {row['email']}, GitHub: {row['github_login']}")
                
    except Exception as e:
        print(f"❌ Error inspecting database: {str(e)}")

if __name__ == "__main__":
    asyncio.run(inspect_database_schema())
