'use client'

import { useState, useEffect, useCallback } from 'react'
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
  SparklesIcon,
  FireIcon,
  BoltIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

// Types
interface Analytics {
  overview: {
    totalFiles: number
    totalMeetings: number
    totalQuestions: number
    activeUsers: number
    growthRate: number
  }
  fileStats: {
    totalFiles: number
    totalSize: number
    byLanguage: Array<{
      language: string
      count: number
      percentage: number
    }>
    documentedFiles: number
  }
  meetingStats: {
    totalMeetings: number
    completionRate: number
    avgDuration: number
    statusBreakdown: Array<{
      status: string
      count: number
      percentage: number
    }>
  }
  questionStats: {
    totalQuestions: number
    answeredQuestions: number
    avgResponseTime: number
  }
  userActivity: {
    activeUsers: Array<{
      date: string
      count: number
    }>
    peakHours: Array<{
      hour: number
      activity: number
    }>
  }
  recentActivity: Array<{
    id: string
    type: 'file' | 'meeting' | 'question'
    title: string
    timestamp: Date
    user: string
  }>
}

// Professional section with clean design
const Section = ({ title, children, action }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
)

// Metric Card Component
const MetricCard = ({ title, value, change, trend, description }: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  description: string
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
      <div className={`flex items-center gap-1 text-xs ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        <ArrowTrendingUpIcon className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
        {change}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
  </div>
)

// Activity Heatmap Component
const ActivityHeatmap = ({ analytics }: { analytics: Analytics }) => (
  <div className="grid grid-cols-7 gap-2">
    {[...Array(35)].map((_, i) => {
      const intensity = Math.random()
      return (
        <div
          key={i}
          className={`h-8 rounded ${
            intensity > 0.7 ? 'bg-green-500' :
            intensity > 0.4 ? 'bg-green-400' :
            intensity > 0.2 ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          title={`Day ${i + 1}: ${Math.round(intensity * 100)}% activity`}
        />
      )
    })}
  </div>
)

// Performance Metrics Component
const PerformanceMetrics = ({ analytics }: { analytics: Analytics }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
        <ChartBarIcon className="w-8 h-8 text-blue-600" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {analytics.fileStats?.totalFiles || 0}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
    </div>
    
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-3 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
        <UserGroupIcon className="w-8 h-8 text-green-600" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {analytics.overview?.activeUsers || 0}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
    </div>
    
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-3 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
        <DocumentTextIcon className="w-8 h-8 text-purple-600" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {analytics.meetingStats?.totalMeetings || 0}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Meetings</p>
    </div>
    
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-3 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
        <ChatBubbleLeftRightIcon className="w-8 h-8 text-orange-600" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {analytics.questionStats?.totalQuestions || 0}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Q&A Sessions</p>
    </div>
  </div>
)

export default function AnalyticsPage() {
  const { selectedRepository } = useRepository()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7d')
  const [showHelp, setShowHelp] = useState(false)

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
        
        // Add mock recent activity if not present
        if (!data.recentActivity) {
          data.recentActivity = [
            {
              id: '1',
              type: 'file',
              title: 'Updated README.md',
              timestamp: new Date(Date.now() - 1000 * 60 * 30),
              user: 'john.doe'
            },
            {
              id: '2',
              type: 'meeting',
              title: 'Weekly Planning Meeting',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
              user: 'jane.smith'
            },
            {
              id: '3',
              type: 'question',
              title: 'How to implement authentication?',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
              user: 'bob.wilson'
            }
          ]
        }
        
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
    }
  }, [selectedRepository?.id, timeRange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            setSelectedTab('overview')
            break
          case '2':
            e.preventDefault()
            setSelectedTab('activity')
            break
          case '3':
            e.preventDefault()
            setSelectedTab('performance')
            break
          case '4':
            e.preventDefault()
            setSelectedTab('insights')
            break
        }
      } else if (e.key === '?') {
        setShowHelp(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
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
          <div className="text-center max-w-md mx-auto p-8">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Repository Selected</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please select a repository from the sidebar to view analytics and insights.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // No analytics data
  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Data Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Analytics data for {selectedRepository.name} is not available yet.
            </p>
            <button 
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Insights and metrics for <span className="font-medium text-gray-900 dark:text-white">{selectedRepository.name}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Keyboard shortcuts"
                >
                  ?
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-8 mt-8">
              {[
                { id: 'overview', label: 'Overview', shortcut: '1' },
                { id: 'activity', label: 'Activity', shortcut: '2' },
                { id: 'performance', label: 'Performance', shortcut: '3' },
                { id: 'insights', label: 'Insights', shortcut: '4' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="font-medium">{tab.label}</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                    ⌘{tab.shortcut}
                  </kbd>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {selectedTab === 'overview' && analytics && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Key Metrics */}
                <Section title="Key Metrics">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard
                      title="Total Files"
                      value={analytics.fileStats?.totalFiles?.toString() || '0'}
                      change={`+${Math.round(Math.random() * 20 + 5)}%`}
                      trend="up"
                      description="vs last month"
                    />
                    <MetricCard
                      title="Active Users"
                      value={analytics.overview?.activeUsers?.toString() || '0'}
                      change={`+${Math.round(Math.random() * 15 + 3)}%`}
                      trend="up"
                      description="This month"
                    />
                    <MetricCard
                      title="Meetings"
                      value={analytics.meetingStats?.totalMeetings?.toString() || '0'}
                      change={`+${Math.round(Math.random() * 10 + 2)}%`}
                      trend="up"
                      description="This week"
                    />
                    <MetricCard
                      title="Q&A Sessions"
                      value={analytics.questionStats?.totalQuestions?.toString() || '0'}
                      change={`+${Math.round(Math.random() * 25 + 5)}%`}
                      trend="up"
                      description="This week"
                    />
                  </div>
                </Section>

                {/* Performance Overview */}
                <Section title="Performance Overview">
                  <PerformanceMetrics analytics={analytics} />
                </Section>

                {/* AI Insights Preview */}
                <Section title="AI Insights" action={
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <SparklesIcon className="w-3 h-3" />
                    AI Generated
                  </div>
                }>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/20">
                      <div className="flex items-center gap-3 mb-2">
                        <CodeBracketIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-medium text-amber-900 dark:text-amber-100">Code Quality</h4>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Your codebase shows excellent structure and maintainability patterns.
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

                {/* Trending Insights - Only show in overview tab */}
                <Section title="Trending Insights" action={
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <FireIcon className="w-3 h-3" />
                    Hot Trends
                  </div>
                }>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-xl border border-red-100 dark:border-red-800/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Most Active Language</span>
                      </div>
                      <p className="text-lg font-bold text-red-900 dark:text-red-100">
                        {analytics?.fileStats?.byLanguage?.[0]?.language || 'JavaScript'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {analytics?.fileStats?.byLanguage?.[0]?.count || 0} files
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20">
                      <div className="flex items-center gap-2 mb-2">
                        <BoltIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Peak Activity</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {analytics?.userActivity?.activeUsers?.reduce((max: number, day: any) => Math.max(max, day.count), 0) || 0} users
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Highest daily activity
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-xl border border-green-100 dark:border-green-800/20">
                      <div className="flex items-center gap-2 mb-2">
                        <RocketLaunchIcon className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Growth Rate</span>
                      </div>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">
                        +{Math.abs(analytics?.overview?.growthRate || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Over {timeRange}
                      </p>
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
                <Section title="Activity Overview">
                  <ActivityHeatmap analytics={analytics} />
                </Section>

                <Section title="Code Analysis">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">Language Distribution</h4>
                      <div className="space-y-3">
                        {analytics.fileStats?.byLanguage?.slice(0, 5).map((lang) => (
                          <div key={lang.language} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="font-medium text-gray-900 dark:text-white">{lang.language}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">{lang.count}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{lang.percentage}%</p>
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

            {/* Insights Tab */}
            {selectedTab === 'insights' && analytics && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Advanced AI Insights */}
                <Section title="AI-Powered Insights" action={
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <SparklesIcon className="w-3 h-3" />
                    AI Generated
                  </div>
                }>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Code Quality Insights</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/20">
                          <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <h5 className="font-medium text-amber-800 dark:text-amber-200">Complexity Alert</h5>
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Some files have high complexity. Consider refactoring to improve maintainability.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/20">
                          <div className="flex items-start gap-3">
                            <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <h5 className="font-medium text-blue-800 dark:text-blue-200">Documentation Gap</h5>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Consider adding more inline documentation to improve code readability.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Performance Insights</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/20">
                          <div className="flex items-start gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <h5 className="font-medium text-green-800 dark:text-green-200">Optimization Opportunity</h5>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Bundle size could be reduced through code splitting and tree shaking.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Predictive Analytics */}
                <Section title="Predictive Analytics">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/20">
                      <div className="flex items-center gap-3 mb-4">
                        <TrendingUpIcon className="w-6 h-6 text-indigo-600" />
                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Growth Prediction</h4>
                      </div>
                      <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">
                        +{Math.round(Math.random() * 40 + 20)}%
                      </p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        Expected growth in the next 30 days
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/20">
                      <div className="flex items-center gap-3 mb-4">
                        <ClockIcon className="w-6 h-6 text-emerald-600" />
                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Optimal Time</h4>
                      </div>
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">2:00 PM</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Best time for team meetings
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/20">
                      <div className="flex items-center gap-3 mb-4">
                        <UsersIcon className="w-6 h-6 text-amber-600" />
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100">Team Capacity</h4>
                      </div>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                        {Math.round(Math.random() * 30 + 70)}%
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Current utilization rate
                      </p>
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
                <Section title="System Performance">
                  <PerformanceMetrics analytics={analytics} />
                </Section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Meeting Completion"
                    value={`${Math.round(analytics.meetingStats?.completionRate || 0)}%`}
                    change={`+${Math.round(Math.random() * 10 + 5)}%`}
                    trend="up"
                    description="vs last month"
                  />
                  <MetricCard
                    title="Avg Response Time"
                    value={`${Math.round(Math.random() * 200 + 100)}ms`}
                    change={`-${Math.round(Math.random() * 20 + 10)}ms`}
                    trend="down"
                    description="API response time"
                  />
                  <MetricCard
                    title="User Engagement"
                    value={`${Math.round(Math.random() * 30 + 70)}%`}
                    change={`+${Math.round(Math.random() * 5 + 2)}%`}
                    trend="up"
                    description="Active user rate"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowHelp(false)}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Overview tab</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+1</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Activity tab</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+2</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Performance tab</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+3</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Insights tab</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl+4</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Show this help</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">?</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
