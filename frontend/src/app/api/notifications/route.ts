import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    
    // Enhanced mock notifications with more variety and actions
    const mockNotifications = [
      {
        id: '1',
        type: 'success',
        title: 'Repository Processing Complete',
        message: `Your repository "${repositoryId ? 'Current Repository' : 'GitTLDR'}" has been successfully processed and is ready for Q&A analysis.`,
        timestamp: new Date().toISOString(),
        read: false,
        category: 'repository',
        actionUrl: '/qna',
        repositoryId: repositoryId || 'default',
        repositoryName: 'Current Repository',
        action: {
          label: 'Start Q&A',
          href: '/qna'
        }
      },
      {
        id: '2',
        type: 'processing',
        title: 'Meeting Upload Processing',
        message: 'Your meeting recording "Team Planning Session" is being transcribed and summarized. This may take a few minutes.',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        read: false,
        category: 'meeting',
        actionUrl: '/meetings',
        action: {
          label: 'View Progress'
        }
      },
      {
        id: '3',
        type: 'info',
        title: 'New Q&A Available',
        message: 'Your recent questions about the codebase have been answered and are ready for review.',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        read: false,
        category: 'qna',
        actionUrl: '/qna',
        action: {
          label: 'View Answers',
          href: '/qna'
        }
      },
      {
        id: '4',
        type: 'warning',
        title: 'Processing Quota Alert',
        message: 'You have used 80% of your monthly processing quota. Consider upgrading to continue unlimited processing.',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        read: false,
        category: 'system',
        actionUrl: '/billing',
        action: {
          label: 'Upgrade Plan',
          href: '/billing'
        }
      },
      {
        id: '5',
        type: 'success',
        title: 'Export Complete',
        message: 'Your meeting export "Project Review - March 2025" has been generated successfully and is ready for download.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: true,
        category: 'meeting',
        actionUrl: '/meetings'
      },
      {
        id: '6',
        type: 'info',
        title: 'Team Member Invitation',
        message: 'Sarah Wilson has been invited to join your GitTLDR workspace. They will have access to shared repositories and meetings.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
        category: 'team',
        action: {
          label: 'Manage Team',
          href: '/team'
        }
      },
      {
        id: '7',
        type: 'error',
        title: 'Deep Analysis Failed',
        message: 'The deep thinking analysis for your repository failed due to file complexity. Please try with a smaller subset of files.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: false,
        category: 'repository',
        action: {
          label: 'Retry Analysis'
        }
      },
      {
        id: '8',
        type: 'success',
        title: 'Credits Purchased',
        message: 'Successfully purchased 1000 additional processing credits. Your account has been updated.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        category: 'billing',
        action: {
          label: 'View Usage',
          href: '/billing'
        }
      },
      {
        id: '9',
        type: 'info',
        title: 'Weekly Summary Ready',
        message: 'Your weekly activity summary is ready with insights from 5 repositories and 12 meetings processed this week.',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        read: false,
        category: 'system',
        action: {
          label: 'View Summary',
          href: '/analytics'
        }
      },
      {
        id: '10',
        type: 'processing',
        title: 'Repository Sync in Progress',
        message: 'Syncing latest changes from your GitHub repository. New commits are being analyzed for Q&A updates.',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        read: false,
        category: 'repository',
        repositoryId: repositoryId,
        action: {
          label: 'View Status'
        }
      }
    ];

    // Filter notifications by repository if specified
    const filteredNotifications = repositoryId 
      ? mockNotifications.filter(n => !n.repositoryId || n.repositoryId === repositoryId)
      : mockNotifications;

    const unreadCount = filteredNotifications.filter(n => !n.read).length;

    return NextResponse.json({
      notifications: filteredNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId, notificationIds } = body;

    // Mock handling of notification actions
    if (action === 'markAsRead' && notificationId) {
      // In a real app, update the notification in the database
      return NextResponse.json({ 
        success: true, 
        message: 'Notification marked as read' 
      });
    }

    if (action === 'markAllAsRead') {
      // In a real app, update all notifications for the user
      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      });
    }

    if (action === 'markMultipleAsRead' && notificationIds) {
      // In a real app, update multiple notifications
      return NextResponse.json({ 
        success: true, 
        message: `${notificationIds.length} notifications marked as read` 
      });
    }

    if (action === 'delete' && notificationId) {
      // In a real app, delete the notification from the database
      return NextResponse.json({ 
        success: true, 
        message: 'Notification deleted' 
      });
    }

    if (action === 'deleteAll') {
      // In a real app, delete all read notifications
      return NextResponse.json({ 
        success: true, 
        message: 'All read notifications deleted' 
      });
    }

    // Handle notification creation for system events
    if (action === 'create') {
      const { type, title, message, category, actionUrl, repositoryId } = body;
      
      // In a real app, save to database
      const newNotification = {
        id: `notif-${Date.now()}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        category,
        actionUrl,
        repositoryId
      };

      return NextResponse.json({ 
        success: true, 
        notification: newNotification,
        message: 'Notification created successfully' 
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error handling notification action:', error);
    return NextResponse.json(
      { error: 'Failed to handle notification action' },
      { status: 500 }
    );
  }
}
