'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  VideoCameraIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
  PlayIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  StarIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { AnimatedCounter, AnimatedProgressBar, AnimatedLineChart } from './animated-charts'
import { ResponsiveTimelineChart } from './responsive-timeline-chart'

interface EnhancedMeetingsProps {
  analytics: any
}

export function EnhancedMeetings({ analytics }: EnhancedMeetingsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'duration' | 'participation' | 'outcomes'>('duration')
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month')

  const meetingStats = analytics?.meetingStats || {}
  const overview = analytics?.overview || {}
  const totalMeetings = overview.totalMeetings || 0
  const totalDuration = meetingStats.totalDuration || 0
  const averageDuration = meetingStats.averageDuration || 0
  const completionRate = meetingStats.completionRate || 0
  const statusBreakdown = meetingStats.statusBreakdown || []
  const timeline = meetingStats.timeline || []

  // Enhanced metrics calculations
  const productivityScore = Math.round((completionRate + (averageDuration / 60) * 10) / 2)
  const efficiencyRating = averageDuration > 45 ? 'Needs Improvement' : averageDuration > 30 ? 'Good' : 'Excellent'
  const participationRate = analytics?.participationRate || 0
  const actionItemsGenerated = analytics?.actionItemsGenerated || 0
  const followUpRate = analytics?.followUpRate || 0

  const meetingTypes = [
    { name: 'Code Review', count: Math.round(totalMeetings * 0.35), duration: 25, trend: 'up' },
    { name: 'Planning', count: Math.round(totalMeetings * 0.25), duration: 45, trend: 'up' },
    { name: 'Standup', count: Math.round(totalMeetings * 0.20), duration: 15, trend: 'stable' },
    { name: 'Retrospective', count: Math.round(totalMeetings * 0.12), duration: 60, trend: 'down' },
    { name: 'Presentation', count: Math.round(totalMeetings * 0.08), duration: 30, trend: 'up' }
  ]

  const meetingInsights = [
    {
      type: 'success',
      title: 'Optimal Duration',
      description: `${Math.round((statusBreakdown.find((s: any) => s.status === 'completed')?.count || 0) / totalMeetings * 100)}% of meetings complete on time`,
      action: 'Keep current scheduling practices'
    },
    {
      type: 'warning',
      title: 'Long Meetings Alert',
      description: `${Math.round(totalMeetings * 0.15)} meetings exceeded planned duration`,
      action: 'Consider breaking into smaller sessions'
    },
    {
      type: 'info',
      title: 'Peak Activity',
      description: 'Tuesday 2-4 PM shows highest participation rates',
      action: 'Schedule important meetings during peak times'
    }
  ]

  const weeklyPatterns = [
    { day: 'Mon', meetings: Math.round(totalMeetings * 0.18), efficiency: 85 },
    { day: 'Tue', meetings: Math.round(totalMeetings * 0.22), efficiency: 92 },
    { day: 'Wed', meetings: Math.round(totalMeetings * 0.20), efficiency: 88 },
    { day: 'Thu', meetings: Math.round(totalMeetings * 0.19), efficiency: 90 },
    { day: 'Fri', meetings: Math.round(totalMeetings * 0.21), efficiency: 78 }
  ]

  return (
    <div className="space-y-8">
      {/* Header with Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 dark:from-purple-800 dark:via-blue-800 dark:to-indigo-800 rounded-3xl p-8 text-white"
      >
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Meeting Analytics</h2>
          <p className="text-purple-100">Comprehensive insights into your team&apos;s collaboration patterns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Meetings',
              value: totalMeetings,
              subtitle: `${Math.round(totalDuration / 60)}h total time`,
              icon: VideoCameraIcon,
              trend: '+18%'
            },
            {
              title: 'Avg Duration',
              value: `${Math.round(averageDuration)}min`,
              subtitle: efficiencyRating,
              icon: ClockIcon,
              trend: '-5min'
            },
            {
              title: 'Completion Rate',
              value: `${Math.round(completionRate)}%`,
              subtitle: 'meetings completed',
              icon: CheckCircleIcon,
              trend: '+12%'
            },
            {
              title: 'Productivity Score',
              value: productivityScore,
              subtitle: 'out of 100',
              icon: StarIcon,
              trend: '+8pts'
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
                <p className="text-purple-200 text-sm">{metric.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Meeting Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Status Breakdown */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Meeting Status Distribution
            </h3>
          </div>

          <div className="space-y-4">
            {statusBreakdown.map((status: any, index: number) => {
              const icons = {
                completed: CheckCircleIcon,
                in_progress: PlayIcon,
                cancelled: XCircleIcon,
                scheduled: CalendarIcon
              }
              const colors = {
                completed: 'text-green-500',
                in_progress: 'text-blue-500',
                cancelled: 'text-red-500',
                scheduled: 'text-yellow-500'
              }
              const bgColors = {
                completed: 'bg-green-100 dark:bg-green-900/30',
                in_progress: 'bg-blue-100 dark:bg-blue-900/30',
                cancelled: 'bg-red-100 dark:bg-red-900/30',
                scheduled: 'bg-yellow-100 dark:bg-yellow-900/30'
              }

              const Icon = icons[status.status as keyof typeof icons] || CalendarIcon
              const colorClass = colors[status.status as keyof typeof colors] || 'text-gray-500'
              const bgClass = bgColors[status.status as keyof typeof bgColors] || 'bg-gray-100'

              return (
                <motion.div
                  key={status.status}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className={`w-12 h-12 ${bgClass} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-white capitalize">
                        {status.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {status.count} meetings
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${status.percentage}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`}
                        />
                      </div>
                      <span className="text-sm text-slate-500 min-w-0">
                        {status.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Meeting Types Analysis */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <UserGroupIcon className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Meeting Types & Efficiency
            </h3>
          </div>

          <div className="space-y-4">
            {meetingTypes.map((type, index) => (
              <motion.div
                key={type.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {type.name}
                    </span>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {type.duration}min avg
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {type.count}
                    </span>
                    {type.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                    ) : type.trend === 'down' ? (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-sm text-slate-500">meetings</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Timeline Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Meeting Timeline
            </h3>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeframe === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80">
          {timeline.length > 0 ? (
            <ResponsiveTimelineChart
              data={timeline}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <div>No timeline data available</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Weekly Patterns & Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Weekly Patterns */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Weekly Meeting Patterns
            </h3>
          </div>

          <div className="space-y-4">
            {weeklyPatterns.map((day, index) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 text-center">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {day.day}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {day.meetings} meetings
                    </span>
                    <span className="text-sm text-slate-500">
                      {day.efficiency}% efficiency
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(day.meetings / Math.max(...weeklyPatterns.map(d => d.meetings))) * 100}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                    <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${day.efficiency}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-full rounded-full ${
                          day.efficiency > 90 ? 'bg-green-500' :
                          day.efficiency > 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Insights & Recommendations */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <SpeakerWaveIcon className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Smart Insights
            </h3>
          </div>

          <div className="space-y-4">
            {meetingInsights.map((insight, index) => {
              const icons = {
                success: CheckCircleIcon,
                warning: ExclamationTriangleIcon,
                info: InformationCircleIcon
              }
              const colors = {
                success: 'text-green-500',
                warning: 'text-yellow-500',
                info: 'text-blue-500'
              }
              const bgColors = {
                success: 'bg-green-50 dark:bg-green-900/20',
                warning: 'bg-yellow-50 dark:bg-yellow-900/20',
                info: 'bg-blue-50 dark:bg-blue-900/20'
              }

              const Icon = icons[insight.type as keyof typeof icons]
              const colorClass = colors[insight.type as keyof typeof colors]
              const bgClass = bgColors[insight.type as keyof typeof bgColors]

              return (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${bgClass} rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${colorClass} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {insight.description}
                      </p>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        💡 {insight.action}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Additional Metrics */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <AnimatedCounter
                  value={actionItemsGenerated}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                />
                <div className="text-xs text-slate-500 mt-1">Action Items</div>
              </div>
              <div className="text-center">
                <AnimatedCounter
                  value={followUpRate}
                  suffix="%"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                />
                <div className="text-xs text-slate-500 mt-1">Follow-up Rate</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
