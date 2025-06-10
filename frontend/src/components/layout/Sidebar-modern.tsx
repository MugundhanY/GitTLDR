'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useRepository, Repository } from '@/contexts/RepositoryContext';
import { useUserData } from '@/hooks/useUserData';
import { useRepositoryStats } from '@/hooks/useRepositoryStats';
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
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  selectedRepository?: Repository | null;
}

export default function Sidebar({ selectedRepository }: SidebarProps) {
  const pathname = usePathname();
  const { userData, billingData, isLoading } = useUserData();
  const { stats } = useRepositoryStats(selectedRepository?.id);

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
    },    { 
      name: 'Files', 
      href: '/files', 
      icon: FolderIcon,
      description: 'Browse repository files',
      badge: null,
      count: stats?.totalFiles?.toString() || null
    },
    { 
      name: 'Meetings', 
      href: '/meetings', 
      icon: VideoCameraIcon,
      description: 'Recorded sessions',
      badge: '3',
      count: null
    },    { 
      name: 'Q&A', 
      href: '/qna', 
      icon: ChatBubbleLeftRightIcon,
      description: 'AI-powered assistance',
      badge: null,
      count: stats?.totalQuestions?.toString() || null
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
    },
  ];
  return (
    <div className="flex h-full w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Repository Section */}
      {selectedRepository && (        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <CodeBracketIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {selectedRepository.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                {selectedRepository.language && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedRepository.language}
                  </span>
                )}
                {selectedRepository.private ? (
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                    <LockClosedIcon className="w-3 h-3 mr-1" />
                    Private
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                    <GlobeAltIcon className="w-3 h-3 mr-1" />
                    Public
                  </div>
                )}
                {selectedRepository.stargazers_count && selectedRepository.stargazers_count > 0 && (
                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                    <StarIcon className="w-3 h-3 mr-1" />
                    {selectedRepository.stargazers_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-r-2 border-emerald-600'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}            >
              <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
              }`} />
              <span className="flex-1 truncate">{item.name}</span>
              <div className="flex items-center space-x-2 ml-2">
                {item.count && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.count}
                  </span>
                )}                {item.badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.badge === 'New'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>      {/* Secondary Items */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                }`} />
                <span className="flex-1 truncate">{item.name}</span>
                {item.status === 'active' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <div className="text-xs font-medium text-slate-900 dark:text-white">GitTLDR</div>          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isLoading ? 'Loading...' : `Credits: ${billingData?.subscription?.credits || userData?.credits || 0}`}
          </div>
        </div>
      </div>
    </div>
  );
}
