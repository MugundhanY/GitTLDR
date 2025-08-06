'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpenIcon,
  PlusIcon,
  StarIcon,
  CodeBracketIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { Repository } from '@/types/dashboard';

interface RepositoriesCardProps {
  repositories: Repository[];
}

export default function RepositoriesCard({ repositories }: RepositoriesCardProps) {
  return (
    <>
      {/* Premium card background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-6 h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <FolderOpenIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">All Repositories</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Complete project portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/repositories/create" className="p-2 bg-blue-100/50 dark:bg-blue-950/50 backdrop-blur-sm rounded-lg hover:bg-blue-200/50 dark:hover:bg-blue-950/70 transition-colors">
              <PlusIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">{repositories.length}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total repositories</div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="space-y-3 max-h-full overflow-y-auto custom-scrollbar pr-2">
            {repositories.slice(0, 8).map((repo) => (
              <div key={repo.id} className="group/item flex items-center justify-between p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${repo.processed ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{repo.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{repo.language || 'Mixed'} • {repo.fileCount} files</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-600/50 px-2 py-1 rounded-full">
                    <StarIcon className="w-3 h-3" />
                    {repo.stars}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-600/50 px-2 py-1 rounded-full">
                    <CodeBracketIcon className="w-3 h-3" />
                    {repo.commitCount ?? 0}
                  </span>
                  {repo.isPrivate && <LockClosedIcon className="w-3 h-3 text-amber-500" />}
                </div>
              </div>
            ))}
            {repositories.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpenIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No repositories yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
