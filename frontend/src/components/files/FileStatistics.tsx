'use client'

import { FileStats } from './types'

interface FileStatisticsProps {
  stats: FileStats
  formatFileSize: (bytes?: number) => string
}

export default function FileStatistics({ stats, formatFileSize }: FileStatisticsProps) {
  return (    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Files</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalFiles.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Directories</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDirectories.toLocaleString()}</p>
          </div>
        </div>
      </div>      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Languages</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.languages.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7c0 2.21-3.582 4-8 4s-8-1.79-8-4z" />
            </svg>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Size</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatFileSize(stats.totalSize)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
