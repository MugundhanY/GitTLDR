'use client';

import React from 'react';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';
import { Repository } from '@/types/dashboard';

interface PerformanceCardProps {
  repositories: Repository[];
}

export default function PerformanceCard({ repositories }: PerformanceCardProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-6 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
              <RocketLaunchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Repository Performance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Health & activity insights</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Top performers */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top Performing Repositories</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
              {repositories
                .sort((a, b) => (b.commitCount || 0) - (a.commitCount || 0))
                .slice(0, 5)
                .map((repo, index) => (
                  <div key={repo.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg border border-white/30 dark:border-slate-600/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-amber-600' : 'bg-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{repo.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{repo.language || 'Mixed'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{repo.commitCount || 0}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">commits</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Repository health metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round((repositories.filter(r => r.processed).length / Math.max(repositories.length, 1)) * 100)}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {repositories.filter(r => !r.isPrivate).length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Public</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {new Set(repositories.map(r => r.language).filter(Boolean)).size}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Languages</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
