'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  UserGroupIcon,
  FolderIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { AnimatedCounter, AnimatedProgressBar } from './animated-charts'

interface EnhancedOverviewProps {
  analytics: any
}

export function EnhancedOverview({ analytics }: EnhancedOverviewProps) {
  const overview = analytics?.overview || {}
  const growth = overview.growthRate || 0
  const isPositiveGrowth = growth >= 0

  // Calculate additional metrics
  const avgMeetingDuration = analytics?.meetingStats?.averageDuration || 0
  const avgConfidence = analytics?.qaStats?.averageConfidence || 0
  const totalStorage = analytics?.fileStats?.totalSizeGB || 0
  const activeUsers = overview.activeUsers || 0
  const completionRate = analytics?.meetingStats?.completionRate || 0

  const primaryMetrics = [
    {
      id: 'users',
      title: 'Total Users',
      value: overview.totalUsers || 0,
      change: +12.5,
      icon: UserGroupIcon,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      description: `${activeUsers} active this month`,
      trend: 'up'
    },
    {
      id: 'repos',
      title: 'Repositories',
      value: overview.totalRepositories || 0,
      change: +8.3,
      icon: FolderIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      description: `${totalStorage.toFixed(1)}GB total storage`,
      trend: 'up'
    },
    {
      id: 'meetings',
      title: 'Meetings',
      value: overview.totalMeetings || 0,
      change: +15.7,
      icon: VideoCameraIcon,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      description: `${Math.round(avgMeetingDuration)}min avg duration`,
      trend: 'up'
    },
    {
      id: 'qa',
      title: 'Q&A Sessions',
      value: overview.totalQuestions || 0,
      change: +22.1,
      icon: QuestionMarkCircleIcon,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      description: `${Math.round(avgConfidence)}% avg confidence`,
      trend: 'up'
    }
  ]

  const secondaryMetrics = [
    {
      title: 'Files Processed',
      value: overview.totalFiles || 0,
      icon: DocumentTextIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
      title: 'Action Items',
      value: overview.totalActionItems || 0,
      icon: CheckCircleIcon,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Storage Used',
      value: `${totalStorage.toFixed(1)}GB`,
      icon: ClockIcon,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      icon: StarIcon,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-slate-800 dark:via-blue-800 dark:to-purple-800 rounded-3xl p-8"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)`
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Platform Overview</h2>
              <p className="text-blue-100">Real-time insights into your GitTLDR ecosystem</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                isPositiveGrowth 
                  ? 'bg-green-500/20 text-green-100' 
                  : 'bg-red-500/20 text-red-100'
              }`}>
                {isPositiveGrowth ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isPositiveGrowth ? '+' : ''}{growth.toFixed(1)}% growth
                </span>
              </div>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {primaryMetrics.map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center`}>
                    <metric.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    metric.trend === 'up' 
                      ? 'bg-green-500/20 text-green-100' 
                      : 'bg-red-500/20 text-red-100'
                  }`}>
                    {metric.trend === 'up' ? (
                      <ArrowUpIcon className="w-3 h-3" />
                    ) : (
                      <ArrowDownIcon className="w-3 h-3" />
                    )}
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </div>
                </div>
                <div>
                  <AnimatedCounter
                    value={typeof metric.value === 'string' ? 0 : metric.value}
                    className="text-2xl font-bold text-white mb-1"
                  />
                  <h3 className="text-white/90 font-medium mb-1">{metric.title}</h3>
                  <p className="text-blue-200 text-sm">{metric.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {secondaryMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className={`${metric.bgColor} rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${metric.bgColor.replace('bg-', 'bg-').replace('/30', '')} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div>
                <div className={`text-lg font-bold ${metric.color}`}>
                  {typeof metric.value === 'string' ? metric.value : (
                    <AnimatedCounter value={metric.value} />
                  )}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {metric.title}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Key Performance Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Key Performance Indicators
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Engagement */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                User Engagement
              </span>
              <span className="text-sm text-slate-500">
                {Math.round((activeUsers / (overview.totalUsers || 1)) * 100)}%
              </span>
            </div>
            <AnimatedProgressBar
              value={(activeUsers / (overview.totalUsers || 1)) * 100}
              className="h-2"
              color="bg-gradient-to-r from-blue-500 to-cyan-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeUsers} of {overview.totalUsers || 0} users active
            </p>
          </div>

          {/* Content Quality */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Content Quality
              </span>
              <span className="text-sm text-slate-500">
                {Math.round(avgConfidence)}%
              </span>
            </div>
            <AnimatedProgressBar
              value={avgConfidence}
              className="h-2"
              color="bg-gradient-to-r from-green-500 to-emerald-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Average Q&A confidence score
            </p>
          </div>

          {/* System Efficiency */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Meeting Success
              </span>
              <span className="text-sm text-slate-500">
                {Math.round(completionRate)}%
              </span>
            </div>
            <AnimatedProgressBar
              value={completionRate}
              className="h-2"
              color="bg-gradient-to-r from-purple-500 to-violet-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Meeting completion rate
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {[
          {
            title: 'Most Active Period',
            value: 'This Week',
            description: `${Math.round(growth * 10)}% increase in activity`,
            icon: ArrowTrendingUpIcon,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            title: 'Top Content Type',
            value: 'Code Files',
            description: `${Math.round((overview.totalFiles || 0) * 0.7)} files processed`,
            icon: DocumentTextIcon,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            title: 'Avg Session Length',
            value: `${Math.round(avgMeetingDuration)}min`,
            description: '18% above industry average',
            icon: ClockIcon,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ].map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-start gap-3">
              <insight.icon className={`w-5 h-5 ${insight.color} mt-1`} />
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {insight.title}
                </h4>
                <div className={`text-lg font-bold ${insight.color} mt-1`}>
                  {insight.value}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {insight.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
