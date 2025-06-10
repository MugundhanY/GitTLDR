'use client'

import { RepositoryInfo } from './types'

interface FileHeaderProps {
  selectedRepository: RepositoryInfo
}

export default function FileHeader({ selectedRepository }: FileHeaderProps) {
  return (    <div className="mb-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            File Explorer
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-400">{selectedRepository.full_name}</span>
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-xs text-emerald-700 dark:text-emerald-300">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
