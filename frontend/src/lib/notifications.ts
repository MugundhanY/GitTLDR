import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

/**
 * Centralized notification trigger function
 * Use this to create notifications across the application
 */
export async function triggerNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        metadata: data.metadata || {},
        read: false
      }
    });

    console.log(`Notification created for user ${data.userId}: ${data.title}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  // Repository sharing notifications
  REPOSITORY_SHARED: (repositoryName: string, sharedByName: string, repositoryId: string) => ({
    type: NotificationType.MEETING_SHARED, // Using closest available type
    title: 'Repository Shared With You',
    message: `${sharedByName} has shared the repository "${repositoryName}" with you`,
    actionUrl: `/repositories/${repositoryId}`,
    actionText: 'View Repository'
  }),

  ACCESS_REQUEST_RECEIVED: (requesterName: string, repositoryName: string, repositoryId: string, requesterId: string) => ({
    type: NotificationType.ACCESS_REQUEST_RECEIVED,
    title: 'New Repository Access Request',
    message: `${requesterName} has requested access to your repository "${repositoryName}"`,
    actionUrl: `/repositories/${repositoryId}/access-requests`,
    actionText: 'Review Request',
    metadata: {
      repositoryId: repositoryId,
      requesterId: requesterId,
      requesterName: requesterName
    }
  }),

  ACCESS_REQUEST_APPROVED: (repositoryName: string, repositoryId: string, reviewerName: string) => ({
    type: NotificationType.ACCESS_REQUEST_APPROVED,
    title: 'Repository Access Approved',
    message: `Your access request for "${repositoryName}" has been approved by ${reviewerName}`,
    actionUrl: `/repositories/${repositoryId}`,
    actionText: 'View Repository',
    metadata: {
      repositoryId: repositoryId,
      repositoryName: repositoryName,
      reviewerName: reviewerName
    }
  }),

  ACCESS_REQUEST_DENIED: (repositoryName: string, reviewerName: string) => ({
    type: NotificationType.ACCESS_REQUEST_DENIED,
    title: 'Repository Access Denied',
    message: `Your access request for "${repositoryName}" has been denied by ${reviewerName}`,
    metadata: {
      repositoryName: repositoryName,
      reviewerName: reviewerName
    }
  }),

  // Meeting notifications
  MEETING_PROCESSING_COMPLETE: (meetingTitle: string, meetingId: string, repositoryName?: string) => ({
    type: NotificationType.MEETING_PROCESSED,
    title: 'Meeting Processing Complete',
    message: `Your meeting "${meetingTitle}" has been processed and is ready to view${repositoryName ? ` in ${repositoryName}` : ''}`,
    actionUrl: `/meetings/${meetingId}`,
    actionText: 'View Meeting',
    metadata: {
      meetingId: meetingId,
      meetingTitle: meetingTitle
    }
  }),

  MEETING_SHARED: (meetingTitle: string, sharedByName: string, meetingId: string) => ({
    type: NotificationType.MEETING_SHARED,
    title: 'Meeting Shared With You',
    message: `${sharedByName} has shared the meeting "${meetingTitle}" with you`,
    actionUrl: `/meetings/${meetingId}`,
    actionText: 'View Meeting'
  }),

  // Question/Answer notifications
  QUESTION_ANSWERED: (questionText: string, repositoryName: string, questionId: string) => ({
    type: NotificationType.COMMENT_ADDED, // Using closest available type
    title: 'Your Question Has Been Answered',
    message: `Your question "${questionText.substring(0, 50)}..." in ${repositoryName} has been answered`,
    actionUrl: `/qna/${questionId}`,
    actionText: 'View Answer'
  }),

  // File processing notifications
  FILE_PROCESSING_COMPLETE: (fileName: string, repositoryName: string, repositoryId: string) => ({
    type: NotificationType.REPO_PROCESSED,
    title: 'File Processing Complete',
    message: `File "${fileName}" in repository "${repositoryName}" has been processed and indexed`,
    actionUrl: `/repositories/${repositoryId}/files`,
    actionText: 'View Files'
  }),

  // Repository creation
  REPOSITORY_CREATED: (repositoryName: string, repositoryId: string) => ({
    type: NotificationType.REPO_CREATED,
    title: 'Repository Created',
    message: `Repository "${repositoryName}" has been created and is being processed`,
    actionUrl: `/repositories/${repositoryId}`,
    actionText: 'View Repository'
  }),

  // Credits notifications
  CREDIT_LOW: (creditsRemaining: number) => ({
    type: NotificationType.CREDITS_LOW,
    title: 'Credits Running Low',
    message: `You have ${creditsRemaining} credits remaining. Consider purchasing more to continue using GitTLDR.`,
    actionUrl: '/billing',
    actionText: 'Purchase Credits'
  }),

  CREDIT_DEPLETED: () => ({
    type: NotificationType.CREDITS_DEPLETED,
    title: 'Credits Depleted',
    message: 'You have run out of credits. Purchase more to continue using GitTLDR.',
    actionUrl: '/billing',
    actionText: 'Purchase Credits'
  }),

  // Action item notifications
  ACTION_ITEM_ASSIGNED: (actionItemTitle: string, meetingTitle: string, meetingId: string) => ({
    type: NotificationType.ACTION_ITEM_ASSIGNED,
    title: 'Action Item Assigned',
    message: `You have been assigned an action item "${actionItemTitle}" from meeting "${meetingTitle}"`,
    actionUrl: `/meetings/${meetingId}`,
    actionText: 'View Meeting'
  }),

  ACTION_ITEM_COMPLETED: (actionItemTitle: string, completedByName: string, meetingId: string) => ({
    type: NotificationType.ACTION_ITEM_COMPLETED,
    title: 'Action Item Completed',
    message: `Action item "${actionItemTitle}" has been completed by ${completedByName}`,
    actionUrl: `/meetings/${meetingId}`,
    actionText: 'View Meeting'
  })
};
