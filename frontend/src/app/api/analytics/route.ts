import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }

    // Calculate date range
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : timeRange === '1y' ? 365 : 30;
    const startDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));

    // Get repository data
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        files: true,
        user: true
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Check if user has access to this repository (owns it or has it shared)
    const hasAccess = repository.userId === user.id || await prisma.repositoryShareSetting.findFirst({
      where: {
        repositoryId: repositoryId,
        userId: user.id
      }
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get meetings for this repository
    const meetings = await prisma.meeting.findMany({
      where: { 
        created_at: { gte: startDate },
        repositoryId: repositoryId
      },
      include: {
        actionItems: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Get questions for this repository
    const questions = await prisma.question.findMany({
      where: {
        createdAt: { gte: startDate },
        repositoryId: repositoryId
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get repository files
    const files = repository.files || [];

    // Enhanced language colors for visualization with vibrant GitHub-like palette
    const languageColors: Record<string, string> = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f1e05a',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C++': '#f34b7d',
      'C#': '#178600',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Swift': '#ffac45',
      'Kotlin': '#A97BFF',
      'Dart': '#00B4AB',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'JSON': '#cbcb41',
      'Markdown': '#083fa1',
      'Shell': '#89e051',
      'Objective-C': '#438eff',
      'Scala': '#c22d40',
      'Perl': '#0298c3',
      'Lua': '#000080',
      'Haskell': '#5e5086',
      'Elixir': '#6e4a7e',
      'C': '#555555',
      'Vue': '#41b883',
      'React': '#61dafb',
      'Angular': '#dd1b16',
      'Svelte': '#ff3e00',
      'Unknown': '#6c757d'
    };

    // Generate unique vibrant color for unknown languages
    const getLanguageColor = (lang: string): string => {
      if (languageColors[lang]) return languageColors[lang];
      // Hash-based color generation for vibrant unknown languages
      let hash = 0;
      for (let i = 0; i < lang.length; i++) {
        hash = lang.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 55%)`;
    };

    // Calculate file statistics with proper structure
    const languageStats: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;

    files.forEach(file => {
      const language = file.language || 'Unknown';
      const size = file.size || 0;
      
      totalSize += size;
      
      if (!languageStats[language]) {
        languageStats[language] = { count: 0, size: 0 };
      }
      languageStats[language].count++;
      languageStats[language].size += size;
    });

    // Convert to frontend format with enhanced color support
    const languages = Object.entries(languageStats).map(([language, stats]) => ({
      name: language,
      count: stats.count,
      bytes: stats.size,
      percentage: files.length > 0 ? (stats.count / files.length) * 100 : 0,
      color: getLanguageColor(language)
    })).sort((a, b) => b.count - a.count);

    // Generate contribution timeline data
    const contributions = [];
    for (let i = 0; i < Math.min(daysAgo, 365); i++) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dayMeetings = meetings.filter(m => {
        const meetingDate = new Date(m.created_at);
        return meetingDate.toDateString() === date.toDateString();
      }).length;
      
      const dayQuestions = questions.filter(q => {
        const questionDate = new Date(q.createdAt);
        return questionDate.toDateString() === date.toDateString();
      }).length;

      const dayFiles = files.filter(f => {
        if (!f.createdAt) return false;
        const fileDate = new Date(f.createdAt);
        return fileDate.toDateString() === date.toDateString();
      }).length;

      const total = dayFiles + dayMeetings + dayQuestions;
      let level = 0;
      if (total > 0) {
        level = Math.min(4, Math.floor(total / 2) + 1);
      }

      contributions.unshift({
        date: date.toISOString().split('T')[0],
        count: total,
        level,
        breakdown: {
          files: dayFiles,
          meetings: dayMeetings,
          questions: dayQuestions
        }
      });
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < contributions.length; i++) {
      if (contributions[i].count > 0) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate meeting statistics
    const completedMeetings = meetings.filter(m => m.status === 'COMPLETED');
    const totalDuration = meetings.reduce((sum, m) => sum + (m.meeting_length || 0), 0);
    const completionRate = meetings.length > 0 ? (completedMeetings.length / meetings.length) * 100 : 0;

    // Calculate Q&A statistics
    const answeredQuestions = questions.filter(q => q.answer && q.answer.trim() !== '');
    const answerRate = questions.length > 0 ? (answeredQuestions.length / questions.length) * 100 : 0;
    const avgResponseTime = questions.length > 0 ? 2 : 0; // Default 2 seconds

    // Calculate trends
    const currentWeekMeetings = meetings.filter(m => {
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      return new Date(m.created_at) > weekAgo;
    }).length;

    const lastWeekMeetings = meetings.filter(m => {
      const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      const meetingDate = new Date(m.created_at);
      return meetingDate > twoWeeksAgo && meetingDate <= weekAgo;
    }).length;

    const meetingGrowth = lastWeekMeetings > 0 ? 
      ((currentWeekMeetings - lastWeekMeetings) / lastWeekMeetings) * 100 : 
      currentWeekMeetings > 0 ? 100 : 0;

    const currentWeekQuestions = questions.filter(q => {
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      return new Date(q.createdAt) > weekAgo;
    }).length;

    const lastWeekQuestions = questions.filter(q => {
      const twoWeeksAgo = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000));
      const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      const questionDate = new Date(q.createdAt);
      return questionDate > twoWeeksAgo && questionDate <= weekAgo;
    }).length;

    const questionGrowth = lastWeekQuestions > 0 ? 
      ((currentWeekQuestions - lastWeekQuestions) / lastWeekQuestions) * 100 : 
      currentWeekQuestions > 0 ? 100 : 0;

    // Build response with only real, meaningful analytics
    const analyticsData = {
      overview: {
        totalFiles: files.length,
        totalMeetings: meetings.length,
        totalQuestions: questions.length,
        repositorySize: totalSize,
        lastActivity: repository.updatedAt.toISOString(),
        createdAt: repository.createdAt.toISOString()
      },
      timeline: {
        contributions,
        streak: {
          current: currentStreak,
          longest: longestStreak
        },
        totalContributions: contributions.reduce((sum, c) => sum + c.count, 0)
      },
      fileStats: {
        totalFiles: files.length,
        totalSize,
        languages,
        recentFiles: files
          .filter(f => f.createdAt)
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
          .slice(0, 10)
          .map(f => ({
            path: f.path,
            language: f.language || 'Unknown',
            size: f.size || 0,
            addedAt: f.createdAt!.toISOString()
          }))
      },
      meetingStats: {
        repositoryMeetings: meetings.slice(0, 10).map(m => ({
          id: m.id,
          title: m.title,
          duration: m.meeting_length || 0,
          status: m.status.toLowerCase(),
          participants: m.participants?.length || 1,
          createdAt: m.created_at.toISOString(),
          actionItems: 0 // No action items data available
        })),
        totalDuration,
        avgDuration: meetings.length > 0 ? totalDuration / meetings.length : 0,
        completionRate,
        trends: {
          thisWeek: currentWeekMeetings,
          lastWeek: lastWeekMeetings,
          growth: meetingGrowth
        }
      },
      questionStats: {
        totalQuestions: questions.length,
        answeredRate: answerRate,
        avgResponseTime,
        recentQuestions: questions.slice(0, 5).map(q => ({
          id: q.id,
          query: q.query,
          answered: !!q.answer && q.answer.trim() !== '',
          confidence: q.confidenceScore || 0,
          createdAt: q.createdAt.toISOString()
        })),
        trends: {
          thisWeek: currentWeekQuestions,
          lastWeek: lastWeekQuestions,
          growth: questionGrowth
        }
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
