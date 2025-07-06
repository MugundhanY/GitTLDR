'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  ChartBarIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  CodeBracketIcon,
  CpuChipIcon,
  BoltIcon,
  BeakerIcon,
  ChartPieIcon,
  Bars3BottomLeftIcon,
  ListBulletIcon,
  MapIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  WifiIcon,
  SignalIcon,
  ShieldCheckIcon,
  StarIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  ArchiveBoxIcon,
  CloudIcon,
  ServerIcon,
  DatabaseIcon,
  CogIcon,
  BellIcon,
  FireIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalRepositories: number
    totalMeetings: number
    totalQuestions: number
    totalActionItems: number
    totalFiles: number
    totalStorageGB: number
    growthRate: number
    activeUsers: number
  }
  meetingStats: {
    totalDuration: number
    averageDuration: number
    completionRate: number
    statusBreakdown: Array<{ status: string; count: number; percentage: number }>
    timeline: Array<{ date: string; count: number; duration: number }>
  }
  fileStats: {
    byLanguage: Array<{ language: string; count: number; sizeGB: number }>
    byType: Array<{ type: string; count: number; sizeGB: number }>
    totalSizeGB: number
  }
  qaStats: {
    total: number
    averageConfidence: number
    categories: Array<{ category: string; count: number; avgConfidence: number }>
    timeline: Array<{ date: string; questions: number; avgConfidence: number }>
  }
  userActivity: {
    topContributors: Array<{ name: string; contributions: number; type: string }>
    activeUsers: Array<{ date: string; count: number }>
  }
  insights: string[]
}

// Professional metric card component inspired by Linear
const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }: {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  subtitle?: string
}) => (
  <motion.div
    whileHover={{ scale: 1.02, translateY: -2 }}
    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all duration-200"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-xl ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          change >= 0 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {change >= 0 ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  </motion.div>
)

// Professional section with clean design
const Section = ({ title, children, action }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {action}
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [insights, setInsights] = useState<string[]>([])

  const { data: analytics, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      return response.json()
    },
    refetchInterval: 30000,
    staleTime: 5000,
  })

  // Fetch AI insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!analytics) return
      try {
        const response = await fetch('/api/generate-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analytics, timeRange })
        })
        if (response.ok) {
          const data = await response.json()
          setInsights(data.insights || [])
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error)
      }
    }

    fetchInsights()
  }, [analytics, timeRange])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'activity', name: 'Activity', icon: BoltIcon },
    { id: 'performance', name: 'Performance', icon: CpuChipIcon },
    { id: 'insights', name: 'Insights', icon: LightBulbIcon }
  ]

  const timeRanges = [
    { id: '7d', name: '7 days' },
    { id: '30d', name: '30 days' },
    { id: '90d', name: '90 days' },
    { id: '1y', name: '1 year' }
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There was an error loading your analytics data.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Modern Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Track your team&apos;s productivity and project insights
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {timeRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => refetch()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Clean Tab Navigation */}
            <div className="mt-8">
              <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      selectedTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && analytics && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Users"
                    value={formatNumber(analytics.overview?.totalUsers || 0)}
                    change={calculateGrowth(analytics.overview?.totalUsers || 0, 150)}
                    icon={UserGroupIcon}
                    color="bg-blue-500"
                    subtitle="Active team members"
                  />
                  <MetricCard
                    title="Repositories"
                    value={formatNumber(analytics.overview?.totalRepositories || 0)}
                    change={calculateGrowth(analytics.overview?.totalRepositories || 0, 8)}
                    icon={FolderIcon}
                    color="bg-green-500"
                    subtitle="Code repositories"
                  />
                  <MetricCard
                    title="Meetings"
                    value={formatNumber(analytics.overview?.totalMeetings || 0)}
                    change={calculateGrowth(analytics.overview?.totalMeetings || 0, 25)}
                    icon={VideoCameraIcon}
                    color="bg-purple-500"
                    subtitle="Total meetings held"
                  />
                  <MetricCard
                    title="Q&A Sessions"
                    value={formatNumber(analytics.overview?.totalQuestions || 0)}
                    change={calculateGrowth(analytics.overview?.totalQuestions || 0, 45)}
                    icon={QuestionMarkCircleIcon}
                    color="bg-orange-500"
                    subtitle="Questions answered"
                  />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Section title="Activity Overview">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Files Processed</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatBytes((analytics.overview?.totalStorageGB || 0) * 1024 * 1024 * 1024)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {formatNumber(analytics.overview?.totalFiles || 0)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">files</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <BoltIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Action Items</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Generated from meetings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {formatNumber(analytics.overview?.totalActionItems || 0)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">items</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Meeting Time</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Avg {Math.round((analytics.meetingStats?.averageDuration || 0) / 60)} min per meeting
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {Math.round((analytics.meetingStats?.totalDuration || 0) / 60)}h
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">total</p>
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section title="AI Insights" action={
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
                    </div>
                  }>
                    <div className="space-y-3">
                      {insights.length > 0 ? insights.slice(0, 5).map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                          <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-md mt-0.5">
                            <LightBulbIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {insight}
                          </p>
                        </div>
                      )) : (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Generating AI insights...</p>
                        </div>
                      )}
                    </div>
                  </Section>
                </div>

                {/* Repository and Language Stats */}
                <Section title="Code Analysis">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Languages</h4>
                      <div className="space-y-2">
                        {analytics.fileStats?.byLanguage?.slice(0, 5).map((lang, index) => (
                          <div key={lang.language} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" style={{
                                backgroundColor: ['#3178c6', '#f7df1e', '#e34c26', '#563d7c', '#89e051'][index] || '#6b7280'
                              }}></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{lang.language}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatNumber(lang.count)} files
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">File Types</h4>
                      <div className="space-y-2">
                        {analytics.fileStats?.byType?.slice(0, 5).map((type, index) => (
                          <div key={type.type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" style={{
                                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index] || '#6b7280'
                              }}></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{type.type}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatNumber(type.count)} files
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* Activity Tab */}
            {selectedTab === 'activity' && analytics && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Section title="Team Activity">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">Top Contributors</h4>
                      <div className="space-y-3">
                        {analytics.userActivity?.topContributors?.slice(0, 5).map((contributor, index) => (
                          <div key={contributor.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {contributor.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{contributor.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{contributor.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">{contributor.contributions}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">contributions</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">Meeting Status</h4>
                      <div className="space-y-3">
                        {analytics.meetingStats?.statusBreakdown?.map((status) => (
                          <div key={status.status} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                status.status === 'completed' ? 'bg-green-500' :
                                status.status === 'in_progress' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {status.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">{status.count}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{status.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* Performance Tab */}
            {selectedTab === 'performance' && analytics && (
              <motion.div
                key="performance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Meeting Completion"
                    value={`${Math.round(analytics.meetingStats?.completionRate || 0)}%`}
                    change={5}
                    icon={CheckCircleIcon}
                    color="bg-green-500"
                    subtitle="Success rate"
                  />
                  <MetricCard
                    title="Q&A Confidence"
                    value={`${Math.round((analytics.qaStats?.averageConfidence || 0) * 100)}%`}
                    change={8}
                    icon={StarIcon}
                    color="bg-yellow-500"
                    subtitle="Answer quality"
                  />
                  <MetricCard
                    title="Storage Used"
                    value={formatBytes((analytics.overview?.totalStorageGB || 0) * 1024 * 1024 * 1024)}
                    change={-2}
                    icon={DatabaseIcon}
                    color="bg-blue-500"
                    subtitle="Data storage"
                  />
                </div>

                <Section title="System Performance">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Q&A Categories</h4>
                      {analytics.qaStats?.categories?.slice(0, 4).map((category) => (
                        <div key={category.category} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{category.category}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {Math.round(category.avgConfidence * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${category.avgConfidence * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Storage Breakdown</h4>
                      {analytics.fileStats?.byLanguage?.slice(0, 4).map((lang, index) => (
                        <div key={lang.language} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{lang.language}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatBytes(lang.sizeGB * 1024 * 1024 * 1024)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${(lang.sizeGB / (analytics.fileStats?.totalSizeGB || 1)) * 100}%`,
                                backgroundColor: ['#3178c6', '#f7df1e', '#e34c26', '#563d7c'][index] || '#6b7280'
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* Insights Tab */}
            {selectedTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Section title="AI-Powered Insights">
                  <div className="space-y-4">
                    {insights.length > 0 ? insights.map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20"
                      >
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <LightBulbIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {insight}
                          </p>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BeakerIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Generating Insights
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Our AI is analyzing your data to provide actionable insights.
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="Recommendations">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <RocketLaunchIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h4 className="font-medium text-green-900 dark:text-green-100">Boost Productivity</h4>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Schedule more regular check-ins to improve team coordination and project velocity.
                      </p>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <FireIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Optimize Meetings</h4>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Consider shorter meeting durations to maintain engagement and productivity.
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <CodeBracketIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h4 className="font-medium text-purple-900 dark:text-purple-100">Code Quality</h4>
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Increase documentation coverage in your most active repositories.
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Knowledge Sharing</h4>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Create more Q&A sessions to improve knowledge transfer across the team.
                      </p>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  )
}
