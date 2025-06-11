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
  return (
    <div className="flex gap-4 items-center">
      {/* Search Input - Compact */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-10 pr-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
        {/* Language Filter - Compact */}
      {availableLanguages.length > 0 && (
        <div className="flex-shrink-0">
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer shadow-sm min-w-[120px]"
          >
            <option value="all">All Languages</option>
            {availableLanguages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
