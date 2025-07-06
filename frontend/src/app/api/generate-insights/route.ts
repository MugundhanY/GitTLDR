import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { analytics, timeRange } = await request.json();
    
    if (!analytics) {
      return NextResponse.json({ error: 'Analytics data is required' }, { status: 400 });
    }

    // Generate insights based on analytics data
    const insights = generateInsights(analytics, timeRange);
    
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

function generateInsights(analytics: any, timeRange: string): string[] {
  const insights: string[] = [];
  
  // Meeting insights
  if (analytics.meetingStats) {
    const { totalDuration, averageDuration, completionRate, statusBreakdown } = analytics.meetingStats;
    
    if (averageDuration > 60) {
      insights.push("Consider shortening meeting duration to improve team focus and productivity. Current average is above optimal range.");
    }
    
    if (completionRate < 80) {
      insights.push("Meeting completion rate could be improved. Consider better agenda planning and time management.");
    }
    
    const completedMeetings = statusBreakdown?.find((s: any) => s.status === 'completed')?.count || 0;
    const totalMeetings = statusBreakdown?.reduce((sum: number, s: any) => sum + s.count, 0) || 1;
    
    if (completedMeetings / totalMeetings > 0.9) {
      insights.push("Excellent meeting completion rate! Your team is consistently finishing planned discussions.");
    }
  }
  
  // Q&A insights
  if (analytics.qaStats) {
    const { averageConfidence, total } = analytics.qaStats;
    
    if (averageConfidence < 0.7) {
      insights.push("Q&A confidence scores suggest room for improvement in answer quality or documentation coverage.");
    }
    
    if (total > 100) {
      insights.push("High Q&A activity indicates strong knowledge sharing culture within your team.");
    }
    
    if (averageConfidence > 0.85) {
      insights.push("Outstanding Q&A quality! Your knowledge base is providing highly accurate answers.");
    }
  }
  
  // User activity insights
  if (analytics.userActivity) {
    const { topContributors, activeUsers } = analytics.userActivity;
    
    if (topContributors?.length > 0) {
      const topContributor = topContributors[0];
      if (topContributor.contributions > 50) {
        insights.push(`${topContributor.name} is a key contributor with ${topContributor.contributions} contributions. Consider recognizing their efforts.`);
      }
    }
    
    const recentActivity = activeUsers?.slice(-7) || [];
    const avgRecentActivity = recentActivity.reduce((sum: number, day: any) => sum + day.count, 0) / Math.max(recentActivity.length, 1);
    
    if (avgRecentActivity > 10) {
      insights.push("Team activity levels are strong with consistent daily engagement across all features.");
    }
  }
  
  // File and repository insights
  if (analytics.fileStats) {
    const { byLanguage, totalSizeGB } = analytics.fileStats;
    
    if (totalSizeGB > 10) {
      insights.push("Consider implementing file archiving or cleanup policies to manage growing storage requirements.");
    }
    
    const topLanguage = byLanguage?.[0];
    if (topLanguage && topLanguage.count > 100) {
      insights.push(`${topLanguage.language} is your primary development language with strong file coverage.`);
    }
  }
  
  // Growth insights based on time range
  if (timeRange === '7d') {
    insights.push("Week-over-week trends show consistent team productivity and engagement patterns.");
  } else if (timeRange === '30d') {
    insights.push("Monthly analytics reveal stable long-term growth in team collaboration and output.");
  } else if (timeRange === '90d') {
    insights.push("Quarterly data shows strong foundation for sustained team productivity and knowledge sharing.");
  }
  
  // General productivity insights
  if (analytics.overview) {
    const { totalUsers, totalRepositories, totalMeetings, totalQuestions } = analytics.overview;
    
    const meetingsPerUser = totalMeetings / Math.max(totalUsers, 1);
    const questionsPerUser = totalQuestions / Math.max(totalUsers, 1);
    
    if (meetingsPerUser > 5) {
      insights.push("High meeting frequency per user suggests strong collaboration but consider efficiency optimization.");
    }
    
    if (questionsPerUser > 10) {
      insights.push("Active Q&A usage demonstrates a culture of continuous learning and knowledge sharing.");
    }
    
    if (totalRepositories > 20) {
      insights.push("Large repository count indicates diverse project portfolio. Consider consolidation for better management.");
    }
  }
  
  // Ensure we have some insights
  if (insights.length === 0) {
    insights.push("Your team is building strong foundations for collaborative development and knowledge sharing.");
    insights.push("Continue maintaining consistent meeting practices and documentation standards.");
    insights.push("Regular analytics review helps identify optimization opportunities for better team productivity.");
  }
  
  // Limit to 5 most relevant insights
  return insights.slice(0, 5);
}
