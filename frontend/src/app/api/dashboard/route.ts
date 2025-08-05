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


    // Get owned repositories
    const ownedRepositories = await prisma.repository.findMany({
      where: { userId: user.id },
      include: { commits: true }
    });

    // Get shared repositories (shared with this user)
    const sharedRepoShares = await prisma.repositoryShareSetting.findMany({
      where: { userId: user.id },
      include: {
        repository: {
          include: { commits: true }
        }
      }
    });
    const sharedRepositories = sharedRepoShares.map(share => share.repository);

    // Combine owned and shared repos for stats/activities
    const allRepositories = [...ownedRepositories, ...sharedRepositories];

    const repositoryCount = allRepositories.length;
    const totalCommits = allRepositories.reduce((sum, repo) => sum + (repo.commits?.length || 0), 0);

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


    // Get recent commits for owned and shared repos
    const repoIds = allRepositories.map(r => r.id);
    const recentCommits = repoIds.length > 0 ? await prisma.commit.findMany({
      where: {
        repositoryId: { in: repoIds }
      },
      include: {
        repository: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    }) : [];



    // Meetings: include meetings for owned and shared repositories
    const recentMeetings = repoIds.length > 0 ? await prisma.meeting.findMany({
      where: {
        repositoryId: { in: repoIds }
      },
      orderBy: { created_at: 'desc' },
      take: 2
    }) : [];

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
      ...await Promise.all(recentMeetings.map(async meeting => {
        let author = 'Unknown';
        if (meeting.userId) {
          const user = await prisma.user.findUnique({ where: { id: meeting.userId }, select: { name: true } });
          if (user && user.name) author = user.name;
        }
        return {
          id: meeting.id,
          type: 'meeting',
          title: `Meeting: ${meeting.title}`,
          description: 'AI summary and action items generated',
          time: getTimeAgo(meeting.created_at || new Date()),
          status: meeting.status === 'COMPLETED' ? 'completed' : 'processing',
          repository: (allRepositories.find(r => r.id === meeting.repositoryId)?.name) || undefined,
          author
        };
      })),
      ...recentQuestions.map(question => ({
        id: question.id,
        type: 'question',
        title: 'Q&A Session',
        description: question.query.substring(0, 100) + '...',
        time: getTimeAgo(question.createdAt),
        status: 'completed'
      }))
    ];

    // Sort activities by their actual timestamps/dates in reverse chronological order
    activities.sort((a, b) => {
      const dateA = a.type === 'commit' && (a as any).timestamp ? new Date((a as any).timestamp) : 
                   a.type === 'analysis' ? new Date(recentMeetings.find(m => m.id === a.id)?.created_at || new Date()) :
                   a.type === 'question' ? new Date(recentQuestions.find(q => q.id === a.id)?.createdAt || new Date()) :
                   new Date();
      const dateB = b.type === 'commit' && (b as any).timestamp ? new Date((b as any).timestamp) : 
                   b.type === 'analysis' ? new Date(recentMeetings.find(m => m.id === b.id)?.created_at || new Date()) :
                   b.type === 'question' ? new Date(recentQuestions.find(q => q.id === b.id)?.createdAt || new Date()) :
                   new Date();
      return dateB.getTime() - dateA.getTime();
    });

    const sortedActivities = activities.slice(0, 6);

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
      activities: sortedActivities
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
