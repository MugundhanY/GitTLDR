'use client'

import { useCallback } from 'react'
import { Breadcrumb } from './types'

interface FileSearchAndFiltersProps {
  searchQuery: string
  selectedLanguage: string
  availableLanguages: string[]
  breadcrumbs: Breadcrumb[]
  onSearchChange: (value: string) => void
  onLanguageChange: (language: string) => void
  onRefresh: () => void
  onBreadcrumbClick: (path: string) => void
}

export default function FileSearchAndFilters({
  searchQuery,
  selectedLanguage,
  availableLanguages,
  breadcrumbs,
  onSearchChange,
  onLanguageChange,
  onRefresh,
  onBreadcrumbClick
}: FileSearchAndFiltersProps) {
  return (    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search files and directories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-300"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-300 cursor-pointer"
          >
            <option value="all">All Languages</option>
            {availableLanguages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>          <button
            onClick={onRefresh}
            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <nav className="flex items-center space-x-3 text-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="font-medium">Location:</span>
            </div>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center">
                {index > 0 && (
                  <svg className="w-4 h-4 text-slate-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <button
                  onClick={() => onBreadcrumbClick(crumb.path)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 font-medium ${
                    index === breadcrumbs.length - 1 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
