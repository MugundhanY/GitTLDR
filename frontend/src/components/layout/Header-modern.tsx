'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRepository, Repository } from '@/contexts/RepositoryContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserData } from '@/hooks/useUserData';
import { 
  ChevronDownIcon,
  MagnifyingGlassIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  PlusIcon,
  CommandLineIcon,
  LockClosedIcon,
  GlobeAltIcon,
  StarIcon,
  CodeBracketIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export function Header() {
  const { selectedRepository, repositories, selectRepository } = useRepository();
  const { theme, setTheme } = useTheme();
  const { userData } = useUserData();
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRepoDropdown(false);
      }
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

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Repository Selector */}
          <div className="flex items-center space-x-4">
            {/* Logo */}            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <CodeBracketIcon className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-slate-900 dark:text-white">GitTLDR</span>
            </Link>

            {/* Repository Selector */}
            <div className="relative" ref={dropdownRef}>              <button
                onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >
                {selectedRepository ? (
                  <>                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center">
                      <CodeBracketIcon className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="max-w-32 truncate">{selectedRepository.name}</span>
                    <div className="flex items-center space-x-1">
                      {selectedRepository.private ? (
                        <LockClosedIcon className="w-3 h-3 text-amber-500" />
                      ) : (
                        <GlobeAltIcon className="w-3 h-3 text-green-500" />
                      )}                      <CodeBracketIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">main</span>
                    </div>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span>Select Repository</span>
                  </>
                )}
                <ChevronDownIcon className="w-4 h-4" />
              </button>

              {/* Repository Dropdown */}              {showRepoDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700">                    <div className="relative">
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
                          }}                          className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center mr-3">
                            <CodeBracketIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
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
                            {repo.description && (                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
                    ) : (                      <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <CodeBracketIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium mb-2">No repositories found</p>                        <p className="text-xs">Try adjusting your search terms</p>
                      </div>
                    )}
                  </div>                  <div className="border-t border-slate-200 dark:border-slate-700 p-3">
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
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">            <div className="relative">
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
            <div className="relative" ref={themeDropdownRef}>              <button
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
              </button>              {showThemeDropdown && (
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
                          }}                          className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
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
            <div className="relative" ref={profileDropdownRef}>              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
              >
                {userData?.avatarUrl ? (
                  <img 
                    src={userData.avatarUrl} 
                    alt={userData.name || 'User'} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5" />
                  </div>
                )}
              </button>{showProfileDropdown && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{userData?.name || 'Guest User'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{userData?.email || 'Not signed in'}</p>
                  </div>
                  <div className="py-1">                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <Cog6ToothIcon className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
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
    </header>
  );
}
