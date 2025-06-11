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
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Language Distribution
      </h3>
      
      {/* Compact horizontal bar */}
      <div className="mb-3">
        <div className="flex rounded-lg overflow-hidden h-2 bg-slate-200 dark:bg-slate-700">
          {stats.languages.slice(0, 6).map((lang, index) => {
            const percentage = (lang.count / stats.totalFiles) * 100
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
            const color = colors[index % colors.length]
            
            return (
              <div
                key={lang.name}
                className="transition-all duration-300 hover:opacity-80"
                style={{ width: `${percentage}%`, backgroundColor: color }}
                title={`${lang.name}: ${percentage.toFixed(1)}%`}
              />
            )
          })}
        </div>
      </div>

      {/* Compact legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {stats.languages.slice(0, 6).map((lang, index) => {
          const percentage = ((lang.count / stats.totalFiles) * 100).toFixed(1)
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
          const color = colors[index % colors.length]
          
          return (
            <div key={lang.name} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                {lang.name || 'Unknown'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-auto">
                {percentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
