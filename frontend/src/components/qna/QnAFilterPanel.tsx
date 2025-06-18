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
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onToggleFilters}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle filters"
        >
          <FunnelIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
          {/* Basic Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Favorites Filter */}
              <button
                onClick={onToggleFavorites}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterFavorites 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <StarIcon className="w-4 h-4" />
                Favorites Only
              </button>
              
              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="px-2 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Clear All
            </button>
          </div>
          
          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-1">
                {allTags.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 10 && (
                  <span className="text-xs text-slate-400 py-1">+{allTags.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {/* File Type Filter */}
          {allFileTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                File Types
              </label>
              <div className="flex flex-wrap gap-1">
                {allFileTypes.slice(0, 10).map(fileType => (
                  <button
                    key={fileType}
                    onClick={() => onToggleFileType(fileType)}
                    className={`px-2 py-1 text-xs rounded transition-colors font-mono ${
                      selectedFileTypes.includes(fileType)
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    .{fileType}
                  </button>
                ))}
                {allFileTypes.length > 10 && (
                  <span className="text-xs text-slate-400 py-1">+{allFileTypes.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {/* Confidence Level Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                AI Confidence Level
              </label>
              <button
                onClick={onToggleConfidenceFilter}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  useConfidenceFilter
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Filter answers by AI confidence scores. Higher confidence indicates more reliable answers."
              >
                {useConfidenceFilter ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {!useConfidenceFilter && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Filter answers by AI confidence scores (0-100%). Higher confidence indicates more reliable answers.
              </p>
            )}
            
            {useConfidenceFilter && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-8">Min:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={minConfidence}
                    onChange={(e) => onConfidenceChange(parseFloat(e.target.value), maxConfidence)}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">
                    {Math.round(minConfidence * 100)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-8">Max:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={maxConfidence}
                    onChange={(e) => onConfidenceChange(minConfidence, parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">
                    {Math.round(maxConfidence * 100)}%
                  </span>
                </div>
                
                {/* Quick filter buttons */}
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => onConfidenceChange(0.8, 1.0)}
                    className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 rounded transition-colors"
                  >
                    High (80-100%)
                  </button>
                  <button
                    onClick={() => onConfidenceChange(0.5, 0.8)}
                    className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300 rounded transition-colors"
                  >
                    Medium (50-80%)
                  </button>
                  <button
                    onClick={() => onConfidenceChange(0.0, 0.5)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 rounded transition-colors"
                  >
                    Low (0-50%)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
