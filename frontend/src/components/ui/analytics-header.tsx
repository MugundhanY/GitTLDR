'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChartBarIcon,
  ArrowPathIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  SparklesIcon,
  ChevronDownIcon,
  CalendarIcon,
  BoltIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'

interface AnalyticsHeaderProps {
  overview: {
    totalUsers: number
    totalRepositories: number
    totalMeetings: number
    totalQuestions: number
    totalFiles: number
    totalActionItems: number
  }
  isLoading: boolean
  lastUpdated?: string
  onRefresh?: () => void
}

export function AnalyticsHeader({ overview, isLoading, lastUpdated, onRefresh }: AnalyticsHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showTimeRange, setShowTimeRange] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days')

  const timeRanges = [
    'Last 7 days',
    'Last 30 days',
    'Last 3 months',
    'Last year',
    'All time'
  ]

  const handleRefresh = async () => {
    if (isRefreshing || isLoading) return
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getHealthScore = () => {
    const totalActivity = overview.totalMeetings + overview.totalQuestions + overview.totalFiles
    if (totalActivity > 100) return { score: 95, status: 'Excellent', color: 'text-green-500' }
    if (totalActivity > 50) return { score: 80, status: 'Good', color: 'text-blue-500' }
    if (totalActivity > 20) return { score: 65, status: 'Fair', color: 'text-yellow-500' }
    return { score: 40, status: 'Needs Attention', color: 'text-red-500' }
  }

  const health = getHealthScore()

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-r from-white via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 border-b border-slate-200 dark:border-slate-700"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Left Side - Main Title and Stats */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"
                />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Real-time insights and performance metrics
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Users', value: overview.totalUsers, icon: BoltIcon, color: 'text-blue-500' },
                { label: 'Repos', value: overview.totalRepositories, icon: ChartPieIcon, color: 'text-green-500' },
                { label: 'Meetings', value: overview.totalMeetings, icon: FireIcon, color: 'text-orange-500' },
                { label: 'Q&A', value: overview.totalQuestions, icon: SparklesIcon, color: 'text-purple-500' },
                { label: 'Files', value: overview.totalFiles, icon: TrophyIcon, color: 'text-yellow-500' },
                { label: 'Tasks', value: overview.totalActionItems, icon: ClockIcon, color: 'text-red-500' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50 dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {stat.value.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side - Controls and Health */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
            
            {/* Health Score */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 min-w-[200px]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  System Health
                </span>
                <TrophyIcon className={`w-4 h-4 ${health.color}`} />
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-700"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      className={health.color}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${health.score}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {health.score}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {health.status}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Performance Score
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <div className="flex gap-2">
              {/* Time Range Selector */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTimeRange(!showTimeRange)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedTimeRange}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </motion.button>
                
                <AnimatePresence>
                  {showTimeRange && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 min-w-[150px]"
                    >
                      {timeRanges.map((range) => (
                        <button
                          key={range}
                          onClick={() => {
                            setSelectedTimeRange(range)
                            setShowTimeRange(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            selectedTimeRange === range ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </motion.button>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
              >
                <ClockIcon className="w-3 h-3" />
                <span>Last updated: {lastUpdated}</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
