import React from 'react';
import {
  CodeBracketIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import RepositoryItem from './RepositoryItem';
import { GitHubRepo, CreditCheck, TabType } from './types';

interface BrowseTabProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  publicOnly: boolean;
  isLoadingRepos: boolean;
  githubRepos: GitHubRepo[];
  filteredRepos: GitHubRepo[];
  handleAddRepository: (repo: GitHubRepo, creditsNeeded?: number) => Promise<void>;
  checkCreditsForRepo: (repo: GitHubRepo) => Promise<CreditCheck>;
  checkedRepos: Map<string, CreditCheck>;
  isCheckingCredits: boolean;
  isAdding: boolean;
  setActiveTab: (tab: TabType) => void;
}

export function BrowseTab({
  searchTerm,
  setSearchTerm,
  publicOnly,
  isLoadingRepos,
  githubRepos,
  filteredRepos,
  handleAddRepository,
  checkCreditsForRepo,
  checkedRepos,
  isCheckingCredits,
  isAdding,
  setActiveTab
}: BrowseTabProps) {
  return (
    <div className="space-y-6">
      {/* Enhanced Header Card with Animated Background */}
      <div className="relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <CodeBracketIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Your GitHub Repositories
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Browse and add repositories from your GitHub account
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Enhanced Private repos notice */}
            {publicOnly && !isLoadingRepos && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative p-4 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="p-1 bg-blue-100 dark:bg-blue-800/40 rounded-full">
                      <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        Showing Public Repositories Only
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        To access your private repositories, you can add them by URL in the "Add by URL" tab above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Enhanced Search Input */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full pl-12 pr-4 py-3 border border-slate-300/60 dark:border-slate-600/60 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Repository List */}
      <div>
        {isLoadingRepos ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl blur-xl"></div>
            <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <div className="text-center py-12">
                <div className="relative mx-auto mb-6 w-16 h-16">
                  <div className="absolute inset-0 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Loading your repositories...</p>
                <div className="mt-4 flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 rounded-xl blur-xl"></div>
            <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <div className="text-center py-12 px-6">
                <div className="relative mx-auto mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <CodeBracketIcon className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-orange-400 to-red-400 rounded-full animate-pulse opacity-75"></div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {githubRepos.length === 0 ? 'No repositories found' : 'No repositories match your search'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  {githubRepos.length === 0 
                    ? 'Connect your GitHub account or try adding a repository by URL using the tab above'
                    : 'Try adjusting your search terms to find the repository you\'re looking for'
                  }
                </p>
                {githubRepos.length === 0 && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <button
                      onClick={() => setActiveTab('url')}
                      className="relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <GlobeAltIcon className="w-5 h-5 mr-2" />
                      Add by URL Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRepos.map((repo) => (
              <RepositoryItem 
                key={repo.id} 
                repo={repo} 
                onAddRepository={handleAddRepository}
                checkCreditsForRepo={checkCreditsForRepo}
                checkedRepos={checkedRepos}
                isCheckingCredits={isCheckingCredits}
                isAdding={isAdding}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
