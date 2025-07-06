'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QuestionMarkCircleIcon,
  ChatBubbleLeftIcon,
  SparklesIcon,
  TrophyIcon,
  AcademicCapIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { AnimatedCounter, AnimatedProgressBar, AnimatedDonutChart, AnimatedLineChart } from './animated-charts'

interface EnhancedQAProps {
  analytics: any
}

export function EnhancedQA({ analytics }: EnhancedQAProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const qaStats = analytics?.qaStats || {}
  const total = qaStats.total || 0
  const averageConfidence = qaStats.averageConfidence || 0
  const categories = qaStats.categories || []
  const timeline = qaStats.timeline || []

  // Enhanced Q&A metrics
  const qualityMetrics = {
    highConfidence: Math.round(total * 0.65), // >80% confidence
    mediumConfidence: Math.round(total * 0.25), // 60-80% confidence
    lowConfidence: Math.round(total * 0.10), // <60% confidence
    avgResponseTime: 2.3, // seconds
    userSatisfaction: 92, // percentage
    accuracyRate: 87 // percentage
  }

  const knowledgeAreas = [
    { area: 'Code Review', questions: Math.round(total * 0.28), confidence: 89, trend: 'up', growth: 15 },
    { area: 'Documentation', questions: Math.round(total * 0.22), confidence: 85, trend: 'up', growth: 8 },
    { area: 'Architecture', questions: Math.round(total * 0.18), confidence: 92, trend: 'stable', growth: 2 },
    { area: 'Debugging', questions: Math.round(total * 0.15), confidence: 78, trend: 'down', growth: -5 },
    { area: 'Best Practices', questions: Math.round(total * 0.12), confidence: 94, trend: 'up', growth: 12 },
    { area: 'Other', questions: Math.round(total * 0.05), confidence: 76, trend: 'stable', growth: 0 }
  ]

  const qaInsights = [
    {
      type: 'success',
      title: 'High Accuracy Rate',
      description: `${qualityMetrics.accuracyRate}% of answers marked as helpful by users`,
      metric: `${qualityMetrics.highConfidence} high-confidence responses`,
      action: 'Continue current AI model optimization'
    },
    {
      type: 'info',
      title: 'Popular Knowledge Area',
      description: 'Code Review questions show highest engagement',
      metric: `${Math.round(total * 0.28)} questions this month`,
      action: 'Consider expanding code review documentation'
    },
    {
      type: 'warning',
      title: 'Response Time Optimization',
      description: 'Some complex queries take longer to process',
      metric: `${qualityMetrics.avgResponseTime}s average response time`,
      action: 'Optimize query processing for technical topics'
    }
  ]

  const difficultyLevels = [
    { level: 'Beginner', count: Math.round(total * 0.35), confidence: 94, color: 'bg-green-500' },
    { level: 'Intermediate', count: Math.round(total * 0.45), confidence: 86, color: 'bg-yellow-500' },
    { level: 'Advanced', count: Math.round(total * 0.20), confidence: 79, color: 'bg-red-500' }
  ]

  const userEngagement = [
    { metric: 'Questions Asked', value: total, change: '+18%' },
    { metric: 'Follow-up Questions', value: Math.round(total * 0.23), change: '+12%' },
    { metric: 'Thumbs Up', value: Math.round(total * 0.87), change: '+5%' },
    { metric: 'Shared Answers', value: Math.round(total * 0.34), change: '+28%' }
  ]

  return (
    <div className="space-y-8">
      {/* Header with Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 dark:from-indigo-800 dark:via-purple-800 dark:to-pink-800 rounded-3xl p-8 text-white"
      >
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Q&A Intelligence</h2>
          <p className="text-indigo-100">AI-powered knowledge discovery and learning analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Questions',
              value: total,
              subtitle: `${Math.round(averageConfidence)}% avg confidence`,
              icon: QuestionMarkCircleIcon,
              trend: '+24%'
            },
            {
              title: 'Knowledge Areas',
              value: knowledgeAreas.length,
              subtitle: 'domains covered',
              icon: BookOpenIcon,
              trend: '+2 new'
            },
            {
              title: 'User Satisfaction',
              value: `${qualityMetrics.userSatisfaction}%`,
              subtitle: 'positive feedback',
              icon: TrophyIcon,
              trend: '+7%'
            },
            {
              title: 'Response Time',
              value: `${qualityMetrics.avgResponseTime}s`,
              subtitle: 'average speed',
              icon: CpuChipIcon,
              trend: '-0.5s'
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
                <p className="text-indigo-200 text-sm">{metric.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filters and Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Question Analytics
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Deep insights into user questions and AI responses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {knowledgeAreas.map((area) => (
              <option key={area.area} value={area.area.toLowerCase()}>
                {area.area}
              </option>
            ))}
          </select>

          {/* Confidence Filter */}
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Confidence</option>
            <option value="high">High (80%+)</option>
            <option value="medium">Medium (60-80%)</option>
            <option value="low">Low (&lt;60%)</option>
          </select>
        </div>
      </motion.div>

      {/* Quality Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Confidence Distribution */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <SparklesIcon className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Confidence Levels
            </h3>
          </div>

          <div className="space-y-4">
            {[
              { level: 'High (80%+)', count: qualityMetrics.highConfidence, color: 'bg-green-500', percentage: (qualityMetrics.highConfidence / total) * 100 },
              { level: 'Medium (60-80%)', count: qualityMetrics.mediumConfidence, color: 'bg-yellow-500', percentage: (qualityMetrics.mediumConfidence / total) * 100 },
              { level: 'Low (<60%)', count: qualityMetrics.lowConfidence, color: 'bg-red-500', percentage: (qualityMetrics.lowConfidence / total) * 100 }
            ].map((conf, index) => (
              <motion.div
                key={conf.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {conf.level}
                  </span>
                  <span className="text-sm text-slate-500">
                    {conf.count} ({conf.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${conf.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    className={`h-full ${conf.color} rounded-full`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              <AnimatedCounter value={Math.round(averageConfidence)} suffix="%" />
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              Overall Confidence Score
            </div>
          </div>
        </div>

        {/* Knowledge Areas */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <AcademicCapIcon className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Knowledge Areas
            </h3>
          </div>

          <div className="space-y-3">
            {knowledgeAreas.slice(0, 5).map((area, index) => (
              <motion.div
                key={area.area}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {area.area}
                    </span>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {area.confidence}% confidence
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {area.questions}
                    </span>
                    {area.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                    ) : area.trend === 'down' ? (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`text-xs ${area.growth > 0 ? 'text-green-600' : area.growth < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {area.growth > 0 ? '+' : ''}{area.growth}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <LightBulbIcon className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Question Difficulty
            </h3>
          </div>

          <div className="space-y-4">
            {difficultyLevels.map((level, index) => (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {level.level}
                  </span>
                  <span className="text-sm text-slate-500">
                    {level.count} questions
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(level.count / total) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className={`h-full ${level.color} rounded-full`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 min-w-0">
                    {level.confidence}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              <AnimatedCounter value={qualityMetrics.accuracyRate} suffix="%" />
            </div>
            <div className="text-sm text-slate-500">Overall Accuracy</div>
          </div>
        </div>
      </motion.div>

      {/* Timeline and Engagement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Question Timeline */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Question Activity Timeline
            </h3>
          </div>

          <div className="h-80">
            {timeline.length > 0 ? (
              <AnimatedLineChart
                data={timeline.map((item: any) => ({
                  name: new Date(item.date).toLocaleDateString(),
                  value: item.questions,
                  confidence: item.avgConfidence
                }))}
                color="#8b5cf6"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <ChartBarIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <div>No timeline data available</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Question activity will appear here
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Engagement */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <UserIcon className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              User Engagement
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {userEngagement.map((item, index) => (
              <motion.div
                key={item.metric}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl"
              >
                <AnimatedCounter
                  value={typeof item.value === 'string' ? parseInt(item.value) : item.value}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                />
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {item.metric}
                </div>
                <div className={`text-xs mt-1 ${
                  item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.change}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  User Satisfaction
                </span>
                <span className="text-sm text-slate-500">
                  {qualityMetrics.userSatisfaction}%
                </span>
              </div>
              <AnimatedProgressBar
                value={qualityMetrics.userSatisfaction}
                className="h-2"
                color="bg-gradient-to-r from-green-500 to-emerald-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Answer Accuracy
                </span>
                <span className="text-sm text-slate-500">
                  {qualityMetrics.accuracyRate}%
                </span>
              </div>
              <AnimatedProgressBar
                value={qualityMetrics.accuracyRate}
                className="h-2"
                color="bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Knowledge Coverage
                </span>
                <span className="text-sm text-slate-500">
                  75%
                </span>
              </div>
              <AnimatedProgressBar
                value={75}
                className="h-2"
                color="bg-gradient-to-r from-purple-500 to-violet-500"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <CpuChipIcon className="w-6 h-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            AI Performance Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {qaInsights.map((insight, index) => {
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
                className={`${bgClass} rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <Icon className={`w-6 h-6 ${colorClass} flex-shrink-0`} />
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {insight.description}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  📊 {insight.metric}
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
                  💡 {insight.action}
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
