import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate timeline data
function generateTimeline(meetings: any[], daysAgo: number, startDate: Date) {
  const timeline = [];
  for (let i = 0; i < daysAgo; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dayMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.created_at);
      return meetingDate.toDateString() === date.toDateString();
    });
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      count: dayMeetings.length,
      duration: dayMeetings.reduce((sum, m) => sum + (m.meeting_length || 0), 0)
    });
  }
  return timeline;
}

// Helper function to generate Q&A timeline
function generateQATimeline(questions: any[], daysAgo: number, startDate: Date) {
  const timeline = [];
  for (let i = 0; i < daysAgo; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dayQuestions = questions.filter(q => {
      const questionDate = new Date(q.createdAt);
      return questionDate.toDateString() === date.toDateString();
    });
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      questions: dayQuestions.length,
      avgConfidence: dayQuestions.length > 0 ? 
        dayQuestions.reduce((sum, q) => sum + (q.confidenceScore || 0.5), 0) / dayQuestions.length : 0
    });
  }
  return timeline;
}

// Helper function to calculate growth rate
function calculateGrowthRate(meetings: any[], daysAgo: number): number {
  if (meetings.length === 0) return 0;
  
  const midPoint = new Date(Date.now() - ((daysAgo / 2) * 24 * 60 * 60 * 1000));
  const firstHalf = meetings.filter(m => new Date(m.created_at) < midPoint).length;
  const secondHalf = meetings.filter(m => new Date(m.created_at) >= midPoint).length;
  
  if (firstHalf === 0) return 100;
  return ((secondHalf - firstHalf) / firstHalf) * 100;
}

// Helper function to generate user activity timeline
function generateUserActivityTimeline(meetings: any[], questions: any[], daysAgo: number, startDate: Date, totalUsers: number) {
  const timeline = [];
  for (let i = 0; i < daysAgo; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const dayMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.created_at);
      return meetingDate.toDateString() === date.toDateString();
    });
    const dayQuestions = questions.filter(q => {
      const questionDate = new Date(q.createdAt);
      return questionDate.toDateString() === date.toDateString();
    });
    
    // Estimate active users based on activity
    const estimatedActiveUsers = Math.min(
      totalUsers, 
      Math.max(1, dayMeetings.length + dayQuestions.length)
    );
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      count: estimatedActiveUsers
    });
  }
  return timeline;
}

// Helper function to get top contributors
async function getTopContributors(startDate: Date) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    const userContributions = await Promise.all(
      users.map(async (user) => {
        const [repoCount, meetingCount, questionCount] = await Promise.all([
          prisma.repository.count({ where: { userId: user.id } }),
          prisma.meeting.count({ 
            where: { 
              userId: user.id,
              created_at: { gte: startDate }
            }
          }),
          prisma.question.count({ 
            where: { 
              userId: user.id,
              createdAt: { gte: startDate }
            }
          })
        ]);

        return {
          name: user.name || user.email,
          contributions: repoCount + meetingCount + questionCount,
          type: 'developer'
        };
      })
    );

    return userContributions
      .filter(user => user.contributions > 0)
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting top contributors:', error);
    return [];
  }
}

// Helper function to generate basic insights
function generateBasicInsights(data: any): string[] {
  const insights = [];
  
  if (data.overview.totalMeetings > 0) {
    insights.push(`You've conducted ${data.overview.totalMeetings} meetings with an average duration of ${Math.round(data.meetingStats.averageDuration)} minutes.`);
  }
  
  if (data.overview.totalQuestions > 0) {
    insights.push(`${data.overview.totalQuestions} questions have been asked with an average confidence score of ${(data.qaStats.averageConfidence * 100).toFixed(1)}%.`);
  }
  
  if (data.fileStats.byLanguage.length > 0) {
    const topLanguage = data.fileStats.byLanguage[0];
    insights.push(`${topLanguage.language} is your most used programming language with ${topLanguage.count} files.`);
  }
  
  if (data.overview.growthRate > 0) {
    insights.push(`Your team's productivity has grown by ${data.overview.growthRate.toFixed(1)}% in the selected period.`);
  }

  return insights;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const repositoryId = searchParams.get('repositoryId');
    
    // If no repository ID provided, return error
    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }
    
    // Calculate date range
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Get repository-specific statistics
    const [
      repository,
      totalUsers,
      totalRepositories,
      totalMeetings,
      totalQuestions,
      totalActionItems,
      totalFiles
    ] = await Promise.all([
      prisma.repository.findUnique({ where: { id: repositoryId } }),
      prisma.user.count(),
      prisma.repository.count(),
      prisma.meeting.count({
        where: { 
          created_at: { gte: startDate },
          user: { repositories: { some: { id: repositoryId } } }
        }
      }),
      prisma.question.count({
        where: { 
          createdAt: { gte: startDate },
          repositoryId: repositoryId
        }
      }),
      prisma.meetingActionItem.count({
        where: { 
          createdAt: { gte: startDate },
          meeting: { user: { repositories: { some: { id: repositoryId } } } }
        }
      }),
      prisma.repositoryFile.count({
        where: { repositoryId: repositoryId }
      })
    ]);

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Get repository-specific meeting statistics
    const meetings = await prisma.meeting.findMany({
      where: { 
        created_at: { gte: startDate },
        user: { repositories: { some: { id: repositoryId } } }
      },
      select: {
        id: true,
        title: true,
        status: true,
        meeting_length: true,
        created_at: true,
        participants: true,
        actionItems: { 
          select: { 
            id: true, 
            completed: true, 
            priority: true 
          } 
        }
      }
    });

    // Calculate meeting metrics
    const meetingStats = {
      totalDuration: meetings.reduce((sum, m) => sum + (m.meeting_length || 0), 0),
      averageDuration: meetings.length > 0 ? 
        meetings.reduce((sum, m) => sum + (m.meeting_length || 0), 0) / meetings.length : 0,
      completionRate: meetings.length > 0 ? 
        (meetings.filter(m => m.status === 'COMPLETED').length / meetings.length) * 100 : 0,
      statusBreakdown: [
        { 
          status: 'COMPLETED', 
          count: meetings.filter(m => m.status === 'COMPLETED').length,
          percentage: meetings.length > 0 ? (meetings.filter(m => m.status === 'COMPLETED').length / meetings.length) * 100 : 0
        },
        {
          status: 'PROCESSING',
          count: meetings.filter(m => m.status === 'PROCESSING').length,
          percentage: meetings.length > 0 ? (meetings.filter(m => m.status === 'PROCESSING').length / meetings.length) * 100 : 0
        },
        {
          status: 'FAILED',
          count: meetings.filter(m => m.status === 'FAILED').length,
          percentage: meetings.length > 0 ? (meetings.filter(m => m.status === 'FAILED').length / meetings.length) * 100 : 0
        }
      ],
      timeline: generateTimeline(meetings, daysAgo, startDate)
    };

    // Get repository and file statistics
    const repositories = await prisma.repository.findMany({
      where: { id: repositoryId },
      select: {
        id: true,
        name: true,
        language: true,
        totalSize: true,
        fileCount: true,
        createdAt: true,
        files: {
          select: {
            type: true,
            size: true,
            language: true
          }
        }
      }
    });

    // Calculate file statistics
    const allFiles = repositories.flatMap(repo => repo.files);
    const languageStats: Record<string, number> = {};
    const languageSizes: Record<string, number> = {};
    const typeStats: Record<string, number> = {};
    const typeSizes: Record<string, number> = {};

    allFiles.forEach(file => {
      const lang = file.language || 'Unknown';
      const type = file.type || 'unknown';
      
      languageStats[lang] = (languageStats[lang] || 0) + 1;
      languageSizes[lang] = (languageSizes[lang] || 0) + (file.size || 0);
      
      typeStats[type] = (typeStats[type] || 0) + 1;
      typeSizes[type] = (typeSizes[type] || 0) + (file.size || 0);
    });

    // Get Q&A statistics
    const questions = await prisma.question.findMany({
      where: { 
        createdAt: { gte: startDate },
        repositoryId: repositoryId
      },
      select: {
        id: true,
        confidenceScore: true,
        category: true,
        createdAt: true,
        tags: true
      }
    });

    // Generate Q&A category statistics
    const categoryStats = questions.reduce((acc, question) => {
      const category = question.category || 'General';
      const existing = acc.find(c => c.category === category);
      if (existing) {
        existing.count++;
        existing.totalConfidence += (question.confidenceScore || 0.5);
      } else {
        acc.push({
          category,
          count: 1,
          totalConfidence: question.confidenceScore || 0.5,
          avgConfidence: question.confidenceScore || 0.5,
          percentage: 0 // Will be calculated after
        });
      }
      return acc;
    }, [] as Array<{ category: string; count: number; totalConfidence: number; avgConfidence: number; percentage: number }>);

    // Calculate percentages and average confidence
    const totalQuestionCount = questions.length;
    categoryStats.forEach(cat => {
      cat.avgConfidence = cat.totalConfidence / cat.count;
      cat.percentage = totalQuestionCount > 0 ? (cat.count / totalQuestionCount) * 100 : 0;
    });

    // Get top contributors
    const topContributors = await getTopContributors(startDate);

    const analyticsData = {
      overview: {
        totalUsers,
        totalRepositories,
        totalMeetings,
        totalQuestions,
        totalActionItems,
        totalFiles,
        totalStorageGB: repositories.reduce((sum, repo) => sum + (repo.totalSize || 0), 0) / (1024 * 1024 * 1024),
        growthRate: calculateGrowthRate(meetings, daysAgo),
        activeUsers: Math.min(totalUsers, Math.ceil(totalUsers * 0.7))
      },
      meetingStats,
      fileStats: {
        byLanguage: Object.entries(languageStats).map(([language, count]) => ({
          language,
          count,
          sizeGB: Math.round((languageSizes[language] || 0) / (1024 * 1024 * 1024) * 100) / 100
        })).sort((a, b) => b.count - a.count).slice(0, 10),
        byType: Object.entries(typeStats).map(([type, count]) => ({
          type,
          count,
          sizeGB: Math.round((typeSizes[type] || 0) / (1024 * 1024 * 1024) * 100) / 100
        })).sort((a, b) => b.count - a.count),
        totalSizeGB: Math.round(allFiles.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024 * 1024) * 100) / 100
      },
      qaStats: {
        total: totalQuestions,
        averageConfidence: questions.length > 0 ? 
          questions.reduce((sum, q) => sum + (q.confidenceScore || 0.5), 0) / questions.length : 0,
        categories: categoryStats,
        timeline: generateQATimeline(questions, daysAgo, startDate)
      },
      userActivity: {
        topContributors,
        activeUsers: generateUserActivityTimeline(meetings, questions, daysAgo, startDate, totalUsers)
      },
      insights: [] as string[]
    };

    // Try to call Python worker for AI insights
    try {
      const insightsResponse = await fetch('http://localhost:8001/api/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analytics: analyticsData,
          timeRange: timeRange
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (insightsResponse.ok) {
        const aiInsights = await insightsResponse.json();
        analyticsData.insights = Array.isArray(aiInsights.insights) ? aiInsights.insights : [];
      } else {
        analyticsData.insights = generateBasicInsights(analyticsData);
      }
    } catch (insightError) {
      console.error('Failed to get AI insights:', insightError);
      analyticsData.insights = generateBasicInsights(analyticsData);
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    // Return fallback data with basic insights
    const fallbackData = {
      overview: {
        totalUsers: 1,
        totalRepositories: 1,
        totalMeetings: 0,
        totalQuestions: 0,
        totalActionItems: 0,
        totalFiles: 0,
        totalStorageGB: 0,
        growthRate: 0,
        activeUsers: 1
      },
      meetingStats: {
        totalDuration: 0,
        averageDuration: 0,
        completionRate: 0,
        statusBreakdown: [],
        timeline: []
      },
      fileStats: {
        byLanguage: [],
        byType: [],
        totalSizeGB: 0
      },
      qaStats: {
        total: 0,
        averageConfidence: 0,
        categories: [],
        timeline: []
      },
      userActivity: {
        topContributors: [],
        activeUsers: []
      },
      insights: [
        "Welcome to your analytics dashboard!",
        "Start by adding repositories to see code statistics.",
        "Conduct meetings to track your team's productivity.",
        "Ask questions to build your knowledge base."
      ]
    };

    return NextResponse.json(fallbackData);
  }
}
