#!/usr/bin/env python3
"""
Lightweight AI Insights Service for GitTLDR Analytics
"""
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

class InsightsHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "healthy", "service": "AI Insights Service"}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/generate-insights':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                
                insights = self.generate_insights(request_data.get('analytics', {}))
                
                response = {
                    "status": "success",
                    "insights": insights,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = {
                    "status": "error",
                    "message": str(e),
                    "insights": ["Unable to generate AI insights at this time."]
                }
                self.wfile.write(json.dumps(error_response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def generate_insights(self, analytics):
        """Generate contextual insights from analytics data"""
        insights = []
        overview = analytics.get('overview', {})
        meeting_stats = analytics.get('meetingStats', {})
        file_stats = analytics.get('fileStats', {})
        qa_stats = analytics.get('qaStats', {})
        
        # Meeting insights
        total_meetings = overview.get('totalMeetings', 0)
        if total_meetings > 0:
            completion_rate = meeting_stats.get('completionRate', 0)
            avg_duration = meeting_stats.get('averageDuration', 0)
            
            if completion_rate > 80:
                insights.append(f"🎯 Excellent meeting completion rate of {completion_rate:.1f}% shows strong team engagement and effective follow-through.")
            elif completion_rate > 60:
                insights.append(f"📊 Meeting completion rate of {completion_rate:.1f}% is good with room for improvement in follow-through.")
            
            if avg_duration > 90:
                insights.append("⏰ Consider shorter, more focused meetings to boost efficiency and engagement.")
            elif 30 <= avg_duration <= 60:
                insights.append("✅ Meeting durations are well-optimized for productive discussions.")
            
            insights.append(f"🤝 {total_meetings} meetings conducted show active team collaboration and communication.")
        
        # Code insights
        total_files = overview.get('totalFiles', 0)
        if file_stats.get('byLanguage') and len(file_stats['byLanguage']) > 0:
            top_lang = file_stats['byLanguage'][0]
            lang_name = top_lang.get('language', 'Unknown')
            file_count = top_lang.get('count', 0)
            insights.append(f"💻 {lang_name} dominance ({file_count} files) indicates consistent technology choices and team expertise.")
        
        if total_files > 100:
            insights.append(f"📁 Substantial codebase with {total_files} files demonstrates mature project development.")
        elif total_files > 0:
            insights.append(f"🚀 Growing codebase with {total_files} files shows active development progress.")
        
        # Q&A insights
        total_questions = qa_stats.get('total', 0)
        if total_questions > 0:
            avg_confidence = qa_stats.get('averageConfidence', 0) * 100
            if avg_confidence > 75:
                insights.append(f"🎓 High Q&A confidence ({avg_confidence:.1f}%) indicates excellent knowledge sharing.")
            elif avg_confidence > 50:
                insights.append(f"📚 Q&A confidence ({avg_confidence:.1f}%) shows good knowledge base with room for improvement.")
            
            insights.append(f"❓ {total_questions} questions demonstrate active learning culture and collaboration.")
        
        # Growth insights
        growth_rate = overview.get('growthRate', 0)
        if growth_rate > 15:
            insights.append(f"🚀 Outstanding growth rate ({growth_rate:.1f}%) shows rapid platform adoption.")
        elif growth_rate > 5:
            insights.append(f"📈 Healthy growth rate ({growth_rate:.1f}%) indicates steady progress and engagement.")
        elif growth_rate < -5:
            insights.append("📉 Declining trend suggests reviewing engagement strategies and project direction.")
        
        # User engagement
        total_users = overview.get('totalUsers', 0)
        active_users = overview.get('activeUsers', 0)
        if total_users > 1 and active_users > 0:
            activity_rate = (active_users / total_users) * 100
            if activity_rate > 70:
                insights.append(f"🔥 High user engagement ({activity_rate:.1f}% active) shows strong platform adoption.")
            else:
                insights.append(f"👥 {activity_rate:.1f}% user activity indicates opportunities to increase engagement.")
        
        # Storage insights
        storage_gb = overview.get('totalStorageGB', 0)
        if storage_gb > 5:
            insights.append(f"💾 Substantial data storage ({storage_gb:.1f} GB) shows comprehensive documentation.")
        elif storage_gb > 1:
            insights.append(f"📦 Growing data repository ({storage_gb:.1f} GB) indicates increasing content coverage.")
        
        # Fallback insights
        if not insights:
            insights = [
                "🎯 Welcome to analytics! Start conducting meetings and asking questions for richer insights.",
                "📊 Your dashboard will become more powerful as you use the platform actively.",
                "🚀 Regular team meetings and knowledge sharing will unlock advanced analytics features.",
                "💡 Every interaction adds value - meetings, questions, and repositories enhance AI insights."
            ]
        
        return insights[:6]  # Limit to 6 insights

    def log_message(self, format, *args):
        """Override to reduce verbose logging"""
        pass

def run_server():
    """Run the insights server"""
    server_address = ('', 8001)
    httpd = HTTPServer(server_address, InsightsHandler)
    print("🚀 AI Insights Service started on http://localhost:8001")
    print("🔗 Health check: http://localhost:8001/health")
    print("🧠 Insights endpoint: http://localhost:8001/api/generate-insights")
    print("Press Ctrl+C to stop the server\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
