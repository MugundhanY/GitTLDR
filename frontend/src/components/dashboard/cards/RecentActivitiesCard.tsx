'use client';

import React from 'react';
import {
  ClockIcon,
  CodeBracketIcon,
  SparklesIcon,
  PlayIcon,
  LightBulbIcon,
  LinkIcon,
  DocumentTextIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import { RecentActivity } from '@/types/dashboard';

interface RecentActivitiesCardProps {
  activities: RecentActivity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'commit': return CodeBracketIcon;
    case 'analysis': return SparklesIcon;
    case 'meeting': return PlayIcon;
    case 'question': return LightBulbIcon;
    case 'webhook': return LinkIcon;
    default: return DocumentTextIcon;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
    case 'away': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/50';
    case 'offline': return 'text-slate-500 bg-slate-50 dark:bg-slate-950/50';
    case 'completed': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50';
    case 'processing': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/50';
    case 'failed': return 'text-red-500 bg-red-50 dark:bg-red-950/50';
    default: return 'text-slate-500 bg-slate-50 dark:bg-slate-950/50';
  }
};

export default function RecentActivitiesCard({ activities }: RecentActivitiesCardProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5"></div>
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-400/15 to-transparent rounded-full blur-3xl"></div>
      
      <div className="relative p-6 h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-lg">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activities</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Latest project updates</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="space-y-3 max-h-full overflow-y-auto custom-scrollbar pr-2">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              let repoName = activity.repository;
              let authorName = activity.author;
              
              if (activity.type === 'meeting') {
                // Try to extract repo name and author from description if missing
                if (!repoName && activity.description) {
                  const repoMatch = activity.description.match(/repo ([^\s,.]+)/i);
                  if (repoMatch) repoName = repoMatch[1];
                }
                if (!authorName && activity.description) {
                  const authorMatch = activity.description.match(/by ([^\s,.]+)/i);
                  if (authorMatch) authorName = authorMatch[1];
                }
              }
              
              return (
                <div key={activity.id} className="group/item flex items-start gap-3 p-4 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                  <div className="p-2.5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-xl border border-white/50 dark:border-slate-500/50">
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{activity.title}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)} border border-current border-opacity-20`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{activity.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span className="font-medium">{activity.time}</span>
                      {repoName && (
                        <span className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">
                          <FolderOpenIcon className="w-3 h-3" />
                          {repoName}
                        </span>
                      )}
                      {authorName && (
                        <span className="text-slate-600 dark:text-slate-400">by {authorName}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
