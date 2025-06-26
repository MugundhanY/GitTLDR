'use client'

import { useState } from 'react'
import { 
  FunnelIcon, 
  StarIcon, 
  XMarkIcon, 
  CodeBracketIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline'

interface QnAFilterPanelProps {
  // Search and basic filters
  searchQuery: string
  onSearchChange: (query: string) => void
  filterFavorites: boolean
  onToggleFavorites: () => void
  
  // Category filter
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  
  // Tags filter
  allTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  
  // File type filter
  allFileTypes: string[]
  selectedFileTypes: string[]
  onToggleFileType: (fileType: string) => void
  
  // Confidence filter
  useConfidenceFilter: boolean
  onToggleConfidenceFilter: () => void
  minConfidence: number
  maxConfidence: number
  onConfidenceChange: (min: number, max: number) => void
  
  // Actions
  onClearFilters: () => void
  showFilters: boolean
  onToggleFilters: () => void
}

export default function QnAFilterPanel({
  searchQuery,
  onSearchChange,
  filterFavorites,
  onToggleFavorites,
  categories,
  selectedCategory,
  onCategoryChange,
  allTags,
  selectedTags,
  onToggleTag,
  allFileTypes,
  selectedFileTypes,
  onToggleFileType,
  useConfidenceFilter,
  onToggleConfidenceFilter,
  minConfidence,
  maxConfidence,
  onConfidenceChange,
  onClearFilters,
  showFilters,
  onToggleFilters
}: QnAFilterPanelProps) {
  
  return (
    <div>
      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 dark:bg-slate-950/80 rounded-2xl shadow p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
          {/* Basic Filters Row */}
          <div className="flex items-center justify-between mb-2 w-full">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Favorites Filter */}
              <button
                onClick={onToggleFavorites}
                className={`flex items-center gap-2 px-4 py-2 text-base rounded-xl font-semibold transition-all shadow-sm border-2 ${
                  filterFavorites 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600'
                    : 'bg-white/80 dark:bg-green-950/40 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/40'
                }`}
              >
                <StarIcon className="w-5 h-5" />
                Favorites
              </button>
              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="px-3 py-2 text-base bg-white/80 dark:bg-green-950/40 border-2 border-green-200 dark:border-green-800 rounded-xl text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-400 focus:border-green-400 shadow-sm font-semibold"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Clear All Button */}
            <button
              onClick={onClearFilters}
              className="text-sm text-green-700 dark:text-green-200 hover:text-green-900 dark:hover:text-green-100 font-bold px-4 py-2 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-100 dark:bg-green-900/30 transition-all shadow-sm"
            >
              Clear All
            </button>
          </div>
          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-green-800 dark:text-green-200 mb-2 uppercase tracking-wide">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all shadow font-semibold ${
                      selectedTags.includes(tag)
                        ? 'bg-green-500 text-white border-2 border-green-600 scale-105'
                        : 'bg-white/80 dark:bg-green-950/40 text-green-700 dark:text-green-200 border-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 10 && (
                  <span className="text-xs text-green-400 py-1">+{allTags.length - 10} more</span>
                )}
              </div>
            </div>
          )}
          {/* File Type Filter */}
          {allFileTypes.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-green-800 dark:text-green-200 mb-2 uppercase tracking-wide">
                File Types
              </label>
              <div className="flex flex-wrap gap-2">
                {allFileTypes.slice(0, 10).map(fileType => (
                  <button
                    key={fileType}
                    onClick={() => onToggleFileType(fileType)}
                    className={`px-3 py-1.5 text-sm rounded-xl transition-all shadow font-mono font-semibold ${
                      selectedFileTypes.includes(fileType)
                        ? 'bg-green-600 text-white border-2 border-green-700 scale-105'
                        : 'bg-white/80 dark:bg-green-950/40 text-green-700 dark:text-green-200 border-2 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/40'
                    }`}
                  >
                    .{fileType}
                  </button>
                ))}
                {allFileTypes.length > 10 && (
                  <span className="text-xs text-green-400 py-1">+{allFileTypes.length - 10} more</span>
                )}
              </div>
            </div>
          )}
          {/* Confidence Level Filter - moved below file types */}
          {allFileTypes.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-green-800 dark:text-green-200 uppercase tracking-wide">
                  AI Confidence Level
                </label>
                <button
                  onClick={onToggleConfidenceFilter}
                  className={`px-3 py-1.5 text-sm rounded-xl transition-all font-bold shadow border-2 ${
                    useConfidenceFilter
                      ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 border-green-400 dark:border-green-700'
                      : 'bg-white/80 dark:bg-green-950/40 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/40'
                  }`}
                  title="Filter answers by AI confidence scores. Higher confidence indicates more reliable answers."
                >
                  {useConfidenceFilter ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {!useConfidenceFilter && (
                <p className="text-xs text-green-700 dark:text-green-200 mb-2">
                  Filter answers by AI confidence scores (0-100%). Higher confidence indicates more reliable answers.
                </p>
              )}
              {useConfidenceFilter && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-green-700 dark:text-green-200 w-10 font-semibold">Min:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={minConfidence}
                      onChange={(e) => onConfidenceChange(parseFloat(e.target.value), maxConfidence)}
                      className="flex-1 h-3 accent-green-500 bg-green-200 dark:bg-green-800 rounded-full appearance-none cursor-pointer slider border-2 border-green-300 dark:border-green-700"
                      style={{
                        background: 'linear-gradient(90deg, #22c55e 0%, #bbf7d0 100%)',
                        boxShadow: '0 2px 8px 0 #22c55e33',
                      }}
                    />
                    <span className="text-xs text-green-700 dark:text-green-200 w-10 text-right font-semibold">
                      {Math.round(minConfidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-green-700 dark:text-green-200 w-10 font-semibold">Max:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={maxConfidence}
                      onChange={(e) => onConfidenceChange(minConfidence, parseFloat(e.target.value))}
                      className="flex-1 h-3 accent-green-500 bg-green-200 dark:bg-green-800 rounded-full appearance-none cursor-pointer slider border-2 border-green-300 dark:border-green-700"
                      style={{
                        background: 'linear-gradient(90deg, #bbf7d0 0%, #22c55e 100%)',
                        boxShadow: '0 2px 8px 0 #22c55e33',
                      }}
                    />
                    <span className="text-xs text-green-700 dark:text-green-200 w-10 text-right font-semibold">
                      {Math.round(maxConfidence * 100)}%
                    </span>
                  </div>
                  {/* Quick filter buttons */}
                  <div className="flex gap-3 text-xs mt-2">
                    <button
                      onClick={() => onConfidenceChange(0.8, 1.0)}
                      className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-xl transition-all shadow font-bold"
                    >
                      High (80-100%)
                    </button>
                    <button
                      onClick={() => onConfidenceChange(0.5, 0.8)}
                      className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300 rounded-xl transition-all shadow font-bold"
                    >
                      Medium (50-80%)
                    </button>
                    <button
                      onClick={() => onConfidenceChange(0.0, 0.5)}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 rounded-xl transition-all shadow font-bold"
                    >
                      Low (0-50%)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
