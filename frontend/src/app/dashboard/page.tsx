'use client';

import React from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRepository } from '@/contexts/RepositoryContext';
import { 
  StarIcon,
  EyeIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlayIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  CogIcon,
  SparklesIcon,
  BoltIcon,
  BeakerIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { selectedRepository, repositories, isLoading } = useRepository();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CodeBracketIcon className="w-12 h-12 text-white" />
            </div>            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to GitTLDR</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first repository to get started with AI-powered insights and code analysis.
            </p>            <Link 
              href="/repositories/create" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <CodeBracketIcon className="w-4 h-4 mr-2" />
              Add Repository
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      name: 'Stars',
      value: selectedRepository.stargazers_count || 0,
      icon: StarIcon,
      change: '+12',
      changeType: 'positive',
      trend: 'up'
    },
    {
      name: 'Issues',
      value: selectedRepository.open_issues_count || 0,
      icon: ExclamationTriangleIcon,
      change: '-3',
      changeType: 'positive',
      trend: 'down'
    },
    {
      name: 'Pull Requests',
      value: '8',
      icon: CodeBracketIcon,
      change: '+2',
      changeType: 'positive',
      trend: 'up'
    },
    {
      name: 'Contributors',
      value: '24',
      icon: UsersIcon,
      change: '+5',
      changeType: 'positive',
      trend: 'up'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'commit',
      title: 'Fix authentication bug in login flow',
      author: 'John Doe',
      time: '2 hours ago',
      avatar: '🚀',
      description: 'Resolved issue with OAuth token refresh'
    },
    {
      id: 2,
      type: 'issue',
      title: 'Add dark mode support',
      author: 'Jane Smith',
      time: '4 hours ago',
      avatar: '🎨',
      description: 'Feature request for theme switching'
    },
    {
      id: 3,
      type: 'pr',
      title: 'Implement new dashboard design',
      author: 'Mike Johnson',
      time: '6 hours ago',
      avatar: '✨',
      description: 'Modern bento grid layout with animations'
    },
    {
      id: 4,
      type: 'release',
      title: 'Released version 2.1.0',
      author: 'Release Bot',
      time: '1 day ago',
      avatar: '🎉',
      description: 'New features and bug fixes'
    }
  ];

  const quickActions = [
    {
      title: 'Ask AI',
      description: 'Get instant answers about your codebase',
      icon: SparklesIcon,
      color: 'from-purple-500 to-pink-500',
      href: '/qna'
    },
    {
      title: 'New Issue',
      description: 'Report a bug or request a feature',
      icon: ExclamationTriangleIcon,
      color: 'from-red-500 to-orange-500',
      href: '#'
    },
    {
      title: 'Pull Request',
      description: 'Submit your code changes',
      icon: CodeBracketIcon,
      color: 'from-blue-500 to-cyan-500',
      href: '#'
    },
    {
      title: 'Analytics',
      description: 'View detailed insights',
      icon: ChartBarIcon,
      color: 'from-green-500 to-emerald-500',
      href: '#'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <CodeBracketIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>;
      case 'issue':
        return <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>;
      case 'pr':
        return <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <CodeBracketIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>;
      case 'release':
        return <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
          <FireIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>;
      default:
        return <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <ClockIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Repository Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <CodeBracketIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedRepository.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {selectedRepository.description || 'No description available'}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  {selectedRepository.language && (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">{selectedRepository.language}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    {selectedRepository.private ? (
                      <><LockClosedIcon className="w-4 h-4 text-amber-500" /><span className="text-amber-600 dark:text-amber-400">Private</span></>
                    ) : (
                      <><GlobeAltIcon className="w-4 h-4 text-green-500" /><span className="text-green-600 dark:text-green-400">Public</span></>
                    )}
                  </div>                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400">
                      Updated {new Date(selectedRepository.updated_at || selectedRepository.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <StarIcon className="w-4 h-4 mr-2" />
                Star
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <PlayIcon className="w-4 h-4 mr-2" />
                View Code
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Grid - 8 columns */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.name} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:scale-110 transition-transform duration-200">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-1">
                        {stat.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity - Large Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                    View all
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="text-2xl">{activity.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getActivityIcon(activity.type)}
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {activity.title}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          by {activity.author} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - 4 columns */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.title}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Repository Insights */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Repository Insights</h3>
              <div className="space-y-4">                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Size</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {/* Use a placeholder since size is not available in the Repository interface */}
                    N/A
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Forks</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {/* Use a placeholder since forks_count is not available */}
                    N/A
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <EyeIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Watchers</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {/* Use stargazers_count as a proxy for watchers */}
                    {selectedRepository.stargazers_count || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Features Teaser */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white">
              <div className="flex items-center space-x-2 mb-3">
                <SparklesIcon className="w-6 h-6" />
                <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
              </div>
              <p className="text-purple-100 text-sm mb-4">
                Unlock the power of AI to understand your codebase better with smart summaries and Q&A.
              </p>
              <button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 text-sm font-medium transition-colors">
                Explore AI Features
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
