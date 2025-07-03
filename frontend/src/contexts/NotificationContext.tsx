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

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('gittldr_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Failed to parse saved notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gittldr_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Demo notifications for development
  useEffect(() => {
    if (notifications.length === 0) {
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
