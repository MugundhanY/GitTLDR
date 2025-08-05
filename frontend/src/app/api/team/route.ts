import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Get all team members (owner + users who have shared repos with owner + users owner has shared repos with)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique users who are part of the user's extended team
    const teamMembers = new Map();

    // Get repository owners (users who have repositories shared with current user)
    const sharedWithUser = await prisma.repositoryShareSetting.findMany({
      where: {
        userId: user.id
      },
      include: {
        repository: {
          include: {
            user: {
              include: {
                repositories: {
                  include: {
                    commits: true
                  }
                }
              }
            },
            commits: true
          }
        }
      }
    });

    // Add repository owners as team members with 'Owner' role for their repos
    sharedWithUser.forEach(share => {
      const owner = share.repository.user;
      if (!teamMembers.has(owner.id)) {
        const ownerCommits = owner.repositories.reduce((sum, repo) => sum + repo.commits.length, 0);
        teamMembers.set(owner.id, {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          avatarUrl: owner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name)}&size=40&background=6366f1&color=fff`,
          role: 'Owner',
          repositories: owner.repositories.length,
          commits: ownerCommits,
          lastActivity: share.createdAt.toISOString(),
          status: Math.random() > 0.5 ? 'online' : Math.random() > 0.5 ? 'away' : 'offline'
        });
      }
    });

    // Add the current user as a collaborator (not owner unless they own repos)
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        repositories: {
          include: {
            commits: true
          }
        }
      }
    });

    if (currentUser) {
      const userCommits = currentUser.repositories.reduce((sum, repo) => sum + repo.commits.length, 0);
      const userRole = currentUser.repositories.length > 0 ? 'Owner' : 'Collaborator';
      
      if (!teamMembers.has(currentUser.id)) {
        teamMembers.set(currentUser.id, {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&size=40&background=6366f1&color=fff`,
          role: userRole,
          repositories: currentUser.repositories.length,
          commits: userCommits,
          lastActivity: new Date().toISOString(),
          status: 'online'
        });
      }
    }

    // Get users with whom the current user has shared repositories
    const userSharedRepos = await prisma.repositoryShareSetting.findMany({
      where: {
        repository: {
          userId: user.id
        }
      },
      include: {
        user: {
          include: {
            repositories: {
              include: {
                commits: true
              }
            }
          }
        }
      }
    });

    userSharedRepos.forEach(share => {
      const collaborator = share.user;
      if (!teamMembers.has(collaborator.id)) {
        const collaboratorCommits = collaborator.repositories.reduce((sum, repo) => sum + repo.commits.length, 0);
        teamMembers.set(collaborator.id, {
          id: collaborator.id,
          name: collaborator.name,
          email: collaborator.email,
          avatarUrl: collaborator.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(collaborator.name)}&size=40&background=6366f1&color=fff`,
          role: 'Collaborator',
          repositories: collaborator.repositories.length,
          commits: collaboratorCommits,
          lastActivity: share.createdAt.toISOString(),
          status: Math.random() > 0.5 ? 'online' : Math.random() > 0.5 ? 'away' : 'offline'
        });
      }
    });

    return NextResponse.json({ 
      teamMembers: Array.from(teamMembers.values())
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
