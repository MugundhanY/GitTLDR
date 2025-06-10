'use client';

import React from 'react';
import Image from 'next/image';
import {
  CodeBracketIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CheckCircleIcon,
  StarIcon,
  ArrowPathIcon,
  DocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { GitHubRepo, CreditCheck } from './types';

interface RepositoryPreviewProps {
  repoData: GitHubRepo;
  creditCheck: CreditCheck | null;
  isCheckingCredits: boolean;
  isAdding: boolean;
  checkCreditsForUrl: (repo: GitHubRepo) => Promise<void>;
  handleAddRepository: (repo: GitHubRepo, creditsNeeded?: number) => Promise<void>;
  isExisting?: boolean;
  onOpenRepository?: (repo: GitHubRepo) => void;
}

export default function RepositoryPreview({
  repoData,
  creditCheck,
  isCheckingCredits,
  isAdding,
  checkCreditsForUrl,
  handleAddRepository,
  isExisting = false,
  onOpenRepository
}: RepositoryPreviewProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-blue-50/60 to-teal-50/80 dark:from-emerald-900/20 dark:via-blue-900/15 dark:to-teal-900/20"></div>
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border transition-all duration-300 shadow-xl ${
        isExisting 
          ? 'border-emerald-200 dark:border-emerald-700 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/20 dark:to-transparent'
          : 'border-slate-200/60 dark:border-slate-700/60'
      }`}>
        {/* Existing repository badge */}
        {isExisting && (
          <div className="absolute top-4 right-4 flex items-center space-x-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-sm font-medium z-10">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Already Added</span>
          </div>
        )}
        <div className="px-8 py-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                <DocumentIcon className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                Repository Preview
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Repository validated and ready to analyze
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8">
          <div className="flex items-start space-x-6">
            {/* Enhanced Avatar */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl blur opacity-30 animate-pulse"></div>
              {repoData.owner?.avatar_url ? (
                <Image 
                  src={repoData.owner.avatar_url} 
                  alt={`${repoData.owner.login}'s avatar`}
                  width={80}
                  height={80}
                  className="relative w-20 h-20 rounded-2xl object-cover border-2 border-white/50 dark:border-slate-700/50 shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="relative w-20 h-20 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-2xl flex items-center justify-center border-2 border-white/50 dark:border-slate-600/50 shadow-lg"
                style={{ display: repoData.owner?.avatar_url ? 'none' : 'flex' }}
              >
                <CodeBracketIcon className="h-10 w-10 text-slate-600 dark:text-slate-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Enhanced Repository Header */}
              <div className="flex items-center space-x-4 mb-4">
                <a 
                  href={repoData.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2 text-2xl font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                >
                  <span className="group-hover:scale-105 transition-transform">{repoData.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <GlobeAltIcon className="h-5 w-5" />
                  </div>
                </a>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-all duration-300 ${
                  repoData.private 
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300 dark:bg-gradient-to-r dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-300 dark:border-amber-600'
                    : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-300 dark:bg-gradient-to-r dark:from-emerald-900/40 dark:to-teal-900/40 dark:text-emerald-300 dark:border-emerald-600'
                }`}>
                  {repoData.private ? (
                    <>
                      <LockClosedIcon className="w-4 h-4 inline mr-1.5" />
                      Private
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="w-4 h-4 inline mr-1.5" />
                      Public
                    </>
                  )}
                </span>
              </div>

              {/* Enhanced Description */}
              <p className="text-slate-700 dark:text-slate-300 mb-6 text-lg leading-relaxed">
                {repoData.description || 'No description available'}
              </p>

              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                {repoData.language && (
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-all">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">{repoData.language}</span>
                    </div>
                  </div>
                )}
                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 group-hover:border-yellow-300 dark:group-hover:border-yellow-600 transition-all">
                    <StarIcon className="h-5 w-5 text-yellow-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{repoData.stargazers_count.toLocaleString()}</span>
                  </div>
                </div>
                {(repoData.forks_count !== undefined && repoData.forks_count > 0) && (
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 group-hover:border-emerald-300 dark:group-hover:border-emerald-600 transition-all">
                      <ArrowPathIcon className="h-5 w-5 text-emerald-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{repoData.forks_count.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-700/30 dark:to-gray-700/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-all">
                    <CodeBracketIcon className="h-5 w-5 text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{repoData.default_branch}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* Enhanced Credit Information */}
          {!isExisting && creditCheck && (
            <div className={`mb-6 relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
              creditCheck.isEmpty 
                ? 'bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 border-blue-300 dark:bg-gradient-to-r dark:from-blue-900/30 dark:via-blue-800/20 dark:to-blue-900/30 dark:border-blue-600'
                : creditCheck.hasEnoughCredits 
                  ? 'bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-emerald-50 border-emerald-300 dark:bg-gradient-to-r dark:from-emerald-900/30 dark:via-emerald-800/20 dark:to-emerald-900/30 dark:border-emerald-600'
                  : 'bg-gradient-to-r from-red-50 via-red-100/50 to-red-50 border-red-300 dark:bg-gradient-to-r dark:from-red-900/30 dark:via-red-800/20 dark:to-red-900/30 dark:border-red-600'
            }`}>
              {/* Animated background elements */}
              <div className="absolute inset-0 opacity-30">
                <div className={`absolute top-2 right-2 w-8 h-8 rounded-full blur-md animate-pulse ${
                  creditCheck.isEmpty ? 'bg-blue-300' : creditCheck.hasEnoughCredits ? 'bg-emerald-300' : 'bg-red-300'
                }`}></div>
                <div className={`absolute bottom-2 left-2 w-6 h-6 rounded-full blur-md animate-pulse ${
                  creditCheck.isEmpty ? 'bg-blue-400' : creditCheck.hasEnoughCredits ? 'bg-emerald-400' : 'bg-red-400'
                }`} style={{ animationDelay: '1s' }}></div>
              </div>
              
              <div className="relative p-6">
                {creditCheck.isEmpty ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-50 animate-pulse"></div>
                      <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-full">
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-1">Repository is Empty!</h3>
                      <p className="text-blue-700 dark:text-blue-300">This repository contains no files, so it&apos;s free to add. Perfect for exploring the interface!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File count and credits needed */}
                    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
                      <div className="flex items-center space-x-3">
                        {creditCheck.hasEnoughCredits ? (
                          <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <p className={`font-semibold ${creditCheck.hasEnoughCredits ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                            {creditCheck.fileCount} files found • {creditCheck.creditsNeeded} credits needed
                          </p>
                          <p className={`text-sm ${creditCheck.hasEnoughCredits ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            You have {creditCheck.userCredits} credits available
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                        creditCheck.hasEnoughCredits 
                          ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        {creditCheck.hasEnoughCredits ? 'Ready to Add' : 'Insufficient Credits'}
                      </span>
                    </div>
                    
                    {!creditCheck.hasEnoughCredits && (
                      <div className="text-center p-4 bg-red-100/50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/50">
                        <p className="text-red-700 dark:text-red-300 mb-3">
                          You need {creditCheck.creditsNeeded - creditCheck.userCredits} more credits to add this repository.
                        </p>
                        <button
                          onClick={() => window.open('/billing', '_blank')}
                          className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                        >
                          Get More Credits
                        </button>
                      </div>
                    )}

                    {creditCheck.isEstimate && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                        <strong>Note:</strong> File count is estimated based on repository structure. Actual count may vary.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
            {/* Enhanced Action Buttons */}
          <div className="flex justify-end space-x-4">
            {isExisting ? (
              /* Existing Repository - Show Open Button */
              <button
                onClick={() => onOpenRepository?.(repoData)}
                className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600 hover:from-emerald-700 hover:via-emerald-800 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[200px]"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <div className="relative flex items-center justify-center space-x-3">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Open Repository</span>
                </div>
              </button>
            ) : !creditCheck ? (
              <button
                onClick={() => checkCreditsForUrl(repoData)}
                disabled={isCheckingCredits}
                className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 disabled:from-slate-400 disabled:via-slate-500 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[200px]"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <div className="relative flex items-center justify-center space-x-3">
                  {isCheckingCredits ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Checking Credits...</span>
                    </>
                  ) : (
                    <>
                      <CodeBracketIcon className="w-5 h-5" />
                      <span>Check Credits</span>
                    </>
                  )}
                </div>
              </button>
            ) : (
              <button
                onClick={() => handleAddRepository(repoData, creditCheck.creditsNeeded)}
                disabled={isAdding || (!creditCheck.hasEnoughCredits && !creditCheck.isEmpty)}
                className={`group relative overflow-hidden px-8 py-4 font-semibold rounded-xl transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 min-w-[200px] ${
                  creditCheck.isEmpty 
                    ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white'
                    : creditCheck.hasEnoughCredits
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600 hover:from-emerald-700 hover:via-emerald-800 hover:to-emerald-700 text-white'
                      : 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400 text-white cursor-not-allowed'
                }`}
              >
                {/* Shimmer effect for enabled buttons */}
                {(creditCheck.hasEnoughCredits || creditCheck.isEmpty) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                )}
                
                <div className="relative flex items-center justify-center space-x-3">
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Adding Repository...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
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
  );
}
