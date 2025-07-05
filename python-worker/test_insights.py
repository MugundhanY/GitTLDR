#!/usr/bin/env python3
"""
Simple test script for AI insights endpoint
"""
import asyncio
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Insights Test Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyticsInsightsRequest(BaseModel):
    analytics: dict
    timeRange: str = "30d"

class AnalyticsInsightsResponse(BaseModel):
    status: str
    insights: List[str]
    generated_at: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Insights Test Server"}

@app.post("/api/generate-insights", response_model=AnalyticsInsightsResponse)
async def generate_analytics_insights(request: AnalyticsInsightsRequest):
    """Generate AI-powered insights from analytics data."""
    import time
    
    # Extract key metrics
    overview = request.analytics.get('overview', {})
    meeting_stats = request.analytics.get('meetingStats', {})
    file_stats = request.analytics.get('fileStats', {})
    qa_stats = request.analytics.get('qaStats', {})
    
    insights = []
    
    # Meeting insights
    total_meetings = overview.get('totalMeetings', 0)
    if total_meetings > 0:
        completion_rate = meeting_stats.get('completionRate', 0)
        avg_duration = meeting_stats.get('averageDuration', 0)
        
        if completion_rate > 80:
            insights.append(f"🎯 Excellent meeting completion rate of {completion_rate:.1f}% demonstrates strong team engagement and effective follow-through on action items.")
        elif completion_rate > 60:
            insights.append(f"📊 Meeting completion rate of {completion_rate:.1f}% is solid, but there's opportunity to improve follow-through and accountability.")
        else:
            insights.append(f"⚠️ Meeting completion rate of {completion_rate:.1f}% suggests need for better structure, clearer action items, and improved tracking.")
        
        if avg_duration > 90:
            insights.append("⏰ Consider breaking long meetings into focused sessions to maintain engagement and productivity.")
        elif avg_duration > 30 and avg_duration <= 60:
            insights.append("✅ Meeting duration is well-optimized for productive discussions and decision-making.")
        
        insights.append(f"📈 Your team has conducted {total_meetings} meetings in this period, showing active collaboration and communication.")
    
    # Code and file insights
    if file_stats.get('byLanguage'):
        top_languages = file_stats['byLanguage'][:3]
        if len(top_languages) > 0:
            top_lang = top_languages[0]
            insights.append(f"💻 {top_lang.get('language', 'Unknown')} dominance with {top_lang.get('count', 0)} files indicates consistent technology choices and team expertise.")
        
        if len(top_languages) > 1:
            insights.append(f"🔧 Multi-language codebase ({', '.join([lang.get('language', '') for lang in top_languages])}) shows technical diversity and adaptability.")
    
    total_files = overview.get('totalFiles', 0)
    if total_files > 100:
        insights.append(f"📁 Substantial codebase with {total_files} files demonstrates mature project development and comprehensive functionality.")
    elif total_files > 0:
        insights.append(f"🚀 Growing codebase with {total_files} files shows active development and expanding capabilities.")
    
    # Q&A insights
    total_questions = qa_stats.get('total', 0)
    if total_questions > 0:
        avg_confidence = qa_stats.get('averageConfidence', 0) * 100
        if avg_confidence > 75:
            insights.append(f"🎓 High Q&A confidence score of {avg_confidence:.1f}% indicates excellent knowledge sharing and comprehensive documentation.")
        elif avg_confidence > 50:
            insights.append(f"📚 Q&A confidence score of {avg_confidence:.1f}% is good, with opportunities to enhance documentation quality and knowledge base completeness.")
        else:
            insights.append(f"📖 Q&A confidence score of {avg_confidence:.1f}% suggests significant opportunities to improve documentation and knowledge sharing practices.")
        
        insights.append(f"❓ {total_questions} questions asked shows active learning culture and team collaboration in knowledge sharing.")
    
    # Growth and team insights
    growth_rate = overview.get('growthRate', 0)
    if growth_rate > 15:
        insights.append(f"🚀 Outstanding growth rate of {growth_rate:.1f}% indicates rapid team expansion and increasing platform adoption.")
    elif growth_rate > 5:
        insights.append(f"📈 Healthy growth rate of {growth_rate:.1f}% shows steady progress and positive team engagement trends.")
    elif growth_rate < -5:
        insights.append("📉 Declining activity trend suggests need to review team engagement strategies and project direction.")
    
    total_users = overview.get('totalUsers', 0)
    active_users = overview.get('activeUsers', 0)
    if total_users > 1 and active_users > 0:
        activity_rate = (active_users / total_users) * 100
        if activity_rate > 70:
            insights.append(f"🔥 High user engagement with {activity_rate:.1f}% of users being active shows strong platform adoption.")
        else:
            insights.append(f"👥 {activity_rate:.1f}% user activity rate indicates opportunities to increase engagement and platform utilization.")
    
    # Storage insights
    storage_gb = overview.get('totalStorageGB', 0)
    if storage_gb > 5:
        insights.append(f"💾 Substantial data storage ({storage_gb:.1f} GB) indicates comprehensive project documentation and rich content repository.")
    elif storage_gb > 1:
        insights.append(f"📦 Growing data repository ({storage_gb:.1f} GB) shows increasing content and documentation coverage.")
    
    # Default insights if no data
    if not insights:
        insights = [
            "🎯 Welcome to your analytics dashboard! Start by conducting meetings and asking questions to see meaningful insights.",
            "📊 Analytics will become more powerful as you use the platform - every meeting, question, and repository adds value.",
            "🚀 Consider setting up regular team meetings and encouraging knowledge sharing to maximize platform benefits.",
            "💡 The more data you generate, the more personalized and actionable these AI insights become."
        ]
    
    return AnalyticsInsightsResponse(
        status="success",
        insights=insights[:6],  # Limit to 6 insights max
        generated_at=time.strftime("%Y-%m-%d %H:%M:%S")
    )

if __name__ == "__main__":
    print("🚀 Starting AI Insights Test Server...")
    print("📊 Server will be available at: http://localhost:8001")
    print("🔗 Health check: http://localhost:8001/health")
    print("🧠 AI Insights endpoint: http://localhost:8001/api/generate-insights")
    
    uvicorn.run(
        "test_insights:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
