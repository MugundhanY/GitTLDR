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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                <span className="ml-2 text-xl font-bold text-slate-900 dark:text-white">GitTLDR</span>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search files, commits, issues..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
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
              <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
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
