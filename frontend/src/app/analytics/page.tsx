'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  AnimatedCounter,
  AnimatedProgressBar,
  AnimatedBarChart,
  AnimatedDonutChart,
  AnimatedLineChart
} from '@/components/ui/animated-charts'
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
  FireIcon,
  SparklesIcon,
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

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedTab, setSelectedTab] = useState('overview')

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 5000, // Data is fresh for 5 seconds
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
              />
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold text-slate-900 dark:text-white mb-2"
              >
                Loading Analytics
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-500 dark:text-slate-400"
              >
                Gathering insights from your data...
              </motion.p>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Failed to Load Analytics
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                We encountered an error while fetching your analytics data. Please try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                Retry
              </button>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <ChartBarIcon className="w-8 h-8 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                    Analytics Dashboard
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Real-time insights and performance metrics
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4"
              >
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-300/50 dark:border-slate-600/50 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg shadow-black/5"
                >
                  {timeRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name}
                    </option>
                  ))}
                </select>
              </motion.div>
            </div>
            
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <nav className="flex space-x-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-2 overflow-x-auto">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`relative flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                      selectedTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {selectedTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-lg"
                        transition={{ type: "spring", duration: 0.5 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3">
                      <tab.icon className="w-5 h-5" />
                      {tab.name}
                    </div>
                  </motion.button>
                ))}
              </nav>
            </motion.div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && analytics && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* AI Insights */}
                {analytics?.insights && analytics.insights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-[1px]"
                  >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Insights</h2>
                          <p className="text-slate-600 dark:text-slate-400">Actionable recommendations from your data</p>
                        </div>
                      </div>
                      <div className="grid gap-4">
                        {analytics.insights.map((insight: any, index: number) => {
                          if (typeof insight === 'string') {
                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                className="flex items-start gap-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl"
                              >
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
                              </motion.div>
                            );
                          } else if (typeof insight === 'object' && insight !== null) {
                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                className="flex flex-col md:flex-row items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl"
                              >
                                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                                  <SparklesIcon className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {insight.icon && <span className="inline-block"><SparklesIcon className="w-5 h-5 text-blue-400" /></span>}
                                    <span className="font-semibold text-slate-900 dark:text-white">{insight.title || 'Insight'}</span>
                                    {insight.metric && <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">{insight.metric}</span>}
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 mb-1">{insight.description}</div>
                                  {insight.action && <div className="text-xs text-blue-500 dark:text-blue-300 italic mt-1">{insight.action}</div>}
                                </div>
                              </motion.div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* KPI Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <UserGroupIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalUsers || 0}
                          className="text-2xl font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Users</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                        <FolderIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalRepositories || 0}
                          className="text-2xl font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Repositories</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <VideoCameraIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalMeetings || 0}
                          className="text-2xl font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Meetings</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                        <QuestionMarkCircleIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalQuestions || 0}
                          className="text-2xl font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Questions</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/25">
                        <CheckCircleIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalActionItems || 0}
                          className="text-2xl font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Action Items</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* File Languages Chart */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <CodeBracketIcon className="w-6 h-6 text-blue-500" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">File Languages</h3>
                    </div>
                    <AnimatedDonutChart
                      data={analytics.fileStats.byLanguage.map((lang, index) => ({
                        label: lang.language,
                        value: lang.count,
                        color: [
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                          '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                        ][index % 10]
                      }))}
                      className="h-64"
                    />
                  </motion.div>

                  {/* Meeting Stats Chart */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <VideoCameraIcon className="w-6 h-6 text-purple-500" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Meeting Timeline</h3>
                    </div>
                    <AnimatedLineChart
                      data={analytics.meetingStats?.timeline?.map(item => ({
                        x: item.date,
                        y: item.count
                      })) || []}
                      className="h-64"
                    />
                  </motion.div>

                  {/* Q&A Categories */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <QuestionMarkCircleIcon className="w-6 h-6 text-green-500" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Q&A Categories</h3>
                    </div>
                    <AnimatedBarChart
                      data={analytics.qaStats?.categories?.map(cat => ({
                        label: cat.category,
                        value: cat.count
                      })) || []}
                      className="h-64"
                    />
                  </motion.div>

                  {/* Top Contributors */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <StarIcon className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top Contributors</h3>
                    </div>
                    <div className="space-y-4">
                      {analytics.userActivity?.topContributors?.slice(0, 5).map((contributor, index) => (
                        <motion.div
                          key={contributor.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {contributor.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white">{contributor.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{contributor.type}</p>
                          </div>
                          <div className="text-right">
                            <AnimatedCounter
                              value={contributor.contributions}
                              className="text-lg font-bold text-slate-900 dark:text-white"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">contributions</p>
                          </div>
                        </motion.div>
                      )) || (
                        <div className="text-center py-8">
                          <p className="text-slate-500 dark:text-slate-400">No contributor data available</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Performance Metrics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-3 mb-4">
                      <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
                      <h4 className="font-semibold text-slate-900 dark:text-white">Growth Rate</h4>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={analytics.overview?.growthRate || 0}
                        className="text-3xl font-bold text-green-600 dark:text-green-400"
                        suffix="%"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">vs last period</span>
                    </div>
                    <AnimatedProgressBar
                      value={Math.min(analytics.overview?.growthRate || 0, 100)}
                      className="mt-3"
                      color="from-green-500 to-emerald-500"
                    />
                  </div>

                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-3 mb-4">
                      <FireIcon className="w-6 h-6 text-orange-500" />
                      <h4 className="font-semibold text-slate-900 dark:text-white">Active Users</h4>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={analytics.overview?.activeUsers || 0}
                        className="text-3xl font-bold text-orange-600 dark:text-orange-400"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">this period</span>
                    </div>
                    <AnimatedProgressBar
                      value={(analytics.overview?.activeUsers || 0) / (analytics.overview?.totalUsers || 1) * 100}
                      className="mt-3"
                      color="from-orange-500 to-red-500"
                    />
                  </div>

                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-3 mb-4">
                      <ComputerDesktopIcon className="w-6 h-6 text-blue-500" />
                      <h4 className="font-semibold text-slate-900 dark:text-white">Storage Used</h4>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={analytics.overview?.totalStorageGB || 0}
                        className="text-3xl font-bold text-blue-600 dark:text-blue-400"
                        suffix=" GB"
                        decimals={1}
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">total</span>
                    </div>
                    <AnimatedProgressBar
                      value={Math.min(((analytics.overview?.totalStorageGB || 0) / 100) * 100, 100)}
                      className="mt-3"
                      color="from-blue-500 to-cyan-500"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {selectedTab === 'overview' && !analytics && !isLoading && !error && (
              <motion.div
                key="no-data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center shadow-xl shadow-black/5"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ChartBarIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  No Analytics Data Available
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  Start using the platform to generate meaningful analytics and insights.
                </p>
              </motion.div>
            )}

            {/* Files Analytics Tab */}
            {selectedTab === 'files' && analytics && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* File Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 p-6 shadow-xl shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalFiles || 0}
                          className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                        />
                        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Total Files</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 p-6 shadow-xl shadow-green-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <CodeBracketIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.fileStats?.byLanguage?.length || 0}
                          className="text-2xl font-bold text-green-600 dark:text-green-400"
                        />
                        <p className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Languages</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 p-6 shadow-xl shadow-purple-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.fileStats?.byType?.length || 0}
                          className="text-2xl font-bold text-purple-600 dark:text-purple-400"
                        />
                        <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">File Types</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50 p-6 shadow-xl shadow-orange-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <ComputerDesktopIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.fileStats?.totalSizeGB || 0}
                          decimals={2}
                          suffix=" GB"
                          className="text-2xl font-bold text-orange-600 dark:text-orange-400"
                        />
                        <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium">Total Size</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Languages and Types Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <CodeBracketIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Programming Languages</h3>
                    </div>
                    {analytics.fileStats?.byLanguage && analytics.fileStats.byLanguage.length > 0 ? (
                      <AnimatedDonutChart
                        data={analytics.fileStats.byLanguage.map((lang, index) => ({
                          label: lang.language,
                          value: lang.count,
                          color: [
                            '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                          ][index % 10]
                        }))}
                        className="h-64"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No language data available
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <FolderIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">File Types</h3>
                    </div>
                    {analytics.fileStats?.byType && analytics.fileStats.byType.length > 0 ? (
                      <AnimatedBarChart
                        data={analytics.fileStats.byType.slice(0, 8).map((type, index) => ({
                          label: type.type,
                          value: type.count,
                          color: [
                            '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
                            '#EC4899', '#06B6D4', '#84CC16'
                          ][index % 8]
                        }))}
                        className="h-64"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No file type data available
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Language Details Table */}
                {analytics.fileStats?.byLanguage && analytics.fileStats.byLanguage.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Language Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Language</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-white">Files</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-white">Size (GB)</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-white">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.fileStats.byLanguage.map((lang, index) => {
                            const totalFiles = analytics.fileStats?.byLanguage?.reduce((sum, l) => sum + l.count, 0) || 1;
                            const percentage = (lang.count / totalFiles) * 100;
                            return (
                              <motion.tr
                                key={lang.language}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full`} style={{
                                      backgroundColor: [
                                        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                                        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
                                      ][index % 10]
                                    }} />
                                    <span className="font-medium text-slate-900 dark:text-white">{lang.language}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{lang.count}</td>
                                <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{lang.sizeGB.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-slate-600 dark:text-slate-400">{percentage.toFixed(1)}%</span>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Meetings Analytics Tab */}
            {selectedTab === 'meetings' && analytics && (
              <motion.div
                key="meetings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Meeting KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 p-6 shadow-xl shadow-purple-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                        <VideoCameraIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalMeetings || 0}
                          className="text-2xl font-bold text-purple-600 dark:text-purple-400"
                        />
                        <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">Total Meetings</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 p-6 shadow-xl shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.meetingStats?.averageDuration || 0}
                          className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                          suffix="m"
                        />
                        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Avg Duration</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 p-6 shadow-xl shadow-green-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.meetingStats?.completionRate || 0}
                          className="text-2xl font-bold text-green-600 dark:text-green-400"
                          suffix="%"
                          decimals={1}
                        />
                        <p className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Completion Rate</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50 p-6 shadow-xl shadow-orange-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <FireIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={Math.floor((analytics.meetingStats?.totalDuration || 0) / 60)}
                          className="text-2xl font-bold text-orange-600 dark:text-orange-400"
                          suffix="h"
                        />
                        <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium">Total Hours</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Meeting Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <VideoCameraIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Meeting Status</h3>
                    </div>
                    {analytics.meetingStats?.statusBreakdown && analytics.meetingStats.statusBreakdown.length > 0 ? (
                      <AnimatedDonutChart
                        data={analytics.meetingStats.statusBreakdown.map((status, index) => ({
                          label: status.status,
                          value: status.count,
                          color: ['#10B981', '#F59E0B', '#EF4444'][index % 3]
                        }))}
                        className="h-64"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No meeting data available
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Meeting Timeline</h3>
                    </div>
                    {analytics.meetingStats?.timeline && analytics.meetingStats.timeline.length > 0 ? (
                      <AnimatedLineChart
                        data={analytics.meetingStats.timeline.map(item => ({
                          x: new Date(item.date).toLocaleDateString(),
                          y: item.count
                        }))}
                        className="h-64"
                        color="#3B82F6"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No timeline data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Q&A Analytics Tab */}
            {selectedTab === 'qa' && analytics && (
              <motion.div
                key="qa"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Q&A KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50 p-6 shadow-xl shadow-orange-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <QuestionMarkCircleIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.qaStats?.total || 0}
                          className="text-2xl font-bold text-orange-600 dark:text-orange-400"
                        />
                        <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium">Total Questions</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 p-6 shadow-xl shadow-green-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <StarIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={(analytics.qaStats?.averageConfidence || 0) * 100}
                          className="text-2xl font-bold text-green-600 dark:text-green-400"
                          suffix="%"
                          decimals={1}
                        />
                        <p className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Avg Confidence</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 p-6 shadow-xl shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <ChatBubbleLeftIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.qaStats?.categories?.length || 0}
                          className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                        />
                        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Categories</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 p-6 shadow-xl shadow-purple-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                        <BoltIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.qaStats?.timeline?.reduce((sum, item) => sum + item.questions, 0) || 0}
                          className="text-2xl font-bold text-purple-600 dark:text-purple-400"
                        />
                        <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">This Period</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Q&A Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <ChatBubbleLeftIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Question Categories</h3>
                    </div>
                    {analytics.qaStats?.categories && analytics.qaStats.categories.length > 0 ? (
                      <AnimatedDonutChart
                        data={analytics.qaStats.categories.map((cat, index) => ({
                          label: cat.category,
                          value: cat.count,
                          color: [
                            '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
                            '#EC4899', '#06B6D4', '#84CC16'
                          ][index % 8]
                        }))}
                        className="h-64"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No category data available
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Question Timeline</h3>
                    </div>
                    {analytics.qaStats?.timeline && analytics.qaStats.timeline.length > 0 ? (
                      <AnimatedLineChart
                        data={analytics.qaStats.timeline.map(item => ({
                          x: new Date(item.date).toLocaleDateString(),
                          y: item.questions
                        }))}
                        className="h-64"
                        color="#10B981"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No timeline data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Users Analytics Tab */}
            {selectedTab === 'users' && analytics && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* User KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 p-6 shadow-xl shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <UserGroupIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.totalUsers || 0}
                          className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                        />
                        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">Total Users</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 p-6 shadow-xl shadow-green-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <FireIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.activeUsers || 0}
                          className="text-2xl font-bold text-green-600 dark:text-green-400"
                        />
                        <p className="text-sm text-green-600/70 dark:text-green-400/70 font-medium">Active Users</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 p-6 shadow-xl shadow-purple-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                        <UsersIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.userActivity?.topContributors?.length || 0}
                          className="text-2xl font-bold text-purple-600 dark:text-purple-400"
                        />
                        <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium">Contributors</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50 p-6 shadow-xl shadow-orange-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <AnimatedCounter
                          value={analytics.overview?.growthRate || 0}
                          className="text-2xl font-bold text-orange-600 dark:text-orange-400"
                          suffix="%"
                          decimals={1}
                        />
                        <p className="text-sm text-orange-600/70 dark:text-orange-400/70 font-medium">Growth Rate</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* User Activity Chart and Top Contributors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">User Activity</h3>
                    </div>
                    {analytics.userActivity?.activeUsers && analytics.userActivity.activeUsers.length > 0 ? (
                      <AnimatedLineChart
                        data={analytics.userActivity.activeUsers.map(item => ({
                          x: new Date(item.date).toLocaleDateString(),
                          y: item.count
                        }))}
                        className="h-64"
                        color="#8B5CF6"
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No activity data available
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl shadow-black/5"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <StarIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top Contributors</h3>
                    </div>
                    {analytics.userActivity?.topContributors && analytics.userActivity.topContributors.length > 0 ? (
                      <div className="space-y-4">
                        {analytics.userActivity.topContributors.slice(0, 8).map((contributor, index) => (
                          <motion.div
                            key={contributor.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                          >
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {contributor.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">{contributor.name}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{contributor.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900 dark:text-white">{contributor.contributions}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">contributions</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        No contributor data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Fallback for empty analytics */}
            {selectedTab !== 'overview' && !analytics && (
              <motion.div
                key="no-data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center shadow-xl shadow-black/5"
              >
                {tabs.find(tab => tab.id === selectedTab)?.icon && (
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {React.createElement(tabs.find(tab => tab.id === selectedTab)!.icon, {
                      className: "w-8 h-8 text-white"
                    })}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  No Data Available
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  Start using the platform to see {tabs.find(tab => tab.id === selectedTab)?.name.toLowerCase()} analytics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  )
}
