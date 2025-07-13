'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { 
  ChartBarIcon, 
  CalendarDaysIcon,
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CodeBracketIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  VideoCameraIcon,
  EyeIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  Square3Stack3DIcon,
  CpuChipIcon,
  BeakerIcon,
  RocketLaunchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartSolidIcon,
  FireIcon as FireSolidIcon,
  StarIcon as StarSolidIcon,
  ChartBarIcon as ChartBarSolidIcon 
} from '@heroicons/react/24/solid'

// Enhanced Types with sophisticated analytics structure
interface Analytics {
  overview: {
    totalFiles: number
    totalMeetings: number
    totalQuestions: number
    repositorySize: number
    lastActivity: string
    createdAt: string
  }
  timeline: {
    contributions: Array<{
      date: string
      count: number
      level: number // 0-4 intensity levels
      breakdown: {
        files: number
        meetings: number
        questions: number
      }
    }>
    streak: {
      current: number
      longest: number
    }
    totalContributions: number
  }
  fileStats: {
    totalFiles: number
    totalSize: number
    languages: Array<{
      name: string
      count: number
      bytes: number
      percentage: number
      color: string
    }>
    recentFiles: Array<{
      path: string
      language: string
      size: number
      addedAt: string
    }>
  }
  meetingStats: {
    repositoryMeetings: Array<{
      id: string
      title: string
      duration: number
      status: string
      participants: number
      createdAt: string
      actionItems: number
    }>
    totalDuration: number
    avgDuration: number
    completionRate: number
    trends: {
      thisWeek: number
      lastWeek: number
      growth: number
    }
  }
  questionStats: {
    totalQuestions: number
    answeredRate: number
    avgResponseTime: number
    recentQuestions: Array<{
      id: string
      query: string
      answered: boolean
      confidence: number
      createdAt: string
    }>
    trends: {
      thisWeek: number
      lastWeek: number
      growth: number
    }
  }
  // Sophisticated Analytics
  codeQuality?: {
    overallScore: number
    complexityScore: number
    maintainabilityScore: number
    complexityLevel: string
    avgComplexity: number
    technicalDebt: number
    metrics: Array<{
      label: string
      value: string | number
    }>
  }
  productivity?: {
    velocity: number
    velocityTrend: number
    avgSessionTime: string
    sessionEfficiency: number
    peakHours: string
    achievements: Array<{
      title: string
      date: string
    }>
    weeklyPatterns: {
      days: Array<{
        activity: number
        meetings: number
        questions: number
      }>
      mostActiveDay: string
      mostActiveDayScore: number
      weeklyGrowth: number
    }
  }
  collaboration?: {
    engagementScore: number
    engagementTrend: number
    avgParticipants: number
    responseTime: string
    avgMeetingDuration: string
    durationTrend: number
    avgActionItems: number
    completionRate: number
    followUpRate: number
    topContributors: Array<{
      name: string
      contributions: number
      score: number
    }>
  }
  insights: Array<{
    type: 'achievement' | 'trend' | 'warning' | 'tip'
    title: string
    description: string
    value?: string
    icon: string
    priority: number
    category?: string
  }>
}

// GitHub-style contribution graph
const ContributionGraph = ({ timeline }: { timeline: Analytics['timeline'] }) => {
  const weeks = useMemo(() => {
    const result: Array<Array<{
      date: string
      count: number
      level: number
      breakdown: { files: number; meetings: number; questions: number }
    }>> = []
    const contributions = timeline.contributions
    
    // Create weeks of data based on contributions
    const maxWeeks = Math.min(52, Math.ceil(contributions.length / 7))
    for (let week = 0; week < maxWeeks; week++) {
      const weekData: Array<{
        date: string
        count: number
        level: number
        breakdown: { files: number; meetings: number; questions: number }
      }> = []
      
      for (let day = 0; day < 7; day++) {
        const index = week * 7 + day
        if (index < contributions.length) {
          weekData.push(contributions[index])
        } else {
          const fallbackDate = new Date(Date.now() - (index * 24 * 60 * 60 * 1000))
          weekData.push({
            date: fallbackDate.toISOString().split('T')[0],
            count: 0,
            level: 0,
            breakdown: { files: 0, meetings: 0, questions: 0 }
          })
        }
      }
      result.push(weekData)
    }
    return result
  }, [timeline.contributions])

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      case 1: return 'bg-green-200 dark:bg-green-900 border-green-300 dark:border-green-800'
      case 2: return 'bg-green-300 dark:bg-green-700 border-green-400 dark:border-green-600'
      case 3: return 'bg-green-400 dark:bg-green-600 border-green-500 dark:border-green-500'
      case 4: return 'bg-green-500 dark:bg-green-500 border-green-600 dark:border-green-400'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ChartBarSolidIcon className="w-6 h-6 text-green-500" />
            Activity Timeline
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {timeline.totalContributions} contributions in the selected period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
            <FireSolidIcon className="w-4 h-4 text-orange-500" />
            <span>Current: <strong className="text-orange-600 dark:text-orange-400">{timeline.streak.current} days</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
            <StarSolidIcon className="w-4 h-4 text-yellow-500" />
            <span>Longest: <strong className="text-yellow-600 dark:text-yellow-400">{timeline.streak.longest} days</strong></span>
          </div>
        </div>
      </div>

      {/* Days of week labels */}
      <div className="flex mb-3">
        <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-2">Mon</div>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {/* Empty for alignment */}
        </div>
      </div>

      {/* Contribution graph */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <motion.div
                  key={`${weekIndex}-${dayIndex}`}
                  whileHover={{ scale: 1.2 }}
                  className={`w-3 h-3 rounded-sm border ${getLevelColor(day.level)} 
                    cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-green-500/50`}
                  title={`${day.date}: ${day.count} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">Less</div>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`w-3 h-3 rounded-sm border ${getLevelColor(level)}`} />
          ))}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">More</div>
      </div>
    </div>
  )
}

// Enhanced stat cards with GitHub-style design
const StatCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color = 'blue',
  subtitle
}: {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<any>
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow'
  subtitle?: string
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
  }

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl border ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                trend === 'down' ? 'text-red-600 dark:text-red-400' : 
                'text-gray-600 dark:text-gray-400'
              }`}>
                {trend === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : trend === 'down' ? (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                ) : null}
                {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Language breakdown chart
const LanguageChart = ({ languages }: { languages: Array<{
  name: string
  count: number
  bytes: number
  percentage: number
  color: string
}> }) => {
  // Prepare data for the colorful horizontal bar
  const total = languages.slice(0, 8).reduce((sum, lang) => sum + lang.percentage, 0);
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <CodeBracketIcon className="w-6 h-6 text-blue-500" />
        Language Breakdown
      </h3>

      {/* Colorful horizontal bar */}
      <div className="w-full flex h-4 rounded-full overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
        {languages.slice(0, 8).map((lang, idx) => (
          <div
            key={lang.name}
            style={{
              width: `${lang.percentage / total * 100}%`,
              backgroundColor: lang.color,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)'
            }}
            title={`${lang.name}: ${lang.percentage.toFixed(1)}%`}
            className="h-full"
          />
        ))}
      </div>

      {/* Language list with progress bars, no overlap */}
      <div className="space-y-4">
        {languages.slice(0, 8).map((lang, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }} />
              <span className="text-sm font-medium text-gray-900 dark:text-white min-w-0 flex-1">
                {lang.name}
              </span>
              <span className="font-mono text-gray-600 dark:text-gray-400">{lang.count} files</span>
              <span className="font-mono min-w-[3rem] text-right text-gray-600 dark:text-gray-400">{lang.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lang.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="h-2 rounded-full"
                style={{ backgroundColor: lang.color, width: `${lang.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Repository meetings panel
const RepositoryMeetings = ({ meetings }: { meetings: Array<{
  id: string
  title: string
  duration: number
  status: string
  participants: number
  createdAt: string
  actionItems: number
}> }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <VideoCameraIcon className="w-6 h-6 text-purple-500" />
          Repository Meetings
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {meetings.length} meetings
        </span>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No meetings found for this repository</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {meetings.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                  {meeting.title}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  meeting.status === 'completed' 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                    : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {meeting.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {Math.round(meeting.duration / 60)}m
                </span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  {meeting.participants}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  {meeting.actionItems} tasks
                </span>
                <span className="ml-auto">
                  {new Date(meeting.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// Time range selector
const TimeRangeSelector = ({ 
  value, 
  onChange 
}: { 
  value: string
  onChange: (value: string) => void 
}) => {
  const ranges = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '3 months' },
    { value: '1y', label: '1 year' }
  ]

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            value === range.value
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

// Code Quality Insights Component
const CodeQualityInsights = ({ codeQuality }: { codeQuality: any }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 dark:bg-emerald-900/20'
    if (score >= 70) return 'bg-blue-100 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
          <CodeBracketIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Code Quality Insights
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analysis of code patterns and quality metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className={`p-4 rounded-xl ${getScoreBg(codeQuality.overallScore)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Score
            </span>
            <span className={`text-2xl font-bold ${getScoreColor(codeQuality.overallScore)}`}>
              {codeQuality.overallScore}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                codeQuality.overallScore >= 90 ? 'bg-emerald-500' :
                codeQuality.overallScore >= 70 ? 'bg-blue-500' :
                codeQuality.overallScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${codeQuality.overallScore}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Complexity
            </span>
            <span className={`text-lg font-semibold ${getScoreColor(100 - codeQuality.complexityScore)}`}>
              {codeQuality.complexityLevel}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Average: {codeQuality.avgComplexity.toFixed(1)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Maintainability
            </span>
            <span className={`text-lg font-semibold ${getScoreColor(codeQuality.maintainabilityScore)}`}>
              {codeQuality.maintainabilityScore}%
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Technical debt: {codeQuality.technicalDebt}h
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {codeQuality.metrics.map((metric: any, index: number) => (
          <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {metric.value}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Productivity Metrics Component
const ProductivityMetrics = ({ productivity }: { productivity: any }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Productivity Metrics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Development velocity and efficiency trends
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Development Velocity
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {productivity.velocityTrend > 0 ? '+' : ''}{productivity.velocityTrend}% vs last period
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {productivity.velocity}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              points/week
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Avg Session
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {productivity.avgSessionTime}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {productivity.sessionEfficiency}% efficiency
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BoltIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Peak Hours
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {productivity.peakHours}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Most productive time
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recent Achievements</h4>
          <div className="space-y-2">
            {productivity.achievements.map((achievement: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-lg">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{achievement.title}</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {achievement.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Weekly Analysis Component
const WeeklyAnalysis = ({ weeklyData }: { weeklyData: any }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
          <CalendarDaysIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Weekly Patterns
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Activity distribution throughout the week
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Activity Heatmap
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Higher is more active
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const activity = weeklyData.days[index] || { activity: 0, meetings: 0, questions: 0 }
            const intensity = Math.min(activity.activity / 10, 1)
            
            return (
              <div key={day} className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{day}</div>
                <div 
                  className="h-16 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.6})`,
                    borderColor: intensity > 0.3 ? 'rgb(59, 130, 246)' : undefined
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {activity.activity}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {activity.meetings}m / {activity.questions}q
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-lg">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Most Active Day
          </div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {weeklyData.mostActiveDay}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {weeklyData.mostActiveDayScore} activities
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weekly Growth
          </div>
          <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            {weeklyData.weeklyGrowth > 0 ? '+' : ''}{weeklyData.weeklyGrowth}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            vs previous week
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Collaboration Insights Component
const CollaborationInsights = ({ collaboration }: { collaboration: any }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg">
          <UsersIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Collaboration Insights
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Team interaction patterns and engagement metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {collaboration.engagementScore}%
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Engagement Score
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {collaboration.engagementTrend > 0 ? '+' : ''}{collaboration.engagementTrend}% this week
          </div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {collaboration.avgParticipants}
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Avg Participants
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            per meeting
          </div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {collaboration.responseTime}
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Response Time
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            average
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Top Contributors</h4>
          <div className="space-y-3">
            {collaboration.topContributors.map((contributor: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {contributor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {contributor.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {contributor.contributions} contributions
                  </div>
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {contributor.score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Meeting Insights</h4>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Average Duration
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {collaboration.avgMeetingDuration}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {collaboration.durationTrend > 0 ? '+' : ''}{collaboration.durationTrend}% vs last month
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Action Items/Meeting
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {collaboration.avgActionItems}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {collaboration.completionRate}% completion rate
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Follow-up Rate
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {collaboration.followUpRate}%
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Within 24 hours
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function AnalyticsPage() {
  const { selectedRepository } = useRepository()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')

  const fetchAnalytics = useCallback(async () => {
    if (!selectedRepository) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/analytics?repositoryId=${selectedRepository.id}&timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [selectedRepository, timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <Square3Stack3DIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Repository Selected
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please select a repository to view analytics
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
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
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <InformationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Analytics Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              No analytics data available for this repository
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Insights for <span className="font-medium">{selectedRepository.name}</span>
              </p>
            </div>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Files"
              value={analytics.overview.totalFiles}
              icon={DocumentTextIcon}
              color="blue"
              subtitle="Repository files"
            />
            <StatCard
              title="Meetings"
              value={analytics.overview.totalMeetings}
              change={analytics.meetingStats.trends.growth}
              trend={analytics.meetingStats.trends.growth > 0 ? 'up' : analytics.meetingStats.trends.growth < 0 ? 'down' : 'neutral'}
              icon={VideoCameraIcon}
              color="purple"
              subtitle="This period"
            />
            <StatCard
              title="Q&A Sessions"
              value={analytics.overview.totalQuestions}
              change={analytics.questionStats.trends.growth}
              trend={analytics.questionStats.trends.growth > 0 ? 'up' : analytics.questionStats.trends.growth < 0 ? 'down' : 'neutral'}
              icon={ChatBubbleLeftRightIcon}
              color="green"
              subtitle="Questions asked"
            />
            <StatCard
              title="Repository Size"
              value={`${(analytics.overview.repositorySize / 1024 / 1024).toFixed(1)} MB`}
              icon={Square3Stack3DIcon}
              color="orange"
              subtitle="Total size"
            />
          </div>

          {/* Contribution Graph */}
          <div className="mb-8">
            <ContributionGraph timeline={analytics.timeline} />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LanguageChart languages={analytics.fileStats.languages} />
            <RepositoryMeetings meetings={analytics.meetingStats.repositoryMeetings} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
