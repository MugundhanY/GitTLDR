'use client';

import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

interface NotificationsCardProps {
  unreadCount?: number; // Make it optional since we'll fetch it ourselves
}

export default function NotificationsCard({ unreadCount: propUnreadCount }: NotificationsCardProps) {
  // Fetch notifications directly like the dropdown does
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        return {
          notifications: data.notifications || [],
          unreadCount: data.notifications?.filter((n: any) => !n.isRead).length || 0
        };
      } catch (error) {
        return { notifications: [], unreadCount: 0 };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Use fetched count or fallback to prop count
  const unreadCount = notificationsData?.unreadCount ?? propUnreadCount ?? 0;

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-400/20 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl shadow-lg relative">
              <BellIcon className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse border-2 border-white dark:border-slate-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alerts</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">System updates</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 flex-1 flex flex-col justify-center items-center">
          <div className="text-4xl font-black text-slate-900 dark:text-white">{unreadCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending notifications</div>
        </div>
      </div>
    </>
  );
}
