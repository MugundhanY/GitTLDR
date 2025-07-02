'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  EyeIcon,
  HeartIcon,
  StarIcon,
  FolderIcon,
  CodeBracketIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  UsersIcon,
  BoltIcon,
  FireIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  overview: {
    totalFiles: number
    totalMeetings: number
    totalQuestions: number
    totalUsers: number
    totalStorage: number
    processingTime: number
  }
  fileStats: {
    byLanguage: Array<{ language: string; count: number; percentage: number }>
    byType: Array<{ type: string; count: number; size: number }>
    recentActivity: Array<{ file: string; action: string; date: string; user: string }>
  }
  meetingStats: {
    totalDuration: number
    averageDuration: number
    completionRate: number
    byStatus: Array<{ status: string; count: number; percentage: number }>
    popularTopics: Array<{ topic: string; count: number }>
    timeline: Array<{ date: string; count: number; duration: number }>
  }
  qaStats: {
    totalAnswered: number
    averageResponseTime: number
    satisfaction: number
    categories: Array<{ category: string; count: number; avgRating: number }>
    trends: Array<{ date: string; questions: number; answers: number }>
  }
  userActivity: {
    activeUsers: number
    topContributors: Array<{ name: string; contributions: number; type: string }>
    activityHeatmap: Array<{ date: string; activity: number }>
  }
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedTab, setSelectedTab] = useState('overview')

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        overview: {
          totalFiles: 1247,
          totalMeetings: 89,
          totalQuestions: 234,
          totalUsers: 12,
          totalStorage: 2.4,
          processingTime: 145.6
        },
        fileStats: {
          byLanguage: [
            { language: 'TypeScript', count: 487, percentage: 39.1 },
            { language: 'JavaScript', count: 312, percentage: 25.0 },
            { language: 'Python', count: 198, percentage: 15.9 },
            { language: 'CSS', count: 156, percentage: 12.5 },
            { language: 'JSON', count: 94, percentage: 7.5 }
          ],
          byType: [
            { type: 'Source Code', count: 890, size: 1.8 },
            { type: 'Documentation', count: 234, size: 0.4 },
            { type: 'Configuration', count: 89, size: 0.1 },
            { type: 'Assets', count: 34, size: 0.1 }
          ],
          recentActivity: [
            { file: 'src/components/Header.tsx', action: 'Modified', date: '2025-07-02', user: 'John Doe' },
            { file: 'README.md', action: 'Created', date: '2025-07-01', user: 'Jane Smith' },
            { file: 'package.json', action: 'Modified', date: '2025-06-30', user: 'Bob Wilson' }
          ]
        },
        meetingStats: {
          totalDuration: 2847.5,
          averageDuration: 32.0,
          completionRate: 94.4,
          byStatus: [
            { status: 'Completed', count: 84, percentage: 94.4 },
            { status: 'Processing', count: 3, percentage: 3.4 },
            { status: 'Failed', count: 2, percentage: 2.2 }
          ],
          popularTopics: [
            { topic: 'Project Planning', count: 23 },
            { topic: 'Code Review', count: 18 },
            { topic: 'Team Sync', count: 15 },
            { topic: 'Technical Discussion', count: 12 }
          ],
          timeline: [
            { date: '2025-06-01', count: 12, duration: 384 },
            { date: '2025-06-08', count: 15, duration: 480 },
            { date: '2025-06-15', count: 18, duration: 576 },
            { date: '2025-06-22', count: 21, duration: 672 },
            { date: '2025-06-29', count: 23, duration: 735 }
          ]
        },
        qaStats: {
          totalAnswered: 198,
          averageResponseTime: 2.4,
          satisfaction: 4.6,
          categories: [
            { category: 'Code Help', count: 78, avgRating: 4.7 },
            { category: 'Documentation', count: 45, avgRating: 4.5 },
            { category: 'Bug Reports', count: 34, avgRating: 4.4 },
            { category: 'Feature Requests', count: 41, avgRating: 4.8 }
          ],
          trends: [
            { date: '2025-06-01', questions: 8, answers: 7 },
            { date: '2025-06-08', questions: 12, answers: 11 },
            { date: '2025-06-15', questions: 15, answers: 14 },
            { date: '2025-06-22', questions: 18, answers: 16 },
            { date: '2025-06-29', questions: 21, answers: 19 }
          ]
        },
        userActivity: {
          activeUsers: 8,
          topContributors: [
            { name: 'John Doe', contributions: 156, type: 'Code Commits' },
            { name: 'Jane Smith', contributions: 89, type: 'Meeting Notes' },
            { name: 'Bob Wilson', contributions: 67, type: 'Q&A Responses' }
          ],
          activityHeatmap: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            activity: Math.floor(Math.random() * 10) + 1
          }))
        }
      }
    }
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'files', name: 'Files', icon: DocumentTextIcon },
    { id: 'meetings', name: 'Meetings', icon: VideoCameraIcon },
    { id: 'qa', name: 'Q&A', icon: QuestionMarkCircleIcon },
    { id: 'users', name: 'Users', icon: UserGroupIcon }
  ]

  const timeRanges = [
    { id: '7d', name: '7 Days' },
    { id: '30d', name: '30 Days' },
    { id: '90d', name: '90 Days' },
    { id: '1y', name: '1 Year' }
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                  <p className="text-slate-600 dark:text-slate-400">Insights and performance metrics</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timeRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="mt-6">
              <nav className="flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      selectedTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Overview Tab */}
          {selectedTab === 'overview' && analytics && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                      <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalFiles.toLocaleString()}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Files</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                      <VideoCameraIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalMeetings}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Meetings</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                      <QuestionMarkCircleIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalQuestions}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Questions</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                      <UserGroupIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalUsers}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Users</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/20 rounded-xl flex items-center justify-center">
                      <ComputerDesktopIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.totalStorage.toFixed(1)} GB</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Storage</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 rounded-xl flex items-center justify-center">
                      <BoltIcon className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.overview.processingTime.toFixed(1)}s</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Avg Processing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Types */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">File Types</h2>
                  <div className="space-y-4">
                    {analytics.fileStats.byType.map((type, index) => (
                      <div key={type.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                          }`} />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{type.type}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{type.count}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{type.size.toFixed(1)} GB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Programming Languages */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Programming Languages</h2>
                  <div className="space-y-4">
                    {analytics.fileStats.byLanguage.map((lang, index) => (
                      <div key={lang.language} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lang.language}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{lang.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-blue-500' :
                              index === 1 ? 'bg-yellow-500' :
                              index === 2 ? 'bg-green-500' :
                              index === 3 ? 'bg-pink-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {analytics.fileStats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.file}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {activity.action} by {activity.user} • {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other tabs would go here with similar structure */}
          {selectedTab !== 'overview' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <ChartBarIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {tabs.find(tab => tab.id === selectedTab)?.name} Analytics
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Detailed {selectedTab} analytics coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
