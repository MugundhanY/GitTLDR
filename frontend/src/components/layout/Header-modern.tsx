'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserData } from '@/hooks/useUserData';
import { useRepository } from '@/contexts/RepositoryContext';
import { 
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CodeBracketIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { clientCache, CACHE_KEYS } from '@/lib/client-cache';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';

const MobileSidebar = dynamic(() => import('./MobileSidebar'), { ssr: false });

export function Header() {
  const { theme, setTheme } = useTheme();
  const { userData } = useUserData();
  const { selectedRepository } = useRepository();
  const { data: repoStats } = useQuery({
    queryKey: ['repositoryStats', selectedRepository?.id],
    queryFn: async () => {
      if (!selectedRepository?.id) return null;
      const res = await fetch(`/api/repositories/${selectedRepository.id}/stats`);
      if (!res.ok) throw new Error('Failed to fetch repository stats');
      return await res.json();
    },
    enabled: !!selectedRepository?.id,
    refetchInterval: (query) => query.state.data && query.state.data.processed === false ? 5000 : false,
    staleTime: 1000 * 60 * 10
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search functionality
  useEffect(() => {
    const handleSearch = async () => {
      if (!globalSearchQuery.trim() || !selectedRepository?.id) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        // Search in multiple areas
        const [filesRes, questionsRes, meetingsRes] = await Promise.allSettled([
          fetch(`/api/repositories/${selectedRepository.id}/files?search=${encodeURIComponent(globalSearchQuery)}`),
          fetch(`/api/qna?repositoryId=${selectedRepository.id}&search=${encodeURIComponent(globalSearchQuery)}`),
          fetch(`/api/meetings?repositoryId=${selectedRepository.id}&search=${encodeURIComponent(globalSearchQuery)}`)
        ]);

        const results: any[] = [];

        // Add file results
        if (filesRes.status === 'fulfilled' && filesRes.value.ok) {
          const filesData = await filesRes.value.json();
          if (filesData.files) {
            results.push(...filesData.files.slice(0, 3).map((file: any) => ({
              type: 'file',
              title: file.name,
              path: file.path,
              href: `/files?file=${file.id}`,
              description: file.summary || `${file.language} file`
            })));
          }
        }

        // Add Q&A results
        if (questionsRes.status === 'fulfilled' && questionsRes.value.ok) {
          const questionsData = await questionsRes.value.json();
          if (questionsData.questions) {
            results.push(...questionsData.questions.slice(0, 3).map((question: any) => ({
              type: 'question',
              title: question.query,
              href: `/qna#question-${question.id}`,
              description: question.answer ? question.answer.substring(0, 100) + '...' : 'Q&A'
            })));
          }
        }

        // Add meeting results
        if (meetingsRes.status === 'fulfilled' && meetingsRes.value.ok) {
          const meetingsData = await meetingsRes.value.json();
          if (meetingsData.meetings) {
            results.push(...meetingsData.meetings.slice(0, 3).map((meeting: any) => ({
              type: 'meeting',
              title: meeting.title,
              href: `/meetings/${meeting.id}`,
              description: meeting.summary || 'Meeting recording'
            })));
          }
        }

        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [globalSearchQuery, selectedRepository?.id]);

  const themeOptions = [
    { 
      value: 'light', 
      label: 'Light', 
      icon: SunIcon,
      description: 'Light theme'
    },
    { 
      value: 'dark', 
      label: 'Dark', 
      icon: MoonIcon,
      description: 'Dark theme'
    },
    { 
      value: 'system', 
      label: 'System', 
      icon: ComputerDesktopIcon,
      description: 'Follow system'
    }
  ];

  const handleLogout = () => {
    clientCache.delete(CACHE_KEYS.USER_DATA);
    clientCache.delete(CACHE_KEYS.BILLING_DATA);
    // Optionally clear all cache: clientCache.clear();
    // Remove any auth tokens from localStorage/cookies if used
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      // Optionally clear other user-related storage
    }
    setShowProfileDropdown(false);
    router.push('/');
  };

  return (
    <>
      {/* Repo Processing Banner */}
      {repoStats && repoStats.processed === false && (
        <div className="w-full bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-center py-2 font-medium flex items-center justify-center gap-2 animate-pulse z-50">
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full animate-ping mr-2"></span>
          Repository is still processing. Some files and stats may be incomplete.
        </div>
      )}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile Sidebar Toggle */}
            <div className="flex items-center">
              <button
                className="md:hidden p-2 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setShowMobileSidebar(true)}
                aria-label="Open sidebar"
              >
                <Bars3Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              </button>
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <CodeBracketIcon className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold text-slate-900 dark:text-white hidden sm:block">GitTLDR</span>
              </Link>
            </div>

            {/* Search Bar - Hidden on small screens, shown in mobile menu */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8 relative" ref={searchDropdownRef}>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search files, commits, issues..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  onFocus={() => globalSearchQuery && setShowSearchResults(true)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="hidden lg:inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                    ⌘K
                  </kbd>
                </div>
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && (searchResults.length > 0 || isSearching) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Searching...</p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          No results found for &quot;{globalSearchQuery}&quot;
                        </div>
                      ) : (
                        <>
                          {searchResults.map((result, index) => (
                            <Link
                              key={index}
                              href={result.href}
                              className="flex items-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              onClick={() => {
                                setShowSearchResults(false);
                                setGlobalSearchQuery('');
                              }}
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3">
                                {result.type === 'file' && (
                                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                                {result.type === 'question' && (
                                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {result.type === 'meeting' && (
                                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {result.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {result.description}
                                </p>
                                {result.path && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono">
                                    {result.path}
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))}
                          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Press Enter to search all content
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Mobile Search Button */}
              <button
                className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => {
                  // Toggle mobile search or navigate to search page
                  router.push('/search');
                }}
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>

              {/* Theme Toggle */}
              <div className="relative" ref={themeDropdownRef}>
                <button
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {theme === 'light' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : theme === 'dark' ? (
                    <MoonIcon className="w-5 h-5" />
                  ) : (
                    <ComputerDesktopIcon className="w-5 h-5" />
                  )}
                </button>
                {showThemeDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                    <div className="py-1">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTheme(option.value as any);
                              setShowThemeDropdown(false);
                            }}
                            className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                              theme === option.value ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{option.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <NotificationDropdown />
              {/* Profile */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  {userData?.avatarUrl ? (
                    <img 
                      src={userData.avatarUrl} 
                      alt={userData.name || 'User'} 
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        // If avatar fails to load, hide it and show fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center ${userData?.avatarUrl ? 'hidden' : 'flex'}`}
                  >
                    <UserCircleIcon className="w-5 h-5" />
                  </div>
                </button>
                {showProfileDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{userData?.name || 'Guest User'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{userData?.email || 'Not signed in'}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-3" />
                        Settings
                      </Link>
                      <button
                        className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                        onClick={handleLogout}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Sidebar Drawer */}
        {showMobileSidebar && (
          <MobileSidebar
            navigation={[
              { name: 'Dashboard', href: '/dashboard' },
              { name: 'Files', href: '/files' },
              { name: 'Meetings', href: '/meetings' },
              { name: 'Q&A', href: '/qna' },
              { name: 'Analytics', href: '/analytics' },
              { name: 'Team', href: '/team' },
            ]}
            secondaryItems={[
              { name: 'Billing', href: '/billing' },
              { name: 'Help & Support', href: '/support' },
              { name: 'Settings', href: '/settings' },
            ]}
            selectedRepository={selectedRepository}
            // Add a close handler
            onClose={() => setShowMobileSidebar(false)}
            // Pass user credits to MobileSidebar
            credits={userData?.credits}
          />
        )}
      </header>
    </>
  );
}
