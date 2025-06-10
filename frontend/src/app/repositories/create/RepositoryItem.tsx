'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  CodeBracketIcon, 
  StarIcon, 
  ArrowPathIcon, 
  ClockIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { RepositoryItemProps } from './types';

export default function RepositoryItem({ 
  repo, 
  onAddRepository, 
  checkCreditsForRepo, 
  checkedRepos, 
  isCheckingCredits,
  isAdding,
  isExisting = false,
  onOpenRepository
}: RepositoryItemProps) {
  const [localChecking, setLocalChecking] = useState(false);
  const repoKey = `${repo.owner.login}/${repo.name}`;
  const creditCheck = checkedRepos.get(repoKey);

  const handleCheckCredits = async () => {
    setLocalChecking(true);
    try {
      await checkCreditsForRepo(repo);
    } finally {
      setLocalChecking(false);
    }
  };

  const handleAdd = () => {
    if (creditCheck) {
      onAddRepository(repo, creditCheck.creditsNeeded);
    } else {
      onAddRepository(repo);
    }
  };

  const formatUpdatedAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="group relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/30 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-800/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/20 to-transparent dark:via-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className={`relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border transition-all duration-300 shadow-sm hover:shadow-lg group-hover:transform group-hover:scale-[1.02] ${
        isExisting 
          ? 'border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/20 dark:to-transparent'
          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
      }`}>
        {/* Existing repository badge */}
        {isExisting && (
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircleIcon className="w-3 h-3" />
            <span>Added</span>
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start space-x-4">
            {/* Enhanced Avatar */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity animate-pulse"></div>
              {repo.owner?.avatar_url ? (
                <Image 
                  src={repo.owner.avatar_url} 
                  alt={`${repo.owner.login}'s avatar`}
                  width={64}
                  height={64}
                  className="relative w-16 h-16 rounded-xl object-cover border-2 border-white/50 dark:border-slate-700/50 shadow-sm group-hover:shadow-md transition-shadow"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="relative w-16 h-16 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl flex items-center justify-center border-2 border-white/50 dark:border-slate-600/50 shadow-sm"
                style={{ display: repo.owner?.avatar_url ? 'none' : 'flex' }}
              >
                <CodeBracketIcon className="h-8 w-8 text-slate-600 dark:text-slate-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Enhanced Repository Header */}
              <div className="flex items-center space-x-3 mb-3">
                <a 
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center space-x-2 text-lg font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                >
                  <span className="group-hover/link:scale-105 transition-transform truncate">{repo.name}</span>
                  <div className="opacity-0 group-hover/link:opacity-100 transition-opacity">
                    <GlobeAltIcon className="h-4 w-4 flex-shrink-0" />
                  </div>
                </a>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border transition-all duration-300 flex-shrink-0 ${
                  repo.private 
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300 dark:bg-gradient-to-r dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-300 dark:border-amber-600'
                    : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-300 dark:bg-gradient-to-r dark:from-emerald-900/40 dark:to-teal-900/40 dark:text-emerald-300 dark:border-emerald-600'
                }`}>
                  {repo.private ? (
                    <>
                      <LockClosedIcon className="w-3 h-3 inline mr-1" />
                      Private
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="w-3 h-3 inline mr-1" />
                      Public
                    </>
                  )}
                </span>
              </div>

              {/* Enhanced Description */}
              <p className="text-slate-700 dark:text-slate-300 mb-4 text-sm leading-relaxed line-clamp-2">
                {repo.description || 'No description available'}
              </p>

              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                {repo.language && (
                  <div className="group/stat relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group-hover/stat:border-blue-300 dark:group-hover/stat:border-blue-600 transition-all">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0"></div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{repo.language}</span>
                    </div>
                  </div>
                )}
                <div className="group/stat relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group-hover/stat:border-yellow-300 dark:group-hover/stat:border-yellow-600 transition-all">
                    <StarIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{repo.stargazers_count.toLocaleString()}</span>
                  </div>
                </div>
                {(repo.forks_count !== undefined && repo.forks_count > 0) && (
                  <div className="group/stat relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group-hover/stat:border-emerald-300 dark:group-hover/stat:border-emerald-600 transition-all">
                      <ArrowPathIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{repo.forks_count.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div className="group/stat relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-700/30 dark:to-gray-700/30 rounded-lg opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group-hover/stat:border-slate-300 dark:group-hover/stat:border-slate-600 transition-all">
                    <ClockIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{formatUpdatedAt(repo.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Credit Information */}
              {creditCheck && (
                <div className={`mb-4 p-3 rounded-lg border transition-all duration-300 ${
                  creditCheck.isEmpty 
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-300 dark:bg-gradient-to-r dark:from-blue-900/30 dark:to-blue-800/20 dark:border-blue-600'
                    : creditCheck.hasEnoughCredits 
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-300 dark:bg-gradient-to-r dark:from-emerald-900/30 dark:to-emerald-800/20 dark:border-emerald-600'
                      : 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-300 dark:bg-gradient-to-r dark:from-red-900/30 dark:to-red-800/20 dark:border-red-600'
                }`}>
                  {creditCheck.isEmpty ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                        Repository is empty - Free to add!
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {creditCheck.hasEnoughCredits ? (
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          creditCheck.hasEnoughCredits 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {creditCheck.fileCount} files • {creditCheck.creditsNeeded} credits needed
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        creditCheck.hasEnoughCredits 
                          ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {creditCheck.hasEnoughCredits ? 'Ready' : 'Insufficient Credits'}
                      </span>
                    </div>
                  )}
                </div>
              )}              {/* Enhanced Action Buttons */}
              <div className="flex justify-end space-x-3">
                {isExisting ? (
                  /* Existing Repository - Show Open Button */
                  <button
                    onClick={() => onOpenRepository?.(repo)}
                    className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-sm"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    
                    <div className="relative flex items-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Open Repository</span>
                    </div>
                  </button>
                ) : !creditCheck ? (<button
                    onClick={handleCheckCredits}
                    disabled={localChecking}
                    className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium rounded-lg transition-all duration-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 text-sm"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    
                    <div className="relative flex items-center space-x-2">
                      {localChecking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <CodeBracketIcon className="w-4 h-4" />
                          <span>Check Credits</span>
                        </>
                      )}
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={isAdding || (!creditCheck.hasEnoughCredits && !creditCheck.isEmpty)}
                    className={`group relative overflow-hidden px-4 py-2 font-medium rounded-lg transition-all duration-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 text-sm ${
                      creditCheck.isEmpty 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                        : creditCheck.hasEnoughCredits
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                          : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white cursor-not-allowed'
                    }`}
                  >
                    {/* Shimmer effect for enabled buttons */}
                    {(creditCheck.hasEnoughCredits || creditCheck.isEmpty) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    )}
                    
                    <div className="relative flex items-center space-x-2">
                      {isAdding ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Add Repository</span>
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
