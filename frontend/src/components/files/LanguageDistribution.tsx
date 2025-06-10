'use client'

import { FileStats } from './types'

interface LanguageDistributionProps {
  stats: FileStats
}

export default function LanguageDistribution({ stats }: LanguageDistributionProps) {
  if (stats.languages.length === 0) {
    return null
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
        <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        Languages
      </h3>
      
      {/* GitHub-style horizontal bar */}
      <div className="mb-4">
        <div className="flex rounded-md overflow-hidden h-2 bg-slate-200 dark:bg-slate-700">
          {stats.languages.slice(0, 8).map((lang, index) => {
            const percentage = (lang.count / stats.totalFiles) * 100
            const colors = [
              '#3b82f6', // blue
              '#10b981', // emerald
              '#f59e0b', // amber
              '#8b5cf6', // violet
              '#ec4899', // pink
              '#6366f1', // indigo
              '#ef4444', // red
              '#06b6d4', // cyan
            ]
            const color = colors[index % colors.length]
            
            return (
              <div
                key={lang.name}
                className="transition-all duration-500 hover:opacity-80"
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: color,
                }}
                title={`${lang.name}: ${percentage.toFixed(1)}%`}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
        {stats.languages.slice(0, 8).map((lang, index) => {
          const percentage = ((lang.count / stats.totalFiles) * 100).toFixed(1)
          const colors = [
            '#3b82f6', // blue
            '#10b981', // emerald
            '#f59e0b', // amber
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#6366f1', // indigo
            '#ef4444', // red
            '#06b6d4', // cyan
          ]
          const color = colors[index % colors.length]
          
          return (
            <div key={lang.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-900 dark:text-white font-medium truncate">
                {lang.name || 'Unknown'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs ml-auto">
                {percentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
