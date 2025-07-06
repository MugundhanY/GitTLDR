'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CodeBracketIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  CalendarDaysIcon,
  EyeIcon,
  HeartIcon,
  PlusIcon,
  MinusIcon,
  TrophyIcon,
  LightBulbIcon,
  CpuChipIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartSolidIcon,
  FireIcon as FireSolidIcon,
  TrophyIcon as TrophySolidIcon 
} from '@heroicons/react/24/solid'

// Enhanced Types for Real Analytics Data
interface Analytics {
  overview: {
    totalFiles: number
    totalMeetings: number
    totalQuestions: number
    activeUsers: number
    repositorySize: number
    lastActivity: string
    createdAt: string
  }
  fileStats: {
    totalFiles: number
    totalSize: number
    byLanguage: Array<{
      language: string
      count: number
      percentage: number
      size: number
      avgSize: number
    }>
    byType: Array<{
      type: string
      count: number
      percentage: number
    }>
    largestFiles: Array<{
      path: string
      size: number
      language: string
    }>
    recentFiles: Array<{
      path: string
      createdAt: string
      size: number
    }>
  }
  meetingStats: {
    totalMeetings: number
    totalDuration: number
    avgDuration: number
    completionRate: number
    statusBreakdown: Array<{
      status: string
      count: number
      percentage: number
    }>
    recentMeetings: Array<{
      id: string
      title: string
      duration: number
      status: string
      createdAt: string
    }>
    weeklyActivity: Array<{
      week: string
      count: number
    }>
  }
  questionStats: {
    totalQuestions: number
    answeredQuestions: number
    avgResponseTime: number
    answerRate: number
    topCategories: Array<{
      category: string
      count: number
    }>
    recentQuestions: Array<{
      id: string
      question: string
      answered: boolean
      createdAt: string
    }>
    weeklyActivity: Array<{
      week: string
      count: number
    }>
  }
  activity: {
    dailyActivity: Array<{
      date: string
      files: number
      meetings: number
      questions: number
      total: number
    }>
    hourlyDistribution: Array<{
      hour: number
      activity: number
    }>
    weeklyTrends: Array<{
      week: string
      growth: number
    }>
  }
  insights: Array<{
    type: 'success' | 'warning' | 'info' | 'achievement'
    title: string
    description: string
    value?: string
    icon: string
  }>
}

// Professional Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  description, 
  icon: Icon,
  color = 'blue',
  loading = false 
}: {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  description?: string
  icon?: any
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'
  loading?: boolean
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/20 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/20 text-purple-600',
    orange: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/20 text-orange-600',
    red: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/20 text-red-600',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/20 text-indigo-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {Icon && (
              <div className={`p-2 rounded-xl border ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              {change && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {trend === 'up' && <ArrowTrendingUpIcon className="w-3 h-3" />}
                  {trend === 'down' && <ArrowTrendingDownIcon className="w-3 h-3" />}
                  {change}
                </div>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Language Distribution Chart
const LanguageChart = ({ languages }: { languages: Analytics['fileStats']['byLanguage'] }) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
  ]

  return (
    <div className="space-y-4">
      {languages.slice(0, 8).map((lang, index) => (
        <motion.div
          key={lang.language}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-3 min-w-[120px]">
            <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {lang.language}
            </span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {lang.count} files
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {lang.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lang.percentage}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className={`h-2 rounded-full ${colors[index % colors.length]}`}
              />
            </div>
          </div>
          
          <div className="text-right min-w-[80px]">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(lang.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Activity Timeline Chart
const ActivityTimeline = ({ activity }: { activity: Analytics['activity']['dailyActivity'] }) => {
  const maxActivity = Math.max(...activity.map(d => d.total))
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {activity.slice(-35).map((day, index) => {
          const intensity = day.total / maxActivity
          const date = new Date(day.date)
          
          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-medium cursor-pointer hover:scale-110 transition-transform ${
                intensity > 0.8 ? 'bg-green-500 text-white' :
                intensity > 0.6 ? 'bg-green-400 text-white' :
                intensity > 0.4 ? 'bg-green-300 text-gray-800' :
                intensity > 0.2 ? 'bg-green-200 text-gray-800' :
                intensity > 0 ? 'bg-green-100 text-gray-600' :
                'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}
              title={`${date.toLocaleDateString()}: ${day.total} activities`}
            >
              {date.getDate()}
            </motion.div>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Less active</span>
        <div className="flex gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded ${
                intensity > 0.8 ? 'bg-green-500' :
                intensity > 0.6 ? 'bg-green-400' :
                intensity > 0.4 ? 'bg-green-300' :
                intensity > 0.2 ? 'bg-green-200' :
                intensity > 0 ? 'bg-green-100' :
                'bg-gray-100 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span>More active</span>
      </div>
    </div>
  )
}

// Insights Panel
const InsightsPanel = ({ insights }: { insights: Analytics['insights'] }) => {
  const iconMap = {
    trophy: TrophySolidIcon,
    fire: FireSolidIcon,
    heart: HeartSolidIcon,
    lightbulb: LightBulbIcon,
    cpu: CpuChipIcon,
    beaker: BeakerIcon,
    check: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => {
        const Icon = iconMap[insight.icon as keyof typeof iconMap] || InformationCircleIcon
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border ${
              insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/20' :
              insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/20' :
              insight.type === 'achievement' ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/20' :
              'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 ${
                insight.type === 'success' ? 'text-green-600' :
                insight.type === 'warning' ? 'text-amber-600' :
                insight.type === 'achievement' ? 'text-purple-600' :
                'text-blue-600'
              }`} />
              <div className="flex-1">
                <h4 className={`font-medium ${
                  insight.type === 'success' ? 'text-green-900 dark:text-green-100' :
                  insight.type === 'warning' ? 'text-amber-900 dark:text-amber-100' :
                  insight.type === 'achievement' ? 'text-purple-900 dark:text-purple-100' :
                  'text-blue-900 dark:text-blue-100'
                }`}>
                  {insight.title}
                </h4>
                <p className={`text-sm mt-1 ${
                  insight.type === 'success' ? 'text-green-700 dark:text-green-300' :
                  insight.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                  insight.type === 'achievement' ? 'text-purple-700 dark:text-purple-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {insight.description}
                </p>
                {insight.value && (
                  <p className={`text-lg font-bold mt-2 ${
                    insight.type === 'success' ? 'text-green-900 dark:text-green-100' :
                    insight.type === 'warning' ? 'text-amber-900 dark:text-amber-100' :
                    insight.type === 'achievement' ? 'text-purple-900 dark:text-purple-100' :
                    'text-blue-900 dark:text-blue-100'
                  }`}>
                    {insight.value}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const { selectedRepository } = useRepository()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!selectedRepository?.id) {
      setAnalytics(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?repositoryId=${selectedRepository.id}&timeRange=${timeRange}`)
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to fetch analytics')
        setAnalytics(null)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalytics(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedRepository?.id, timeRange])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!analytics) return null
    
    return {
      totalActivities: analytics.overview.totalFiles + analytics.overview.totalMeetings + analytics.overview.totalQuestions,
      avgFileSize: analytics.fileStats.totalSize / Math.max(analytics.fileStats.totalFiles, 1),
      weeklyGrowth: analytics.activity.weeklyTrends.slice(-1)[0]?.growth || 0,
      productivityScore: Math.min(100, Math.round(
        (analytics.meetingStats.completionRate * 0.4) +
        (analytics.questionStats.answerRate * 0.3) +
        (Math.min(analytics.activity.dailyActivity.slice(-7).reduce((sum, day) => sum + day.total, 0) / 7, 10) * 10 * 0.3)
      ))
    }
  }, [analytics])

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
              </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // No repository selected
  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <ChartBarIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Select a Repository
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Choose a repository from the sidebar to view detailed analytics and insights.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <SparklesIcon className="w-4 h-4" />
              <span>Advanced analytics await</span>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    )
  }

  // No analytics data
  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Repository: <span className="font-medium text-gray-900 dark:text-white">{selectedRepository.name}</span>
              </p>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <ExclamationTriangleIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Data Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Analytics data for <strong>{selectedRepository.name}</strong> is not available yet. The repository may still be processing.
              </p>
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {refreshing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <ArrowTrendingUpIcon className="w-4 h-4" />
                    Refresh Data
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Repository: <span className="font-medium text-gray-900 dark:text-white">{selectedRepository.name}</span>
                    </p>
                  </div>
                </div>
                
                {summaryStats && (
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Productivity Score: <strong className="text-gray-900 dark:text-white">{summaryStats.productivityScore}/100</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Weekly Growth: <strong className={summaryStats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {summaryStats.weeklyGrowth >= 0 ? '+' : ''}{summaryStats.weeklyGrowth.toFixed(1)}%
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <div className={refreshing ? 'animate-spin' : ''}>
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-8 mt-8">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'files', label: 'Files', icon: DocumentTextIcon },
                { id: 'meetings', label: 'Meetings', icon: VideoCameraIcon },
                { id: 'qa', label: 'Q&A', icon: ChatBubbleLeftRightIcon },
                { id: 'insights', label: 'Insights', icon: SparklesIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 pb-4 border-b-2 transition-all duration-300 ${
                    selectedTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Files"
                    value={analytics.fileStats.totalFiles}
                    description="Repository files"
                    icon={DocumentTextIcon}
                    color="blue"
                  />
                  <MetricCard
                    title="Meetings"
                    value={analytics.meetingStats.totalMeetings}
                    description={`${analytics.meetingStats.totalDuration} min total`}
                    icon={VideoCameraIcon}
                    color="green"
                  />
                  <MetricCard
                    title="Q&A Sessions"
                    value={analytics.questionStats.totalQuestions}
                    description={`${analytics.questionStats.answerRate.toFixed(1)}% answered`}
                    icon={ChatBubbleLeftRightIcon}
                    color="purple"
                  />
                  <MetricCard
                    title="Repository Size"
                    value={`${(analytics.overview.repositorySize / (1024 * 1024)).toFixed(1)} MB`}
                    description="Total storage used"
                    icon={CpuChipIcon}
                    color="orange"
                  />
                </div>

                {/* Activity Timeline */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Last 35 days
                    </div>
                  </div>
                  <ActivityTimeline activity={analytics.activity.dailyActivity} />
                </div>

                {/* Quick Insights */}
                {analytics.insights.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Insights</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <SparklesIcon className="w-4 h-4" />
                        AI-powered
                      </div>
                    </div>
                    <InsightsPanel insights={analytics.insights.slice(0, 3)} />
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'files' && (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* File Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Total Files"
                    value={analytics.fileStats.totalFiles}
                    description="All file types"
                    icon={DocumentTextIcon}
                    color="blue"
                  />
                  <MetricCard
                    title="Total Size"
                    value={`${(analytics.fileStats.totalSize / (1024 * 1024)).toFixed(1)} MB`}
                    description={`Avg: ${(analytics.fileStats.totalSize / Math.max(analytics.fileStats.totalFiles, 1) / 1024).toFixed(1)} KB per file`}
                    icon={CpuChipIcon}
                    color="green"
                  />
                  <MetricCard
                    title="Languages"
                    value={analytics.fileStats.byLanguage.length}
                    description="Programming languages"
                    icon={CodeBracketIcon}
                    color="purple"
                  />
                </div>

                {/* Language Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Language Distribution
                  </h3>
                  <LanguageChart languages={analytics.fileStats.byLanguage} />
                </div>

                {/* Largest Files */}
                {analytics.fileStats.largestFiles.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Largest Files
                    </h3>
                    <div className="space-y-3">
                      {analytics.fileStats.largestFiles.slice(0, 10).map((file, index) => (
                        <motion.div
                          key={file.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                              <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {file.path.split('/').pop()}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {file.path}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {file.language}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'meetings' && (
              <motion.div
                key="meetings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Meeting Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Meetings"
                    value={analytics.meetingStats.totalMeetings}
                    description="All time"
                    icon={VideoCameraIcon}
                    color="blue"
                  />
                  <MetricCard
                    title="Total Duration"
                    value={`${Math.floor(analytics.meetingStats.totalDuration / 60)}h ${analytics.meetingStats.totalDuration % 60}m`}
                    description="Meeting time"
                    icon={ClockIcon}
                    color="green"
                  />
                  <MetricCard
                    title="Avg Duration"
                    value={`${analytics.meetingStats.avgDuration} min`}
                    description="Per meeting"
                    icon={ChartBarIcon}
                    color="purple"
                  />
                  <MetricCard
                    title="Completion Rate"
                    value={`${analytics.meetingStats.completionRate.toFixed(1)}%`}
                    description="Successfully processed"
                    icon={CheckCircleIcon}
                    color="orange"
                  />
                </div>

                {/* Meeting Status Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Status Breakdown
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analytics.meetingStats.statusBreakdown.map((status, index) => (
                      <motion.div
                        key={status.status}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {status.status.replace('_', ' ')}
                          </span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {status.count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              status.status === 'completed' ? 'bg-green-500' :
                              status.status === 'processing' ? 'bg-blue-500' :
                              status.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${status.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {status.percentage.toFixed(1)}% of total
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recent Meetings */}
                {analytics.meetingStats.recentMeetings.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Recent Meetings
                    </h3>
                    <div className="space-y-3">
                      {analytics.meetingStats.recentMeetings.slice(0, 5).map((meeting, index) => (
                        <motion.div
                          key={meeting.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              meeting.status === 'completed' ? 'bg-green-500' :
                              meeting.status === 'processing' ? 'bg-blue-500' :
                              meeting.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {meeting.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(meeting.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {meeting.duration} min
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {meeting.status}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'qa' && (
              <motion.div
                key="qa"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Q&A Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Questions"
                    value={analytics.questionStats.totalQuestions}
                    description="All time"
                    icon={ChatBubbleLeftRightIcon}
                    color="blue"
                  />
                  <MetricCard
                    title="Answered"
                    value={analytics.questionStats.answeredQuestions}
                    description={`${analytics.questionStats.answerRate.toFixed(1)}% success rate`}
                    icon={CheckCircleIcon}
                    color="green"
                  />
                  <MetricCard
                    title="Avg Response Time"
                    value={`${analytics.questionStats.avgResponseTime}s`}
                    description="AI processing time"
                    icon={ClockIcon}
                    color="purple"
                  />
                  <MetricCard
                    title="Categories"
                    value={analytics.questionStats.topCategories.length}
                    description="Question types"
                    icon={BoltIcon}
                    color="orange"
                  />
                </div>

                {/* Top Categories */}
                {analytics.questionStats.topCategories.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Question Categories
                    </h3>
                    <div className="space-y-4">
                      {analytics.questionStats.topCategories.map((category, index) => (
                        <motion.div
                          key={category.category}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {category.category}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {category.count} questions
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {((category.count / analytics.questionStats.totalQuestions) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(category.count / analytics.questionStats.totalQuestions) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-2 rounded-full bg-blue-500"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Questions */}
                {analytics.questionStats.recentQuestions.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Recent Questions
                    </h3>
                    <div className="space-y-3">
                      {analytics.questionStats.recentQuestions.slice(0, 5).map((question, index) => (
                        <motion.div
                          key={question.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className={`w-3 h-3 rounded-full mt-2 ${
                            question.answered ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white mb-1">
                              {question.question.length > 100 
                                ? `${question.question.substring(0, 100)}...` 
                                : question.question
                              }
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                              <span className={question.answered ? 'text-green-600' : 'text-gray-500'}>
                                {question.answered ? 'Answered' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Insights Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Productivity Score"
                    value={`${summaryStats?.productivityScore || 0}/100`}
                    description="Overall efficiency"
                    icon={TrophyIcon}
                    color="purple"
                  />
                  <MetricCard
                    title="Weekly Growth"
                    value={`${summaryStats?.weeklyGrowth >= 0 ? '+' : ''}${(summaryStats?.weeklyGrowth || 0).toFixed(1)}%`}
                    description="Activity change"
                    icon={summaryStats?.weeklyGrowth >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon}
                    color={summaryStats?.weeklyGrowth >= 0 ? 'green' : 'red'}
                  />
                  <MetricCard
                    title="Total Activities"
                    value={summaryStats?.totalActivities || 0}
                    description="Files + Meetings + Q&A"
                    icon={BoltIcon}
                    color="blue"
                  />
                </div>

                {/* All Insights */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      AI-Powered Insights
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <SparklesIcon className="w-4 h-4" />
                      Real-time analysis
                    </div>
                  </div>
                  <InsightsPanel insights={analytics.insights} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  )
}
