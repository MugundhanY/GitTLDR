'use client'

import { useCallback, useState, useEffect } from 'react'
import { FileItem } from './types'

interface FileSearchAndFiltersProps {
  searchQuery: string
  selectedLanguage: string
  availableLanguages: string[]
  files: FileItem[]
  onSearchChange: (value: string) => void
  onLanguageChange: (language: string) => void
  onSearchClear?: () => void
  onAdvancedFiltersApply?: () => void
  onAdvancedFiltersClear?: () => void
  onSearchModeChange?: (mode: 'normal' | 'regex' | 'exact', caseSensitive: boolean, searchInContent: boolean) => void
  onFileFiltersChange?: (filters: { minFileSize?: string, maxFileSize?: string, selectedExtensions?: string[] }) => void
  // Add props to receive state from parent instead of managing locally
  searchMode?: 'normal' | 'regex' | 'exact'
  caseSensitive?: boolean
  searchInContent?: boolean
  minFileSize?: string
  maxFileSize?: string
  selectedExtensions?: string[]
}

export default function FileSearchAndFilters({
  searchQuery,
  selectedLanguage,
  availableLanguages,
  files,
  onSearchChange,
  onLanguageChange,
  onSearchClear,
  onAdvancedFiltersApply,
  onAdvancedFiltersClear,
  onSearchModeChange,
  onFileFiltersChange,
  searchMode: parentSearchMode = 'normal',
  caseSensitive: parentCaseSensitive = false,
  searchInContent: parentSearchInContent = false,
  minFileSize: parentMinFileSize = '',
  maxFileSize: parentMaxFileSize = '',
  selectedExtensions: parentSelectedExtensions = []
}: FileSearchAndFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  
  // Use parent state if available, otherwise use local state
  const [localSearchMode, setLocalSearchMode] = useState<'normal' | 'regex' | 'exact'>('normal')
  const [localCaseSensitive, setLocalCaseSensitive] = useState(false)
  const [localSearchInContent, setLocalSearchInContent] = useState(false)
  
  // Use parent state if provided, otherwise use local state
  const searchMode = parentSearchMode
  const caseSensitive = parentCaseSensitive
  const searchInContent = parentSearchInContent
  
  // Use parent state for file filters
  const minFileSize = parentMinFileSize
  const maxFileSize = parentMaxFileSize
  const selectedExtensions = parentSelectedExtensions
    // Update search mode and notify parent
  const handleSearchModeChange = (mode: 'normal' | 'regex' | 'exact') => {
    setLocalSearchMode(mode)
    if (onSearchModeChange) {
      onSearchModeChange(mode, caseSensitive, searchInContent)
    }
  }
  
  const handleCaseSensitiveChange = (checked: boolean) => {
    setLocalCaseSensitive(checked)
    if (onSearchModeChange) {
      onSearchModeChange(searchMode, checked, searchInContent)
    }
  }
  
  const handleSearchInContentChange = (checked: boolean) => {
    setLocalSearchInContent(checked)
    if (onSearchModeChange) {
      onSearchModeChange(searchMode, caseSensitive, checked)
    }
  }

  // File filter handlers
  const handleMinFileSizeChange = (value: string) => {
    if (onFileFiltersChange) {
      onFileFiltersChange({ minFileSize: value })
    }
  }

  const handleMaxFileSizeChange = (value: string) => {
    if (onFileFiltersChange) {
      onFileFiltersChange({ maxFileSize: value })
    }
  }

  const handleToggleExtension = (ext: string) => {
    const newExtensions = selectedExtensions.includes(ext) 
      ? selectedExtensions.filter(e => e !== ext)
      : [...selectedExtensions, ext]
    
    if (onFileFiltersChange) {
      onFileFiltersChange({ selectedExtensions: newExtensions })
    }
  }
  
  const handleClearSearch = () => {
    if (onSearchClear) {
      onSearchClear() // Use the optimized clear function if provided
    } else {
      onSearchChange('') // Fallback to regular change
    }
  }

  // Get unique file extensions
  const availableExtensions = Array.from(
    new Set(
      files
        .filter(f => f.type === 'file' && f.name.includes('.'))
        .map(f => f.name.split('.').pop())
        .filter((ext): ext is string => Boolean(ext))
        .map(ext => ext.toLowerCase())
    )
  ).sort()

  const parseFileSize = (sizeStr: string): number => {
    if (!sizeStr) return 0
    const num = parseFloat(sizeStr)
    const unit = sizeStr.toLowerCase().slice(-2)
      switch (unit) {
      case 'kb': return num * 1024
      case 'mb': return num * 1024 * 1024
      case 'gb': return num * 1024 * 1024 * 1024
      default: return num
    }
  }
  
  const performAdvancedSearch = () => {
    // Just trigger the parent to enable advanced search mode
    if (onAdvancedFiltersApply) {
      onAdvancedFiltersApply()
    }
    setIsAdvancedOpen(false)
  }
  
  const resetAdvancedFilters = () => {
    // Reset search mode and options
    if (onSearchModeChange) {
      onSearchModeChange('normal', false, false)
    }
    
    // Reset file filters
    if (onFileFiltersChange) {
      onFileFiltersChange({ 
        minFileSize: '',
        maxFileSize: '',
        selectedExtensions: [] 
      })
    }
    
    // Call the parent's clear function to reset all advanced filter state
    if (onAdvancedFiltersClear) {
      onAdvancedFiltersClear()
    }
    
    setIsAdvancedOpen(false)
  }
  
  const toggleExtension = (ext: string) => {
    handleToggleExtension(ext)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        {/* Search Input with enhanced animations */}
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder={`Search files and folders${searchInContent ? ' + summaries' : ''}... ${searchMode === 'regex' ? '(Regex mode)' : searchMode === 'exact' ? '(Exact match)' : ''}`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-10 pr-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm focus:shadow-lg hover:shadow-md"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className={`h-4 w-4 transition-all duration-300 ${searchQuery ? 'text-emerald-500 scale-110' : 'text-slate-400 group-hover:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500 transition-all duration-200 group/clear animate-in fade-in"
              title="Clear search"
            >
              <svg className="h-3.5 w-3.5 group-hover/clear:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>        {/* Language Filter with enhanced styling */}
        {availableLanguages.length > 0 && (
          <div className="flex-shrink-0">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 cursor-pointer shadow-sm min-w-[120px] hover:shadow-md focus:shadow-lg [&>option]:bg-emerald-50 [&>option]:text-emerald-900 dark:[&>option]:bg-emerald-900 dark:[&>option]:text-emerald-100 [&>option:checked]:bg-emerald-500 [&>option:checked]:text-white"
            >
              <option value="all" className="bg-emerald-50 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">All Languages</option>
              {availableLanguages.map(lang => (
                <option key={lang} value={lang} className="bg-emerald-50 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">{lang}</option>
              ))}
            </select>
          </div>
        )}        {/* Advanced Filters Button with status indicator */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`relative h-9 px-3 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2 ${
              isAdvancedOpen || selectedExtensions.length > 0 || searchMode !== 'normal' || caseSensitive || searchInContent || minFileSize || maxFileSize
                ? 'bg-amber-500 text-white hover:bg-amber-600 scale-105'
                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
            title="Advanced Filters"
          >
            <svg className={`h-4 w-4 transition-all duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters
            {/* Active indicator */}
            {(selectedExtensions.length > 0 || searchMode !== 'normal' || caseSensitive || searchInContent || minFileSize || maxFileSize) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900"></div>
            )}
          </button>
        </div>
      </div>{/* Advanced Filters Panel with smooth slide-in animation */}
      {isAdvancedOpen && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4 animate-in slide-in-from-top duration-300 fade-in shadow-lg">
          {/* Search Mode */}
          <div className="animate-in slide-in-from-left duration-400 delay-100">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search Mode
            </label>
            <div className="flex gap-2">
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'regex', label: 'Regex' },
                { value: 'exact', label: 'Exact' }
              ].map((mode, index) => (                <button
                  key={mode.value}
                  onClick={() => handleSearchModeChange(mode.value as any)}
                  className={`px-3 py-1 text-sm rounded-md transition-all duration-200 hover:scale-105 transform ${
                    searchMode === mode.value
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'
                  }`}
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Options */}
          <div className="flex gap-4 animate-in slide-in-from-left duration-400 delay-200">            <label className="flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors duration-200">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => handleCaseSensitiveChange(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 transition-all duration-200"
              />
              <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Case sensitive</span>
            </label>
            <label className="flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-md transition-colors duration-200">
              <input
                type="checkbox"
                checked={searchInContent}
                onChange={(e) => handleSearchInContentChange(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 transition-all duration-200"
              />
              <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Search in summaries</span>
            </label>
          </div>

          {/* File Size Filters */}
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left duration-400 delay-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Size
              </label>              <input
                type="text"
                value={minFileSize}
                onChange={(e) => handleMinFileSizeChange(e.target.value)}
                placeholder="e.g., 1KB, 10MB"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 hover:shadow-sm focus:shadow-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Size
              </label>              <input
                type="text"
                value={maxFileSize}
                onChange={(e) => handleMaxFileSizeChange(e.target.value)}
                placeholder="e.g., 1MB, 100MB"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 hover:shadow-sm focus:shadow-md"
              />
            </div>
          </div>          {/* File Extensions */}
          {availableExtensions.length > 0 && (
            <div className="animate-in slide-in-from-left duration-400 delay-400">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                File Extensions
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableExtensions.map((ext: string, index: number) => (
                  <button
                    key={ext}
                    onClick={() => toggleExtension(ext)}
                    className={`px-2 py-1 text-xs rounded-md transition-all duration-200 hover:scale-105 transform ${
                      selectedExtensions.includes(ext)
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'
                    }`}
                    style={{ animationDelay: `${400 + (index * 20)}ms` }}
                  >
                    .{ext}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 animate-in slide-in-from-bottom duration-400 delay-500">
            <button
              onClick={performAdvancedSearch}
              className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-md hover:bg-emerald-600 transition-all duration-200 hover:scale-105 transform shadow-md hover:shadow-lg"
            >
              Apply Filters
            </button>
            <button
              onClick={resetAdvancedFilters}
              className="px-4 py-2 bg-slate-500 text-white text-sm rounded-md hover:bg-slate-600 transition-all duration-200 hover:scale-105 transform shadow-md hover:shadow-lg"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
