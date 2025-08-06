'use client';

import React from 'react';
import { CodeBracketIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { DashboardStats, Repository, SharedRepository } from '@/types/dashboard';

interface CommitsCardProps {
  stats: DashboardStats;
  repositories: Repository[];
  sharedRepositories: SharedRepository[];
}

export default function CommitsCard({ stats, repositories, sharedRepositories }: CommitsCardProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative p-6 h-full">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
              <CodeBracketIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Commits</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total activity</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalCommits.toLocaleString()}</div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Across all repositories</span>
          </div>
          <div className="space-y-3">
            {/* Most Active Repository - improved UI, show owner if shared */}
            {repositories && repositories.length > 0 ? (
              (() => {
                const mostActiveRepo = repositories.reduce((max, repo) => (repo.commitCount > (max.commitCount ?? 0) ? repo : max), repositories[0]);
                // Try to find if this repo is in sharedRepositories
                let ownerName = '';
                if (sharedRepositories && sharedRepositories.length > 0) {
                  const sharedRepo = sharedRepositories.find(r => r.name?.toLowerCase() === mostActiveRepo.name?.toLowerCase());
                  if (sharedRepo && sharedRepo.owner && sharedRepo.owner.name) {
                    ownerName = sharedRepo.owner.name;
                  }
                }
                return (
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Most active repo:</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold text-xs shadow-sm">
                      {mostActiveRepo.name}
                      {ownerName && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-normal">by {ownerName}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <CodeBracketIcon className="w-3 h-3" />
                      {mostActiveRepo.commitCount ?? 0} commits
                    </span>
                  </div>
                );
              })()
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 py-1">No repositories yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
