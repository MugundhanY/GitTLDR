'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserGroupIcon,
  UserIcon,
  TrophyIcon,
  SparklesIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CodeBracketIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MapPinIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { AnimatedCounter, AnimatedProgressBar } from './animated-charts'
import { ActivityHeatmap } from './advanced-analytics-cards'

interface EnhancedUsersProps {
  analytics: any
}

export function EnhancedUsers({ analytics }: EnhancedUsersProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month')
  const [sortBy, setSortBy] = useState<'contributions' | 'activity' | 'impact'>('contributions')

  const userActivity = analytics?.userActivity || {}
  const overview = analytics?.overview || {}
  const topContributors = userActivity.topContributors || []
  const activeUsers = userActivity.activeUsers || []
  const totalUsers = overview.totalUsers || 0

  // Enhanced user metrics
  const userMetrics = {
    totalUsers,
    activeUsers: overview.activeUsers || Math.round(totalUsers * 0.68),
    newUsersThisMonth: Math.round(totalUsers * 0.12),
    retentionRate: 87,
    avgSessionDuration: 23, // minutes
    dailyActiveUsers: Math.round(totalUsers * 0.35),
    weeklyActiveUsers: Math.round(totalUsers * 0.55),
    monthlyActiveUsers: Math.round(totalUsers * 0.78)
  }

  const userSegments = [
    { 
      name: 'Power Users', 
      count: Math.round(totalUsers * 0.15), 
      description: 'Heavy daily usage',
      color: 'from-purple-500 to-indigo-600',
      icon: FireIcon,
      avgSessions: 8.5,
      retention: 98
    },
    { 
      name: 'Regular Users', 
      count: Math.round(totalUsers * 0.45), 
      description: 'Consistent weekly usage',
      color: 'from-blue-500 to-cyan-600',
      icon: StarIcon,
      avgSessions: 4.2,
      retention: 89
    },
    { 
      name: 'Casual Users', 
      count: Math.round(totalUsers * 0.25), 
      description: 'Occasional usage',
      color: 'from-green-500 to-emerald-600',
      icon: UserIcon,
      avgSessions: 2.1,
      retention: 72
    },
    { 
      name: 'New Users', 
      count: Math.round(totalUsers * 0.15), 
      description: 'Recently joined',
      color: 'from-yellow-500 to-orange-600',
      icon: SparklesIcon,
      avgSessions: 1.3,
      retention: 65
    }
  ]

  const userActivities = [
    { activity: 'Code Reviews', users: Math.round(totalUsers * 0.72), trend: 'up', change: 12 },
    { activity: 'Q&A Sessions', users: Math.round(totalUsers * 0.58), trend: 'up', change: 18 },
    { activity: 'File Uploads', users: Math.round(totalUsers * 0.84), trend: 'stable', change: 2 },
    { activity: 'Meeting Participation', users: Math.round(totalUsers * 0.43), trend: 'up', change: 8 },
    { activity: 'Documentation', users: Math.round(totalUsers * 0.35), trend: 'down', change: -5 }
  ]

  const teamInsights = [
    {
      title: 'High Collaboration',
      description: `${Math.round(totalUsers * 0.67)} users collaborate across multiple projects`,
      metric: '67% cross-team engagement',
      icon: UserGroupIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Knowledge Sharing',
      description: 'Strong Q&A participation with high-quality responses',
      metric: `${Math.round(totalUsers * 0.58)} active contributors`,
      icon: AcademicCapIcon,
      color: 'text-green-600'
    },
    {
      title: 'Code Quality Focus',
      description: 'Above-average code review participation',
      metric: '72% review participation',
      icon: CodeBracketIcon,
      color: 'text-purple-600'
    }
  ]

  const deviceUsage = [
    { device: 'Desktop', users: Math.round(totalUsers * 0.68), percentage: 68, icon: ComputerDesktopIcon },
    { device: 'Mobile', users: Math.round(totalUsers * 0.32), percentage: 32, icon: DevicePhoneMobileIcon }
  ]

  const geographicDistribution = [
    { region: 'North America', users: Math.round(totalUsers * 0.45), percentage: 45 },
    { region: 'Europe', users: Math.round(totalUsers * 0.28), percentage: 28 },
    { region: 'Asia Pacific', users: Math.round(totalUsers * 0.18), percentage: 18 },
    { region: 'Other', users: Math.round(totalUsers * 0.09), percentage: 9 }
  ]

  return (
    <div className="space-y-8">
      {/* Header with Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800 rounded-3xl p-8 text-white"
      >
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">User Analytics</h2>
          <p className="text-emerald-100">Comprehensive insights into user behavior and engagement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Users',
              value: userMetrics.totalUsers,
              subtitle: `${userMetrics.newUsersThisMonth} new this month`,
              icon: UserGroupIcon,
              trend: '+12%'
            },
            {
              title: 'Active Users',
              value: userMetrics.activeUsers,
              subtitle: `${Math.round((userMetrics.activeUsers / userMetrics.totalUsers) * 100)}% of total`,
              icon: BoltIcon,
              trend: '+8%'
            },
            {
              title: 'Retention Rate',
              value: `${userMetrics.retentionRate}%`,
              subtitle: 'monthly retention',
              icon: TrophyIcon,
              trend: '+3%'
            },
            {
              title: 'Avg Session',
              value: `${userMetrics.avgSessionDuration}min`,
              subtitle: 'session duration',
              icon: ClockIcon,
              trend: '+2min'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className="w-8 h-8 text-white" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {metric.trend}
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {typeof metric.value === 'number' ? (
                    <AnimatedCounter value={metric.value} />
                  ) : (
                    metric.value
                  )}
                </div>
                <h3 className="text-white/90 font-medium mb-1">{metric.title}</h3>
                <p className="text-emerald-200 text-sm">{metric.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* User Segments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {userSegments.map((segment, index) => (
          <motion.div
            key={segment.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-lg"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${segment.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <segment.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {segment.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {segment.description}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  <AnimatedCounter value={segment.count} />
                </span>
                <span className="text-sm text-slate-500">
                  {Math.round((segment.count / totalUsers) * 100)}%
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Avg Sessions</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {segment.avgSessions}/week
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Retention</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {segment.retention}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Activity Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* User Activities */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                User Activity Breakdown
              </h3>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1"
            >
              <option value="contributions">Sort by Users</option>
              <option value="activity">Sort by Activity</option>
              <option value="impact">Sort by Impact</option>
            </select>
          </div>

          <div className="space-y-4">
            {userActivities.map((activity, index) => (
              <motion.div
                key={activity.activity}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {activity.activity}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {activity.users} users
                    </div>
                    <div className="text-sm text-slate-500">
                      {Math.round((activity.users / totalUsers) * 100)}% participation
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    activity.trend === 'up' ? 'text-green-600' :
                    activity.trend === 'down' ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {activity.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="w-3 h-3" />
                    ) : activity.trend === 'down' ? (
                      <ArrowTrendingDownIcon className="w-3 h-3" />
                    ) : null}
                    {activity.change !== 0 && `${activity.change > 0 ? '+' : ''}${activity.change}%`}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrophyIcon className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top Contributors
            </h3>
          </div>

          <div className="space-y-4">
            {(topContributors.length > 0 ? topContributors : [
              { name: 'Alex Johnson', contributions: 156, type: 'Code Reviews' },
              { name: 'Sarah Chen', contributions: 134, type: 'Q&A' },
              { name: 'Mike Rodriguez', contributions: 128, type: 'Documentation' },
              { name: 'Emily Davis', contributions: 98, type: 'Meetings' },
              { name: 'David Kim', contributions: 87, type: 'File Management' }
            ]).slice(0, 5).map((contributor: any, index: number) => (
              <motion.div
                key={contributor.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-sm font-bold">
                  #{index + 1}
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {contributor.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {contributor.name || `User ${index + 1}`}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {contributor.type || 'General'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {contributor.contributions}
                  </div>
                  <div className="text-xs text-slate-500">contributions</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Usage Patterns */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Device Usage */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <ComputerDesktopIcon className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Device Usage
            </h3>
          </div>

          <div className="space-y-4">
            {deviceUsage.map((device, index) => (
              <motion.div
                key={device.device}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <device.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {device.device}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {device.users} users
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${device.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <span className="text-sm text-slate-500 min-w-0">
                    {device.percentage}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <GlobeAltIcon className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Geographic Distribution
            </h3>
          </div>

          <div className="space-y-3">
            {geographicDistribution.map((region, index) => (
              <motion.div
                key={region.region}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {region.region}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {region.users}
                  </div>
                  <div className="text-xs text-slate-500">
                    {region.percentage}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Team Insights */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Team Insights
            </h3>
          </div>

          <div className="space-y-4">
            {teamInsights.map((insight, index) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-200/50 dark:border-slate-600/50"
              >
                <div className="flex items-start gap-3">
                  <insight.icon className={`w-5 h-5 ${insight.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {insight.description}
                    </p>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      📊 {insight.metric}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              User Activity Heatmap
            </h3>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeframe(period as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedTimeframe === period
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ActivityHeatmap 
            data={Array.from({ length: 365 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              value: Math.floor(Math.random() * 20)
            }))}
          />
        </div>
      </motion.div>
    </div>
  )
}
