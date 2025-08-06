'use client';

import React from 'react';
import Image from 'next/image';
import { ShareIcon } from '@heroicons/react/24/outline';
import { SharedRepository } from '@/types/dashboard';

interface SharedRepositoriesCardProps {
  sharedRepositories: SharedRepository[];
}

export default function SharedRepositoriesCard({ sharedRepositories }: SharedRepositoriesCardProps) {
  // Only show shared repos with at least 1 file (non-empty)
  const filteredShared = (sharedRepositories || []).filter(repo => (repo.stats?.files ?? 0) > 0);

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-orange-500/5"></div>
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-rose-400/20 to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-6 h-full">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl shadow-lg">
              <ShareIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shared</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">With you</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {filteredShared.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">
              No shared repositories with commits yet
            </div>
          ) : (
            filteredShared.slice(0, 4).map((repo) => (
              <div key={repo.id} className="p-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-slate-600/30 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <Image
                    src={repo.owner?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(repo.owner?.name || 'Owner')}&size=32&background=6366f1&color=fff`}
                    alt={repo.owner?.name || 'Owner'}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-white/50 dark:border-slate-600/50"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{repo.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">by {repo.owner?.name || 'Owner'}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">
                        {(repo.stats?.files ?? 0)} files
                      </span>
                      <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">
                        {(repo.stats?.meetings ?? 0)} meetings
                      </span>
                      <span className="bg-slate-100/60 dark:bg-slate-600/60 px-2 py-1 rounded-full">
                        {(repo.stats?.questions ?? 0)} Q&As
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
