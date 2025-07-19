import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Type mapping from Prisma enum to frontend types
const mapNotificationType = (type: NotificationType) => {
  const typeMap: Record<NotificationType, string> = {
    [NotificationType.ACCESS_REQUEST_RECEIVED]: 'access_request',
    [NotificationType.ACCESS_REQUEST_APPROVED]: 'access_approved',
    [NotificationType.ACCESS_REQUEST_DENIED]: 'access_denied',
    [NotificationType.REPO_CREATED]: 'repository_created',
    [NotificationType.REPO_PROCESSED]: 'repository_processed',
    [NotificationType.REPO_FAILED]: 'repository_failed',
    [NotificationType.MEETING_UPLOADED]: 'meeting_uploaded',
    [NotificationType.MEETING_PROCESSED]: 'meeting_processed',
    [NotificationType.MEETING_FAILED]: 'meeting_failed',
    [NotificationType.MEETING_SHARED]: 'meeting_shared',
    [NotificationType.CREDITS_LOW]: 'credits_low',
    [NotificationType.CREDITS_DEPLETED]: 'credits_depleted',
    [NotificationType.ACTION_ITEM_ASSIGNED]: 'action_item_assigned',
    [NotificationType.ACTION_ITEM_COMPLETED]: 'action_item_completed',
    [NotificationType.COMMENT_ADDED]: 'comment_added'
  };
  return typeMap[type] || 'system_update';
};

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to recent 50 notifications
    });

    const mappedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: mapNotificationType(notification.type),
      title: notification.title,
      message: notification.message,
      isRead: notification.read,
      createdAt: notification.createdAt.toISOString(),
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionText,
      metadata: notification.metadata
    }));

    return NextResponse.json({ notifications: mappedNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notifications - Create a new notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      type, 
      title, 
      message, 
      actionUrl, 
      actionText, 
      metadata,
      targetUserId 
    } = body;

    // Only allow creating notifications for self or if user is admin
    const userId = targetUserId || user.id;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type.toUpperCase() as NotificationType,
        title,
        message,
        actionUrl,
        actionText,
        metadata,
        read: false
      }
    });



    return NextResponse.json({ 
      notification: {
        id: notification.id,
        type: mapNotificationType(notification.type),
        title: notification.title,
        message: notification.message,
        isRead: notification.read,
        createdAt: notification.createdAt.toISOString(),
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionText
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    if (action === 'markAsRead') {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: user.id // Ensure user owns this notification
        },
        data: {
          read: true
        }
      });

      return NextResponse.json({ 
        notification: {
          id: notification.id,
          isRead: notification.read
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: user.id // Ensure user owns this notification
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
