import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get repository count
    const repositoryCount = await prisma.repository.count({
      where: { userId: user.id }
    });

    // Get recent repositories for commit count
    const repositories = await prisma.repository.findMany({
      where: { userId: user.id },
      include: { commits: true }
    });

    const totalCommits = repositories.reduce((sum, repo) => sum + repo.commits.length, 0);

    // Get meetings count
    const meetingCount = await prisma.meeting.count({
      where: { userId: user.id }
    });

    // Get questions count
    const questionCount = await prisma.question.count({
      where: { userId: user.id }
    });

    // Get transactions for credit usage
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const creditsUsed = Math.abs(transactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + t.credits, 0));

    // Recent activities - mix of commits, meetings, questions
    const recentCommits = await prisma.commit.findMany({
      where: {
        repository: {
          userId: user.id
        }
      },
      include: {
        repository: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const recentMeetings = await prisma.meeting.findMany({
      where: { userId: user.id },
      orderBy: { created_at: 'desc' },
      take: 2
    });

    const recentQuestions = await prisma.question.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    // Format activities
    const activities = [
      ...recentCommits.map(commit => ({
        id: commit.sha,
        type: 'commit',
        title: commit.message || 'Code commit',
        description: `${commit.filesChanged || 0} files changed in ${commit.repository.name}`,
        time: getTimeAgo(commit.timestamp),
        timestamp: commit.timestamp,
        status: 'completed',
        repository: commit.repository.name,
        author: commit.authorName || 'Unknown'
      })),
      ...recentMeetings.map(meeting => ({
        id: meeting.id,
        type: 'analysis',
        title: `Meeting analysis: ${meeting.title}`,
        description: 'AI summary and action items generated',
        time: getTimeAgo(meeting.created_at || new Date()),
        status: meeting.status === 'COMPLETED' ? 'completed' : 'processing'
      })),
      ...recentQuestions.map(question => ({
        id: question.id,
        type: 'question',
        title: 'Q&A Session',
        description: question.query.substring(0, 100) + '...',
        time: getTimeAgo(question.createdAt),
        status: 'completed'
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

    const dashboardData = {
      stats: {
        repositories: repositoryCount,
        totalCommits,
        activeProjects: repositoryCount, // Assume all repos are active
        aiAnalyses: meetingCount + questionCount,
        meetings: meetingCount,
        questions: questionCount,
        creditsUsed,
        creditsRemaining: user.credits
      },
      activities
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${days} days ago`;
  }
}
