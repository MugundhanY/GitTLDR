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

  // Fetch notifications from backend API on mount, only if session cookie exists
  useEffect(() => {
    function hasSessionCookie() {
      if (typeof document === 'undefined') return false;
      return document.cookie.split(';').some(cookie => cookie.trim().startsWith('gittldr_session='));
    }
    if (!hasSessionCookie()) {
      setNotifications([]);
      return;
    }
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
        setNotifications([]);
      }
    }
    fetchNotifications();
  }, []);

  // Count unread notifications
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
