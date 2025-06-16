'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useRepository, Repository } from '@/contexts/RepositoryContext';
import { useQnA } from '@/contexts/QnAContext';
import { useUserData } from '@/hooks/useUserData';
import { useRepositoryStats } from '@/hooks/useRepositoryStats';
import Tooltip from '@/components/ui/Tooltip';
import {
  HomeIcon,
  DocumentTextIcon,
  FolderIcon,
  VideoCameraIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  CodeBracketIcon,
  QuestionMarkCircleIcon,
  ArchiveBoxIcon,
  StarIcon,
  LockClosedIcon,
  GlobeAltIcon,  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  selectedRepository?: Repository | null;
}

export default function Sidebar({ selectedRepository }: SidebarProps) {
  const pathname = usePathname();
  const { userData, billingData, isLoading } = useUserData();
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useRepositoryStats(selectedRepository?.id);
  const { repositories, selectRepository } = useRepository();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { statsRefreshTrigger } = useQnA();
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh stats when QnA context triggers an update
  useEffect(() => {
    if (statsRefreshTrigger > 0 && selectedRepository?.id) {
      refetchStats();
    }
  }, [statsRefreshTrigger, selectedRepository?.id, refetchStats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRepoDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug logging for credits
  console.log('[SIDEBAR] Debug - Credits Data:', {
    billingCredits: billingData?.subscription?.credits,
    userCredits: userData?.credits,
    finalCredits: billingData?.subscription?.credits || userData?.credits || 0,
    isLoading
  });
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon,
      description: 'Overview and insights',
      badge: null,
      count: null
    },
    { 
      name: 'Files', 
      href: '/files', 
      icon: FolderIcon,
      description: 'Browse repository files',
      badge: null,
      count: stats?.totalFiles?.toString() || (statsLoading ? '...' : null)
    },
    { 
      name: 'Meetings', 
      href: '/meetings', 
      icon: VideoCameraIcon,
      description: 'Recorded sessions',
      badge: '3',
      count: null
    },
    { 
      name: 'Q&A', 
      href: '/qna', 
      icon: ChatBubbleLeftRightIcon,
      description: 'AI-powered assistance',
      badge: null,
      count: stats?.totalQuestions?.toString() || (statsLoading ? '...' : null)
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: ChartBarIcon,
      description: 'Repository insights',
      badge: 'New',
      count: null
    },
    { 
      name: 'Team', 
      href: '/team', 
      icon: UsersIcon,
      description: 'Collaboration hub',
      badge: null,
      count: '8'
    },
  ];

  const secondaryItems = [
    { 
      name: 'Billing', 
      href: '/billing', 
      icon: CreditCardIcon,
      description: 'Subscription & usage',
      status: 'active'
    },
    { 
      name: 'Help & Support', 
      href: '/support', 
      icon: QuestionMarkCircleIcon,
      description: 'Get help and support',
      status: null
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Cog6ToothIcon,
      description: 'Account preferences',
      status: null
    },  ];  return (
    <div className={`flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-72'
    }`}>      {/* Repository Selector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Repository</h2>
          )}          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Repository Selection Area - Fixed Height */}
        <div className="h-10 flex items-center">
          {!isCollapsed ? (
            <div className="relative w-full" ref={dropdownRef}>
              <button
                onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >                {selectedRepository ? (
                  <>
                    {/* Repository Avatar */}
                    {selectedRepository.avatarUrl || selectedRepository.owner?.avatar_url ? (
                      <div className="w-5 h-5 rounded overflow-hidden bg-slate-200 dark:bg-slate-600">
                        <Image
                          src={selectedRepository.avatarUrl || selectedRepository.owner?.avatar_url || ''}
                          alt={`${selectedRepository.name} avatar`}
                          width={20}
                          height={20}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center">
                        <CodeBracketIcon className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                      </div>
                    )}
                    <span className="flex-1 text-left truncate">{selectedRepository.name}</span>
                    <div className="flex items-center space-x-1">
                      {selectedRepository.private ? (
                        <LockClosedIcon className="w-3 h-3 text-amber-500" />
                      ) : (
                        <GlobeAltIcon className="w-3 h-3 text-green-500" />
                      )}
                      <CodeBracketIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">main</span>
                    </div>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span className="flex-1 text-left">Select Repository</span>
                  </>
                )}
                <ChevronDownIcon className="w-4 h-4" />
              </button>              {/* Repository Dropdown */}
              {showRepoDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search repositories..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredRepos.length > 0 ? (
                      filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => {
                            selectRepository(repo);
                            setShowRepoDropdown(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"                        >
                          {/* Repository Avatar in Dropdown */}
                          {repo.avatarUrl || repo.owner?.avatar_url ? (
                            <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 dark:bg-slate-700 mr-3">
                              <Image
                                src={repo.avatarUrl || repo.owner?.avatar_url || ''}
                                alt={`${repo.name} avatar`}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center mr-3">
                              <CodeBracketIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {repo.name}
                              </p>
                              {repo.private && (
                                <LockClosedIcon className="w-3 h-3 text-amber-500" />
                              )}
                              {(repo.stargazers_count ?? 0) > 0 && (
                                <div className="flex items-center">
                                  <StarIcon className="w-3 h-3 text-yellow-400" />
                                  <span className="text-xs text-slate-500 ml-1">{repo.stargazers_count ?? 0}</span>
                                </div>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-1 text-slate-400 mt-1">
                              <CodeBracketIcon className="w-3 h-3" />
                              <span className="text-xs">main</span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <CodeBracketIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium mb-2">No repositories found</p>
                        <p className="text-xs">Try adjusting your search terms</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 p-3">
                    <Link 
                      href="/repositories/create" 
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                      onClick={() => setShowRepoDropdown(false)}
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Repository
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed Repository Indicator */
            selectedRepository && (
              <Tooltip content={`${selectedRepository.name} - ${selectedRepository.private ? 'Private' : 'Public'}`}>
                {selectedRepository.avatarUrl || selectedRepository.owner?.avatar_url ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mx-auto">
                    <Image
                      src={selectedRepository.avatarUrl || selectedRepository.owner?.avatar_url || ''}
                      alt={`${selectedRepository.name} avatar`}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto">
                    <CodeBracketIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                )}
              </Tooltip>
            )
          )}
        </div>
      </div>{/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;          const linkContent = (
            <Link
              key={item.name}
              href={item.href}              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-r-2 border-emerald-600'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0 ${              isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
              }`} />

              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.name}</span>
                  <div className="flex items-center space-x-2 ml-2">                    {item.count && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all duration-200 ${
                        item.count === '...' ? 'animate-pulse bg-slate-200 dark:bg-slate-700' : ''
                      }`}>
                        {item.count === '...' ? (
                          <span className="w-4 h-3 bg-slate-300 dark:bg-slate-600 rounded animate-pulse"></span>
                        ) : (
                          item.count
                        )}
                      </span>
                    )}{item.badge && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.badge === 'New'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </>
              )}
            </Link>
          );

          return isCollapsed ? (
            <Tooltip key={item.name} content={item.name}>
              {linkContent}
            </Tooltip>
          ) : linkContent;
        })}
      </nav>      {/* Secondary Items */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.status === 'active' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </>
                )}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.name} content={item.name}>
                {linkContent}
              </Tooltip>
            ) : linkContent;
          })}
        </div>
      </div>{/* Footer */}
      {!isCollapsed && (
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <div className="text-xs font-medium text-slate-900 dark:text-white">GitTLDR</div>            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isLoading ? 'Loading...' : `Credits: ${billingData?.subscription?.credits || userData?.credits || 0}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
