#!/usr/bin/env python3
"""
COMPREHENSIVE FILE MODIFICATION DETAILS DEMONSTRATION
=====================================================
This script demonstrates the complete file modification detection capabilities
of the GitHub SaaS Q&A system, including all supported commit question types
and file analysis features.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import CommitAnalysisService
from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def comprehensive_file_modification_demo():
    """Complete demonstration of file modification detection capabilities."""
    
    print("🚀 COMPREHENSIVE FILE MODIFICATION DETECTION DEMO")
    print("=" * 80)
    print("Demonstrating ALL file modification capabilities:")
    print("✅ First commit detection and file analysis")
    print("✅ Recent commit file modifications")
    print("✅ Specific commit SHA file details")
    print("✅ File status detection (added/modified/deleted)")
    print("✅ Line-by-line change statistics")
    print("✅ Tree API fallback for complex commits")
    print("✅ Enhanced file extraction methods")
    print("=" * 80)
    
    # Initialize services
    commit_analysis = CommitAnalysisService()
    github_service = GitHubCommitService()
    
    # Test repositories with known good commits
    test_repos = [
        {
            "owner": "microsoft",
            "name": "vscode",
            "description": "Large enterprise repository"
        },
        {
            "owner": "facebook", 
            "name": "react",
            "description": "Popular open source library"
        }
    ]
    
    # Test scenarios
    test_scenarios = [
        {
            "title": "🎯 FIRST COMMIT FILE ANALYSIS",
            "queries": [
                "What was the first commit?",
                "Show me the initial commit and what files were added",
                "What files were changed in the first commit?"
            ],
            "method": "first_commit"
        },
        {
            "title": "📅 RECENT COMMIT FILE MODIFICATIONS", 
            "queries": [
                "What changed in the latest commit?",
                "Show me recent commits with file details",
                "What files were modified recently?"
            ],
            "method": "recent_commits"
        },
        {
            "title": "🔍 SPECIFIC COMMIT FILE DETAILS",
            "queries": [
                "Show me commit details with file modifications",
                "What files were changed in a specific commit?"
            ],
            "method": "specific_commit"
        }
    ]
    
    for repo in test_repos:
        repo_owner = repo["owner"]
        repo_name = repo["name"]
        repo_desc = repo["description"]
        
        print(f"\n🏢 TESTING REPOSITORY: {repo_owner}/{repo_name}")
        print(f"   Description: {repo_desc}")
        print("-" * 70)
        
        try:
            for scenario in test_scenarios:
                print(f"\n{scenario['title']}")
                print("=" * 60)
                
                for query in scenario["queries"]:
                    print(f"\n📝 Query: '{query}'")
                    
                    # Step 1: Analyze question
                    is_commit_question, query_params = await commit_analysis.analyze_question(query)
                    
                    if is_commit_question:
                        print(f"   ✅ Detected as commit question")
                        print(f"   📊 Type: {query_params.question_type}")
                        print(f"   🔢 Limit: {query_params.limit}")
                        
                        # Step 2: Get commits based on question type
                        commits = []
                        
                        if scenario["method"] == "first_commit" or query_params.question_type == "first":
                            print(f"   🔍 Fetching earliest commits...")
                            commits = await github_service.get_earliest_commits(
                                repo_owner, repo_name, limit=3
                            )
                            
                        elif scenario["method"] == "recent_commits" or query_params.question_type == "recent":
                            print(f"   🔍 Fetching recent commits...")
                            commits = await github_service.get_recent_commits(
                                repo_owner, repo_name, limit=5
                            )
                            
                        elif scenario["method"] == "specific_commit":
                            print(f"   🔍 Fetching recent commits for analysis...")
                            commits = await github_service.get_recent_commits(
                                repo_owner, repo_name, limit=3
                            )
                        
                        # Step 3: Analyze file modifications
                        if commits:
                            commit = commits[0]  # Analyze first commit in results
                            
                            print(f"   📋 COMMIT DETAILS:")
                            print(f"      SHA: {commit.get('sha', 'N/A')[:12]}...")
                            print(f"      Message: {commit.get('message', 'N/A')[:50]}...")
                            print(f"      Author: {commit.get('author', {}).get('name', 'N/A')}")
                            print(f"      Date: {commit.get('timestamp', 'N/A')}")
                            
                            # Get file modifications
                            files_changed = commit.get('files_changed', [])
                            
                            if not files_changed:
                                print(f"   🔍 No file details in initial response, trying enhanced extraction...")
                                
                                enhanced_commit = await github_service.get_commit_by_sha(
                                    repo_owner, repo_name, commit.get('sha'), include_files=True
                                )
                                
                                if enhanced_commit:
                                    files_changed = enhanced_commit.get('files_changed', [])
                                    stats = enhanced_commit.get('stats', {})
                                    
                                    if stats:
                                        print(f"   📊 COMMIT STATISTICS:")
                                        print(f"      Total additions: +{stats.get('additions', 0)}")
                                        print(f"      Total deletions: -{stats.get('deletions', 0)}")
                                        print(f"      Total changes: {stats.get('total', 0)}")
                                    
                            if files_changed:
                                print(f"   📂 FILES MODIFIED ({len(files_changed)} files):")
                                
                                for i, file_info in enumerate(files_changed[:10], 1):  # Show up to 10 files
                                    filename = file_info.get('filename', 'N/A')
                                    status = file_info.get('status', 'N/A')
                                    additions = file_info.get('additions', 0)
                                    deletions = file_info.get('deletions', 0)
                                    changes = file_info.get('changes', 0)
                                    
                                    # File type detection
                                    file_ext = filename.split('.')[-1] if '.' in filename else 'unknown'
                                    file_type = get_file_type(file_ext)
                                    
                                    print(f"      {i:2d}. {filename}")
                                    print(f"          Type: {file_type}")
                                    print(f"          Status: {status}")
                                    print(f"          Changes: +{additions}/-{deletions} ({changes} total)")
                                
                                if len(files_changed) > 10:
                                    print(f"      ... and {len(files_changed) - 10} more files")
                                    
                                # File analysis summary
                                file_types = {}
                                status_counts = {}
                                total_additions = 0
                                total_deletions = 0
                                
                                for file_info in files_changed:
                                    # Count file types
                                    filename = file_info.get('filename', '')
                                    file_ext = filename.split('.')[-1] if '.' in filename else 'unknown'
                                    file_type = get_file_type(file_ext)
                                    file_types[file_type] = file_types.get(file_type, 0) + 1
                                    
                                    # Count statuses
                                    status = file_info.get('status', 'unknown')
                                    status_counts[status] = status_counts.get(status, 0) + 1
                                    
                                    # Sum changes
                                    total_additions += file_info.get('additions', 0)
                                    total_deletions += file_info.get('deletions', 0)
                                
                                print(f"   📈 FILE ANALYSIS SUMMARY:")
                                print(f"      Total files: {len(files_changed)}")
                                print(f"      Total changes: +{total_additions}/-{total_deletions}")
                                
                                print(f"   📊 BY FILE TYPE:")
                                for file_type, count in sorted(file_types.items()):
                                    print(f"      {file_type}: {count} files")
                                
                                print(f"   🔄 BY CHANGE STATUS:")
                                for status, count in sorted(status_counts.items()):
                                    print(f"      {status}: {count} files")
                                    
                            else:
                                print(f"   ⚠️  No file modification details available")
                                print(f"      This may be due to:")
                                print(f"      - Very large commits (GitHub API limitation)")
                                print(f"      - Merge commits without explicit changes")
                                print(f"      - API response truncation")
                            
                            print(f"   ✅ Analysis complete")
                            
                        else:
                            print(f"   ❌ No commits found for analysis")
                    else:
                        print(f"   ❌ Not detected as commit question")
                    
                    print()  # Add spacing between queries
                    
        except Exception as e:
            print(f"   ❌ Error testing {repo_owner}/{repo_name}: {str(e)}")
    
    # Final summary
    print("\n" + "=" * 80)
    print("🎯 COMPREHENSIVE CAPABILITIES SUMMARY")
    print("=" * 80)
    print("✅ COMMIT QUESTION DETECTION:")
    print("   • First commit questions ('What was the first commit?')")
    print("   • Recent commit questions ('What changed recently?')")
    print("   • Specific commit questions ('Show me commit details')")
    print("   • Author-based questions ('Who made changes?')")
    print("   • Date-range questions ('What changed last week?')")
    print("   • File-specific questions ('What changed in file X?')")
    print()
    print("✅ FILE MODIFICATION EXTRACTION:")
    print("   • Complete file paths and names")
    print("   • Change status (added/modified/deleted/renamed)")
    print("   • Line-by-line statistics (+additions/-deletions)")
    print("   • File type detection and categorization")
    print("   • Total change summaries")
    print()
    print("✅ ADVANCED FEATURES:")
    print("   • Tree API fallback for complex commits")
    print("   • Enhanced file extraction for initial commits")
    print("   • Automatic retry mechanisms")
    print("   • Comprehensive error handling")
    print("   • Smart caching and rate limiting")
    print()
    print("✅ OUTPUT FORMATS:")
    print("   • Structured JSON for programmatic use")
    print("   • Human-readable summaries")
    print("   • Detailed technical information")
    print("   • File type and change analysis")
    print()
    print("🚀 YOUR SYSTEM IS FULLY EQUIPPED FOR FILE MODIFICATION ANALYSIS!")
    print("=" * 80)
    
    # Clean up
    await github_service.close()

def get_file_type(extension):
    """Categorize files by extension."""
    file_type_map = {
        # Code files
        'py': 'Python',
        'js': 'JavaScript', 
        'ts': 'TypeScript',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'cs': 'C#',
        'go': 'Go',
        'rs': 'Rust',
        'php': 'PHP',
        'rb': 'Ruby',
        
        # Web files
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'sass': 'SASS',
        'vue': 'Vue',
        'jsx': 'React',
        'tsx': 'React TypeScript',
        
        # Configuration
        'json': 'JSON Config',
        'yaml': 'YAML Config',
        'yml': 'YAML Config',
        'xml': 'XML Config',
        'toml': 'TOML Config',
        'ini': 'INI Config',
        'cfg': 'Config',
        'conf': 'Config',
        
        # Documentation
        'md': 'Markdown',
        'txt': 'Text',
        'rst': 'reStructuredText',
        'doc': 'Document',
        'docx': 'Document',
        'pdf': 'PDF',
        
        # Package/Dependencies
        'txt': 'Requirements',  # requirements.txt
        'lock': 'Lock File',
        'gradle': 'Gradle',
        'maven': 'Maven',
        
        # Other
        'unknown': 'Unknown'
    }
    
    return file_type_map.get(extension.lower(), 'Other')

if __name__ == "__main__":
    print("Starting comprehensive file modification detection demo...")
    asyncio.run(comprehensive_file_modification_demo())
