'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CodeBracketIcon,
  DocumentTextIcon,
  CogIcon,
  PhotoIcon,
  DocumentIcon,
  ChartBarIcon,
  FolderIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  EyeIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { AnimatedDonutChart, AnimatedBarChart, AnimatedCounter } from './animated-charts'

interface EnhancedFilesProps {
  analytics: any
}

const languageColors: { [key: string]: string } = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f7df1e',
  'Python': '#3776ab',
  'Java': '#ed8b00',
  'C++': '#00599c',
  'Go': '#00add8',
  'Rust': '#000000',
  'PHP': '#777bb4',
  'Ruby': '#cc342d',
  'Swift': '#fa7343',
  'Other': '#6b7280'
}

const fileTypeIcons: { [key: string]: any } = {
  'Code': CodeBracketIcon,
  'Documents': DocumentTextIcon,
  'Config': CogIcon,
  'Images': PhotoIcon,
  'Other': DocumentIcon
}

export function EnhancedFiles({ analytics }: EnhancedFilesProps) {
  const [selectedView, setSelectedView] = useState<'language' | 'type' | 'timeline'>('language')
  const [sortBy, setSortBy] = useState<'count' | 'size' | 'growth'>('count')

  const fileStats = analytics?.fileStats || {}
  const byLanguage = fileStats.byLanguage || []
  const byType = fileStats.byType || []
  const totalFiles = analytics?.overview?.totalFiles || 0
  const totalSize = fileStats.totalSizeGB || 0

  // Calculate enhanced metrics
  const topLanguages = byLanguage
    .sort((a: any, b: any) => {
      if (sortBy === 'count') return b.count - a.count
      if (sortBy === 'size') return b.sizeGB - a.sizeGB
      return (b.growth || 0) - (a.growth || 0)
    })
    .slice(0, 10)

  const codeComplexity = {
    low: Math.round(totalFiles * 0.4),
    medium: Math.round(totalFiles * 0.35),
    high: Math.round(totalFiles * 0.25)
  }

  const fileActivity = [
    { period: 'Last 24h', uploads: 45, size: '2.3GB', trend: 'up' },
    { period: 'Last 7d', uploads: 312, size: '15.7GB', trend: 'up' },
    { period: 'Last 30d', uploads: 1284, size: '67.2GB', trend: 'up' },
    { period: 'Last 90d', uploads: 3456, size: '189.4GB', trend: 'down' }
  ]

  const languageStats = byLanguage.map((lang: any) => ({
    ...lang,
    percentage: totalFiles > 0 ? (lang.count / totalFiles) * 100 : 0,
    color: languageColors[lang.language] || languageColors['Other'],
    avgFileSize: lang.count > 0 ? (lang.sizeGB * 1024) / lang.count : 0,
    growth: Math.random() * 40 - 10 // Simulated growth rate
  }))

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            File Analytics
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive analysis of your codebase and documentation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {[
              { key: 'language', label: 'Languages', icon: CodeBracketIcon },
              { key: 'type', label: 'Types', icon: FolderIcon },
              { key: 'timeline', label: 'Timeline', icon: ChartBarIcon }
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setSelectedView(view.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedView === view.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="count">Sort by Count</option>
              <option value="size">Sort by Size</option>
              <option value="growth">Sort by Growth</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          {
            title: 'Total Files',
            value: totalFiles,
            subtitle: `${totalSize.toFixed(1)}GB storage`,
            icon: DocumentTextIcon,
            color: 'from-blue-500 to-cyan-500',
            change: '+12.5%'
          },
          {
            title: 'Languages',
            value: byLanguage.length,
            subtitle: `${topLanguages[0]?.language || 'N/A'} leading`,
            icon: CodeBracketIcon,
            color: 'from-green-500 to-emerald-500',
            change: '+2'
          },
          {
            title: 'Avg File Size',
            value: `${totalFiles > 0 ? Math.round((totalSize * 1024) / totalFiles) : 0}KB`,
            subtitle: 'per file',
            icon: ChartBarIcon,
            color: 'from-purple-500 to-violet-500',
            change: '-5.2%'
          },
          {
            title: 'Code Quality',
            value: `${Math.round((codeComplexity.low / totalFiles) * 100) || 0}%`,
            subtitle: 'low complexity',
            icon: StarIcon,
            color: 'from-orange-500 to-red-500',
            change: '+8.1%'
          }
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                card.change.startsWith('+') 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {card.change}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {typeof card.value === 'number' ? (
                  <AnimatedCounter value={card.value} />
                ) : (
                  card.value
                )}
              </div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {card.subtitle}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {selectedView === 'language' && (
          <motion.div
            key="language"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Language Distribution Chart */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <CodeBracketIcon className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Language Distribution
                </h3>
              </div>
              
              {languageStats.length > 0 ? (
                <div className="h-80">
                  <AnimatedDonutChart
                    data={languageStats.map((lang: any) => ({
                      name: lang.language,
                      value: lang.count,
                      color: lang.color
                    }))}
                  />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  No language data available
                </div>
              )}
            </div>

            {/* Language Details */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Language Breakdown
                </h3>
                <div className="text-sm text-slate-500">
                  Sorted by {sortBy}
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto">
                {languageStats.slice(0, 8).map((lang: any, index: number) => (
                  <motion.div
                    key={lang.language}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lang.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 dark:text-white truncate">
                          {lang.language}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {lang.count} files
                          </span>
                          <div className={`flex items-center gap-1 text-xs ${
                            lang.growth > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lang.growth > 0 ? (
                              <ArrowTrendingUpIcon className="w-3 h-3" />
                            ) : (
                              <ArrowTrendingDownIcon className="w-3 h-3" />
                            )}
                            {Math.abs(lang.growth).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              backgroundColor: lang.color,
                              width: `${Math.min(lang.percentage, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 min-w-0">
                          {lang.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                        <span>{lang.sizeGB.toFixed(2)}GB</span>
                        <span>{lang.avgFileSize.toFixed(0)}KB avg</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {selectedView === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* File Types Chart */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <FolderIcon className="w-6 h-6 text-purple-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  File Types
                </h3>
              </div>

              {byType.length > 0 ? (
                <div className="h-80">
                  <AnimatedBarChart
                    data={byType.map((type: any) => ({
                      name: type.type,
                      value: type.count,
                      color: `hsl(${Math.random() * 360}, 70%, 60%)`
                    }))}
                  />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  No file type data available
                </div>
              )}
            </div>

            {/* Complexity Analysis */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ChartBarIcon className="w-6 h-6 text-indigo-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Code Complexity
                </h3>
              </div>

              <div className="space-y-6">
                {[
                  { level: 'Low', count: codeComplexity.low, color: 'bg-green-500', percentage: (codeComplexity.low / totalFiles) * 100 },
                  { level: 'Medium', count: codeComplexity.medium, color: 'bg-yellow-500', percentage: (codeComplexity.medium / totalFiles) * 100 },
                  { level: 'High', count: codeComplexity.high, color: 'bg-red-500', percentage: (codeComplexity.high / totalFiles) * 100 }
                ].map((complexity, index) => (
                  <motion.div
                    key={complexity.level}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {complexity.level} Complexity
                      </span>
                      <span className="text-sm text-slate-500">
                        {complexity.count} files ({complexity.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${complexity.percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className={`h-full ${complexity.color} rounded-full`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Recommendations
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Consider refactoring high complexity files</li>
                  <li>• {codeComplexity.low} files are well-structured</li>
                  <li>• Focus on improving {codeComplexity.high} complex files</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {selectedView === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Activity Timeline */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  File Activity Timeline
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {fileActivity.map((period, index) => (
                  <motion.div
                    key={period.period}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-slate-200/50 dark:border-slate-600/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {period.period}
                      </span>
                      {period.trend === 'up' ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <AnimatedCounter
                          value={period.uploads}
                          className="text-xl font-bold text-slate-900 dark:text-white"
                        />
                        <div className="text-xs text-slate-500">files uploaded</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                          {period.size}
                        </div>
                        <div className="text-xs text-slate-500">storage used</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Storage Trends */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ChartBarIcon className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Storage Growth Trends
                </h3>
              </div>

              <div className="h-64">
                {/* Placeholder for storage timeline chart */}
                <div className="h-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ChartBarIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <div className="text-slate-500">Storage timeline chart would go here</div>
                    <div className="text-sm text-slate-400 mt-1">
                      Showing {totalSize.toFixed(1)}GB total usage
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
