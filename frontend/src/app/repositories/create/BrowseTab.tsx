import React from 'react';
import {
  CodeBracketIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BookOpenIcon,
  LightBulbIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import RepositoryItem from './RepositoryItem';
import { GitHubRepo, CreditCheck, TabType } from './types';
import { Repository } from '@/contexts/RepositoryContext';

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
  existingRepositories: Repository[];
  onOpenRepository: (repo: GitHubRepo) => void;
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
  setActiveTab,
  existingRepositories,
  onOpenRepository
}: BrowseTabProps) {
  // Separate existing and new repositories
  const isRepositoryExisting = (repo: GitHubRepo) => {
    return existingRepositories.some(existing => 
      existing.full_name.toLowerCase() === repo.full_name.toLowerCase()
    );
  };

  const existingRepos = filteredRepos.filter(isRepositoryExisting);
  const newRepos = filteredRepos.filter(repo => !isRepositoryExisting(repo));

  return (
    <div className="space-y-6">      {/* Enhanced Header Card with Animated Background */}
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
                  <CodeBracketIcon className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 dark:from-white dark:via-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
                  Your GitHub Repositories
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Browse and add repositories from your GitHub account
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
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
                      </h3>                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        To access your private repositories, you can add them by URL in the &quot;Add by URL&quot; tab above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}            {/* Enhanced Search Input */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-800 dark:text-slate-100 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
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
      <div>        {isLoadingRepos ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 to-slate-100/40 dark:from-slate-800/80 dark:to-slate-900/40 rounded-xl"></div>
            
            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
              <div className="text-center py-20 px-8">
                {/* Professional loading indicator */}
                <div className="relative mx-auto mb-8 w-20 h-20">
                  <div className="absolute inset-0 border-[3px] border-slate-200 dark:border-slate-700 rounded-full"></div>
                  <div className="absolute inset-0 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  
                  {/* Inner pulsing circle */}
                  <div className="absolute inset-3 bg-emerald-500/20 rounded-full animate-pulse"></div>
                  
                  {/* Repository icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CodeBracketIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                {/* Professional typography */}
                <div className="space-y-3 mb-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Connecting to GitHub
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Securely fetching your repositories from GitHub. This may take a moment for accounts with many repositories.
                  </p>
                </div>

                {/* Professional progress indicator */}
                <div className="w-32 mx-auto">
                  <div className="flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>): filteredRepos.length === 0 ? (          <div className="relative overflow-hidden">
            {/* Enhanced animated background with depth */}
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/6 w-40 h-40 bg-gradient-to-br from-emerald-400/8 via-teal-400/12 to-blue-400/8 rounded-full blur-3xl animate-pulse delay-500"></div>
              <div className="absolute bottom-1/3 right-1/5 w-32 h-32 bg-gradient-to-br from-purple-400/8 via-pink-400/10 to-indigo-400/8 rounded-full blur-2xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-amber-400/6 to-orange-400/8 rounded-full blur-xl animate-pulse delay-75"></div>
            </div>
            
            <div className="relative bg-gradient-to-br from-white/96 via-slate-50/94 to-white/96 dark:from-slate-800/96 dark:via-slate-900/94 dark:to-slate-800/96 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl">
              <div className="text-center py-24 px-8">                {/* Enhanced professional illustration */}
                <div className="relative mx-auto mb-12 w-28 h-28">
                  {/* Multi-layer background glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/25 via-teal-400/30 to-blue-400/25 rounded-3xl blur-2xl animate-pulse"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-indigo-400/20 via-purple-400/25 to-pink-400/20 rounded-2xl blur-xl animate-pulse delay-300"></div>
                  
                  {/* Main enhanced container */}
                  <div className="relative w-28 h-28 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-3xl flex items-center justify-center shadow-2xl border-3 border-white/90 dark:border-slate-600/90 ring-1 ring-slate-200/50 dark:ring-slate-500/50">
                    {/* Enhanced icon with subtle animation */}
                    <div className="relative transform hover:scale-110 transition-transform duration-500">
                      {githubRepos.length === 0 ? (
                        <div className="relative">
                          <CodeBracketIcon className="h-14 w-14 text-slate-600 dark:text-slate-300" />
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-sm animate-pulse"></div>
                        </div>
                      ) : (
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-14 w-14 text-slate-600 dark:text-slate-300" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-sm animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced status indicator with pulse */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/90 dark:ring-slate-800/90 animate-pulse">
                    {githubRepos.length === 0 ? (
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>                {/* Enhanced typography with better spacing */}
                <div className="space-y-6 mb-12">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                    {githubRepos.length === 0 ? 'Ready to Explore Repositories?' : 'No Repositories Found'}
                  </h3>
                  
                  <div className="max-w-2xl mx-auto">
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                      {githubRepos.length === 0 
                        ? 'Discover powerful AI insights from any GitHub repository. Start by adding a repository URL or explore our curated collection of popular projects.'
                        : 'No repositories match your search. Try different keywords, clear your search, or add a specific repository by URL.'
                      }
                    </p>
                  </div>                </div>

                {/* Enhanced feature highlights for no repos state */}
                {githubRepos.length === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                    <div className="group bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <SparklesIcon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Analysis</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Get intelligent insights about code quality, architecture, and improvements.</p>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <RocketLaunchIcon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Quick Setup</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Instantly analyze any public repository with just a GitHub URL.</p>
                    </div>
                    
                    <div className="group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpenIcon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Docs</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Generate comprehensive documentation and summaries automatically.</p>
                    </div>
                  </div>
                )}

                {/* Enhanced action area */}
                <div className="space-y-8">                  {githubRepos.length === 0 ? (
                    <>
                      {/* Primary enhanced action */}
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                          onClick={() => setActiveTab('url')}
                          className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-110 shadow-2xl hover:shadow-emerald-500/25 border border-emerald-500/20"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <GlobeAltIcon className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                          <span className="relative">Add Repository by URL</span>
                          <ArrowRightIcon className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                      </div>
                      
                      {/* Enhanced popular repositories section */}
                      <div className="bg-gradient-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-900/60 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center justify-center mb-4">
                          <LightBulbIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Explore Popular Repositories</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                          {[
                            { name: 'React', search: 'react', color: 'from-blue-500 to-cyan-500' },
                            { name: 'Next.js', search: 'nextjs', color: 'from-slate-700 to-slate-900' },
                            { name: 'TypeScript', search: 'typescript', color: 'from-blue-600 to-blue-800' },
                            { name: 'Vue.js', search: 'vuejs', color: 'from-green-500 to-emerald-600' },
                            { name: 'Python', search: 'python', color: 'from-yellow-500 to-orange-500' },
                            { name: 'Node.js', search: 'nodejs', color: 'from-green-600 to-green-800' }
                          ].map((tech) => (
                            <button
                              key={tech.name}
                              onClick={() => setSearchTerm(tech.search)}
                              className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${tech.color} text-white text-sm font-medium rounded-xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
                            >
                              {tech.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Enhanced search actions */}
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                          onClick={() => setSearchTerm('')}
                          className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-110 shadow-2xl border border-blue-500/20"
                        >
                          <MagnifyingGlassIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                          Clear Search & Show All
                          <ArrowRightIcon className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                      </div>
                      
                      {/* Enhanced alternative action */}
                      <div className="bg-gradient-to-r from-slate-50/80 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-900/60 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60">                        <p className="text-slate-600 dark:text-slate-400 mb-4 font-medium">
                          Can&apos;t find what you&apos;re looking for?
                        </p>
                        <button
                          onClick={() => setActiveTab('url')}
                          className="group inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-all duration-300 hover:scale-105"
                        >
                          <GlobeAltIcon className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                          Add any repository by URL
                          <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>        ) : (
          <div className="space-y-6">
            {/* New Repositories Section */}
            {newRepos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Available Repositories
                </h3>
                <div className="space-y-4">
                  {newRepos.map((repo) => (
                    <RepositoryItem 
                      key={repo.id} 
                      repo={repo} 
                      onAddRepository={handleAddRepository}
                      checkCreditsForRepo={checkCreditsForRepo}
                      checkedRepos={checkedRepos}
                      isCheckingCredits={isCheckingCredits}
                      isAdding={isAdding}
                      isExisting={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Existing Repositories Section */}
            {existingRepos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" />
                  Already Added Repositories
                </h3>
                <div className="space-y-4">
                  {existingRepos.map((repo) => (
                    <RepositoryItem 
                      key={repo.id} 
                      repo={repo} 
                      onAddRepository={handleAddRepository}
                      checkCreditsForRepo={checkCreditsForRepo}
                      checkedRepos={checkedRepos}
                      isCheckingCredits={isCheckingCredits}
                      isAdding={isAdding}
                      isExisting={true}
                      onOpenRepository={onOpenRepository}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No repositories message */}
            {newRepos.length === 0 && existingRepos.length === 0 && (
              <div className="text-center py-12">
                <div className="text-slate-500 dark:text-slate-400">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No repositories found</p>
                  <p className="text-sm">Try adjusting your search terms or browse all repositories</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
