'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepository } from '@/contexts/RepositoryContext';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}
// Simple date formatter to avoid external dependency
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
  const { selectedRepository } = useRepository();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications dynamically
  const { data: notificationsData = { notifications: [], unreadCount: 0 }, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      return {
        notifications: data.notifications || [],
        unreadCount: data.notifications?.filter((n: any) => !n.isRead).length || 0
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  const { notifications, unreadCount } = notificationsData;

  // Handle notification action button clicks
  const handleNotificationAction = (notification: Notification) => {
    if (notification.actionUrl) {
      // If it's a repository-related notification, handle repository selection
      if (notification.actionUrl.includes('/repositories/')) {
        const repoId = notification.actionUrl.split('/repositories/')[1];
        if (repoId && selectedRepository?.id !== repoId) {
          // Set repository in context if available
          window.location.href = notification.actionUrl;
        } else {
          window.location.href = notification.actionUrl;
        }
      } else {
        // For other notifications, just navigate
        window.location.href = notification.actionUrl;
      }
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}&action=markAsRead`, {
        method: 'PUT'
      });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all notifications as read for current user
      const promises = notifications
        .filter((n: Notification) => !n.isRead)
        .map((n: Notification) => markAsRead(n.id));
      
      await Promise.all(promises);
      refetch();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, { 
        method: 'DELETE' 
      });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string, size = 'w-5 h-5') => {
    switch (type) {
      case 'access_request':
        return <InformationCircleIcon className={`${size} text-orange-500`} />;
      case 'access_approved':
        return <CheckCircleIcon className={`${size} text-green-500`} />;
      case 'access_denied':
        return <XCircleIcon className={`${size} text-red-500`} />;
      case 'repository_created':
      case 'repository_processed':
        return <CheckCircleIcon className={`${size} text-green-500`} />;
      case 'repository_failed':
        return <XCircleIcon className={`${size} text-red-500`} />;
      case 'meeting_uploaded':
      case 'meeting_processed':
        return <VideoCameraIcon className={`${size} text-blue-500`} />;
      case 'meeting_failed':
        return <XCircleIcon className={`${size} text-red-500`} />;
      case 'meeting_shared':
        return <VideoCameraIcon className={`${size} text-purple-500`} />;
      case 'credits_low':
      case 'credits_depleted':
        return <ExclamationTriangleIcon className={`${size} text-yellow-500`} />;
      case 'action_item_assigned':
      case 'action_item_completed':
        return <DocumentTextIcon className={`${size} text-indigo-500`} />;
      case 'comment_added':
        return <ChatBubbleLeftRightIcon className={`${size} text-blue-500`} />;
      default:
        return <InformationCircleIcon className={`${size} text-blue-500`} />;
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n: Notification) => !n.isRead)
    : notifications;

  const recentNotifications = filteredNotifications.slice(0, 10);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Delete all notifications for the user
      const promises = notifications.map((n: Notification) => 
        fetch(`/api/notifications?id=${n.id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      refetch();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'repository':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'meeting':
        return <VideoCameraIcon className="w-4 h-4" />;
      case 'qna':
        return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      default:
        return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Filter Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'all'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'unread'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Unread
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="w-3 h-3 mr-1" />
                Mark all as read
              </button>
              <button
                onClick={clearAllNotifications}
                className="flex items-center text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                Clear all
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <BellIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filter === 'unread' 
                    ? 'All caught up! You have no unread notifications.'
                    : 'When you have notifications, they\'ll show up here.'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentNotifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Unread Indicator */}
                    {!notification.isRead && (
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}

                    <div className="flex items-start space-x-3 ml-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type, 'w-5 h-5')}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                              {notification.message}
                            </p>

                            {/* Metadata */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{formatTimeAgo(new Date(notification.createdAt))}</span>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Mark as read"
                                  >
                                    <EyeIcon className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Remove"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Action Button */}
                            {notification.actionUrl && (
                              <div className="mt-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationAction(notification);
                                    setIsOpen(false);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  {notification.actionLabel || 'View'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                View all notifications ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
