'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'processing';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  metadata?: {
    repositoryId?: string;
    repositoryName?: string;
    meetingId?: string;
    processingProgress?: number;
    category?: 'repository' | 'billing' | 'system' | 'team' | 'security' | 'meeting' | 'analysis';
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getNotificationsByCategory: (category: string) => Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications from backend API on mount
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        // Map backend notification format to frontend Notification type
        const notificationsWithDates = (data.notifications || []).map((n: any) => ({
          id: n.id,
          type: n.type || 'info',
          title: n.title,
          message: n.message,
          timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
          read: n.isRead,
          action: n.actionLabel ? { label: n.actionLabel, href: n.actionUrl } : undefined,
          metadata: n.metadata || {}
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    }
    fetchNotifications();
  }, []);

  // Demo notifications for development
  useEffect(() => {
    // Only load demo notifications in development, and only if there are no real notifications in localStorage
    const savedNotifications = localStorage.getItem('gittldr_notifications');
    let hasRealNotifications = false;
    try {
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        hasRealNotifications = Array.isArray(parsed) && parsed.some((n: any) => n && n.id && !String(n.id).startsWith('demo-'));
      }
    } catch (e) {
      hasRealNotifications = false;
    }
    if (
      process.env.NODE_ENV === 'development' &&
      notifications.length === 0 &&
      !hasRealNotifications
    ) {
      const demoNotifications: Notification[] = [
        {
          id: 'demo-1',
          type: 'success',
          title: 'Repository Processing Complete',
          message: 'Your repository "awesome-project" has been successfully processed and is ready for AI analysis.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          read: false,
          action: {
            label: 'View Repository',
            href: '/dashboard'
          },
          metadata: {
            repositoryName: 'awesome-project',
            category: 'repository'
          }
        },
        {
          id: 'demo-2',
          type: 'info',
          title: 'New Team Member Joined',
          message: 'Sarah Johnson has joined your GitTLDR team and now has access to your repositories.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          read: false,
          metadata: {
            category: 'team'
          }
        },
        {
          id: 'demo-3',
          type: 'warning',
          title: 'Credit Balance Low',
          message: 'You have 150 credits remaining. Consider upgrading your plan to avoid service interruption.',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          read: true,
          action: {
            label: 'Upgrade Plan',
            href: '/billing'
          },
          metadata: {
            category: 'billing'
          }
        },
        {
          id: 'demo-4',
          type: 'processing',
          title: 'Repository Analysis in Progress',
          message: 'Analyzing your repository "ml-toolkit" - 75% complete. This may take a few more minutes.',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          read: false,
          metadata: {
            repositoryName: 'ml-toolkit',
            processingProgress: 75,
            category: 'repository'
          }
        },
        {
          id: 'demo-5',
          type: 'error',
          title: 'Repository Processing Failed',
          message: 'Failed to process repository "broken-repo" due to unsupported file types. Please check the repository structure.',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          read: false,
          action: {
            label: 'Retry Processing',
            href: '/repositories'
          },
          metadata: {
            repositoryName: 'broken-repo',
            category: 'repository'
          }
        }
      ];
      setNotifications(demoNotifications);
    }
  }, [notifications.length]);

  // Only count unread notifications that are not demo notifications
  // If there are any real notifications, only count unread real notifications. Otherwise, count all unread notifications (including demo).
  // Always only count unread notifications that are not demo notifications
  // If there are any real notifications, only count unread real notifications. Otherwise, count all unread notifications (including demo)
  // Always only count unread notifications that are not demo notifications
  // If there are any real notifications, only count unread real notifications. Otherwise, count all unread notifications (including demo)
  // Always only count unread notifications that are not demo notifications
  const hasRealNotifications = notifications.some(n => n.id && !String(n.id).startsWith('demo-'));
  const unreadCount = hasRealNotifications
    ? notifications.filter(n => !n.read && n.id && !String(n.id).startsWith('demo-')).length
    : notifications.filter(n => !n.read).length;

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationsByCategory = (category: string) => {
    return notifications.filter(n => n.metadata?.category === category);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
        getNotificationsByCategory
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
