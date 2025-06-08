'use client';

import React from 'react';
import { GlobeAltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { GitHubRepo, CreditCheck } from './types';
import RepositoryPreview from './RepositoryPreview';

interface URLTabProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  isValidating: boolean;
  validationError: string;
  repoData: GitHubRepo | null;
  creditCheck: CreditCheck | null;
  isCheckingCredits: boolean;
  isAdding: boolean;
  checkCreditsForUrl: (repo: GitHubRepo) => Promise<void>;
  handleAddRepository: (repo: GitHubRepo, creditsNeeded?: number) => Promise<void>;
}

export default function URLTab({
  githubUrl,
  setGithubUrl,
  isValidating,
  validationError,
  repoData,
  creditCheck,
  isCheckingCredits,
  isAdding,
  checkCreditsForUrl,
  handleAddRepository
}: URLTabProps) {
  return (
    <div className="space-y-8">
      {/* Enhanced URL Input Card */}
      <div className="relative overflow-hidden">
        {/* Animated background patterns */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/30 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-800/90"></div>
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-200/40 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <div className="px-8 py-6 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl">
                  <GlobeAltIcon className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 dark:from-white dark:via-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
                  Add Repository by URL
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Paste any GitHub repository URL to get instant insights
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <label htmlFor="github-url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  GitHub Repository URL
                </label>
                <div className="relative group">
                  {/* Input field with enhanced styling */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <input
                      type="url"
                      id="github-url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full px-5 py-4 border-2 border-slate-300 dark:border-slate-600 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 text-lg backdrop-blur-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                        <GlobeAltIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced validation states */}
                {isValidating && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Validating repository...</span>
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm">Checking repository accessibility and details</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {validationError && (
                  <div className="mt-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-lg"></div>
                    <div className="relative p-4 border border-red-200 dark:border-red-700/50 rounded-lg backdrop-blur-sm">
                      <div className="flex items-start space-x-3">
                        <div className="p-1 bg-red-100 dark:bg-red-900/40 rounded-full">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-red-700 dark:text-red-300 font-semibold">Validation Error</p>
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationError}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Repository Preview */}
      {repoData && (
        <RepositoryPreview
          repoData={repoData}
          creditCheck={creditCheck}
          isCheckingCredits={isCheckingCredits}
          isAdding={isAdding}
          checkCreditsForUrl={checkCreditsForUrl}
          handleAddRepository={handleAddRepository}
        />
      )}
    </div>
  );
}
