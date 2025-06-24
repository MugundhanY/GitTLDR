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
  SparklesIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  name: string;
  value: number;
  icon: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  trend: 'up' | 'down' | 'stable';
}

interface RecentActivity {
  id: string;
  type: 'commit' | 'issue' | 'pr' | 'release';
  title: string;
  author: string;
  email?: string;
  time: string;
  avatar: string;
  description: string;
  sha?: string;
  filesChanged?: number;
  hasAiSummary?: boolean;
  summaryStatus?: string;
  githubUsername?: string;
}

interface DashboardInsights {
  size: string;
  forks: number;
  watchers: number;
  files: number;
  lastActivity: string;
  language: string;
  topics: string[];
}

interface DashboardData {
  stats: DashboardStats[];
  recentActivity: RecentActivity[];
  insights: DashboardInsights;
  repository: {
    id: string;
    name: string;
    description?: string;
    url: string;
    processed: boolean;
    embeddingStatus: string;
  };
}

export default function DashboardPage() {
  const { selectedRepository, repositories, isLoading } = useRepository();
  // React Query: Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['dashboard', selectedRepository?.id],
    queryFn: async () => {
      if (!selectedRepository?.id) return null;
      const response = await fetch(`/api/dashboard/stats?repositoryId=${selectedRepository.id}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return await response.json();
    },
    enabled: !!selectedRepository?.id,
    staleTime: 1000 * 60 // 1 minute
  });

  if (isLoading || isDashboardLoading) {
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
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to GitTLDR</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first repository to get started with AI-powered insights and code analysis.
            </p>
            <Link 
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

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      StarIcon,
      ExclamationTriangleIcon,
      CodeBracketIcon,
      UsersIcon,
      ChartBarIcon,
      EyeIcon
    };
    return iconMap[iconName] || StarIcon;
  };

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
        {/* Enhanced Repository Header */}
        <div className="relative overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
          {/* Background Patterns */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-start space-x-8">
              {/* Repository Icon */}
              <div className="relative group">
                <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/70 dark:ring-gray-800/70 backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                  <CodeBracketIcon className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                
                {/* Processing Status Indicator */}
                {dashboardData?.repository.embeddingStatus && (
                  <div className={`absolute -bottom-3 -right-3 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-sm font-bold shadow-lg ${
                    dashboardData.repository.embeddingStatus === 'COMPLETED' 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                      : dashboardData.repository.embeddingStatus === 'PROCESSING'
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white animate-spin'
                      : dashboardData.repository.embeddingStatus === 'FAILED'
                      ? 'bg-gradient-to-br from-red-400 to-pink-500 text-white'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                  }`}>
                    {dashboardData.repository.embeddingStatus === 'COMPLETED' ? '✓' : 
                     dashboardData.repository.embeddingStatus === 'PROCESSING' ? '⟳' : 
                     dashboardData.repository.embeddingStatus === 'FAILED' ? '✗' : '○'}
                  </div>
                )}
              </div>
              
              <div className="flex-1 pt-2">
                {/* Repository Name and Description */}
                <div className="mb-6">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-3 leading-tight">
                    {selectedRepository.name}
                    {selectedRepository.private && (
                      <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                        <LockClosedIcon className="w-4 h-4 mr-1" />
                        Private
                      </span>
                    )}
                  </h1>
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl font-medium">
                    {selectedRepository.description || 'No description available for this repository'}
                  </p>
                </div>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4">
                  {selectedRepository.language && (
                    <div className="flex items-center space-x-3 px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedRepository.language}</span>
                    </div>
                  )}
                  
                  {!selectedRepository.private && (
                    <div className="flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm rounded-2xl border border-green-200/50 dark:border-green-700/50 shadow-sm">
                      <GlobeAltIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-green-700 dark:text-green-300">Public</span>
                    </div>
                  )}
                  
                  {(selectedRepository.stargazers_count || 0) > 0 && (
                    <div className="flex items-center space-x-3 px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{(selectedRepository.stargazers_count || 0).toLocaleString()} stars</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 px-4 py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Updated {new Date(selectedRepository.updated_at || selectedRepository.created_at || Date.now()).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: new Date(selectedRepository.updated_at || selectedRepository.created_at || Date.now()).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button className="group relative overflow-hidden px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:scale-105">
                <div className="relative flex items-center space-x-2">
                  <StarIcon className="w-5 h-5" />
                  <span className="font-semibold">Star</span>
                </div>
              </button>
              
              <Link 
                href={selectedRepository.html_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <div className="relative flex items-center space-x-2">
                  <PlayIcon className="w-5 h-5" />
                  <span className="font-semibold">View on GitHub</span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Processing Status Bar */}
          {dashboardData?.repository.embeddingStatus === 'PROCESSING' && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 backdrop-blur-sm rounded-2xl border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                <div className="flex-1">
                  <h3 className="text-blue-900 dark:text-blue-100 font-bold text-lg">AI Processing in Progress</h3>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    Our advanced AI is analyzing your repository structure, generating summaries, and creating intelligent embeddings. This typically takes 2-10 minutes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Grid - 8 columns */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {dashboardData?.stats.map((stat: any) => {
                const Icon = getIconComponent(stat.icon);
                return (
                  <div key={stat.name} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:scale-110 transition-transform duration-200">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-1">
                        {stat.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : stat.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        )}
                        <span className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 
                          stat.changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
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

            {/* Recent Activity Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  {dashboardError && (
                    <span className="text-sm text-amber-600 dark:text-amber-400">Using cached data</span>
                  )}
                  <button 
                    onClick={() => refetchDashboard()}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData?.recentActivity.length > 0 ? dashboardData.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.author} • {activity.time}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <ClockIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
                    </div>
                  )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Size</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{dashboardData?.insights.size}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Forks</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{dashboardData?.insights.forks}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <EyeIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Watchers</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{dashboardData?.insights.watchers}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Files</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{dashboardData?.insights.files}</span>
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
              <Link
                href="/qna"
                className="block w-full bg-white/20 hover:bg-white/30 text-white rounded-lg py-2 px-4 text-sm font-medium transition-colors text-center"
              >
                Explore AI Features
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
