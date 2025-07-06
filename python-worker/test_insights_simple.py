#!/usr/bin/env python3
"""
Quick test script for the analytics insights endpoint.
"""
import asyncio
import json
import requests
import time

def test_insights_endpoint():
    """Test the analytics insights endpoint."""
    url = "http://localhost:8001/api/generate-insights"
    
    # Sample analytics data
    test_data = {
        "analytics": {
            "overview": {
                "totalUsers": 5,
                "totalRepositories": 3,
                "totalMeetings": 12,
                "totalQuestions": 45,
                "totalActionItems": 23,
                "growthRate": 15.5
            },
            "meetingStats": {
                "averageDuration": 45,
                "completionRate": 85.5
            },
            "fileStats": {
                "byLanguage": [
                    {"language": "Python", "count": 150},
                    {"language": "JavaScript", "count": 89},
                    {"language": "TypeScript", "count": 45}
                ],
                "totalSizeGB": 2.5
            },
            "qaStats": {
                "averageConfidence": 0.82,
                "total": 45
            }
        },
        "timeRange": "30d"
    }
    
    try:
        print("🧠 Testing AI Insights endpoint...")
        print(f"📤 POST {url}")
        
        response = requests.post(
            url,
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! AI Insights generated:")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Generated at: {result.get('generated_at', 'unknown')}")
            print(f"   Number of insights: {len(result.get('insights', []))}")
            
            for i, insight in enumerate(result.get('insights', [])[:3], 1):
                print(f"   {i}. {insight}")
                
            if len(result.get('insights', [])) > 3:
                print(f"   ... and {len(result.get('insights', [])) - 3} more")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure the server is running on localhost:8001")
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_insights_endpoint()
