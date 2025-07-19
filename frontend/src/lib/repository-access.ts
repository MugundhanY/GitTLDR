import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RepositoryAccessResult {
  hasAccess: boolean;
  repository?: any;
  permission: 'OWNER' | 'MEMBER';
  isOwner: boolean;
}

/**
 * Check if user has access to a repository (either as owner or team member)
 * All team members now have full access (no VIEW/EDIT distinction)
 */
export async function checkRepositoryAccess(
  repositoryId: string, 
  userId: string
): Promise<RepositoryAccessResult> {
  try {
    // First check if user owns the repository
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: userId
      },
      include: {
        files: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    if (repository) {
      return {
        hasAccess: true,
        repository,
        permission: 'OWNER',
        isOwner: true
      };
    }

    // If not owner, check if user is a team member with access
    const shareSettings = await prisma.repositoryShareSetting.findFirst({
      where: {
        repositoryId: repositoryId,
        userId: userId
      },
      include: {
        repository: {
          include: {
            files: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    if (shareSettings) {
      return {
        hasAccess: true,
        repository: shareSettings.repository,
        permission: 'MEMBER',
        isOwner: false
      };
    }

    return {
      hasAccess: false,
      permission: 'MEMBER',
      isOwner: false
    };
  } catch (error) {
    console.error('Error checking repository access:', error);
    return {
      hasAccess: false,
      permission: 'MEMBER',
      isOwner: false
    };
  }
}

/**
 * Check if user can manage repository sharing (only owners can manage)
 */
export async function checkRepositoryManagementAccess(
  repositoryId: string, 
  userId: string
): Promise<boolean> {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: userId
      }
    });

    return !!repository;
  } catch (error) {
    console.error('Error checking repository management access:', error);
    return false;
  }
}
