'use client'

import { 
  DocumentArrowDownIcon,
  CodeBracketIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline'

interface QnAHeaderProps {
  questionsCount: number
  useConfidenceFilter: boolean
  minConfidence: number
  maxConfidence: number
  selectedFileTypes: string[]
  showSuggestions: boolean
  onExport: (format: 'markdown' | 'json' | 'html') => void
  onToggleSuggestions: () => void
  className?: string
}

export default function QnAHeader({
  questionsCount,
  useConfidenceFilter,
  minConfidence,
  maxConfidence,
  selectedFileTypes,
  showSuggestions,
  onExport,
  onToggleSuggestions,
  className = ""
}: QnAHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Questions & Answers</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">
            {questionsCount} questions
          </div>
          {useConfidenceFilter && (
            <div className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              Confidence: {Math.round(minConfidence * 100)}-{Math.round(maxConfidence * 100)}%
            </div>
          )}
          {selectedFileTypes.length > 0 && (
            <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
              <CodeBracketIcon className="w-3 h-3" />
              Files: {selectedFileTypes.slice(0, 3).map(ft => `.${ft}`).join(', ')}{selectedFileTypes.length > 3 ? ` +${selectedFileTypes.length - 3}` : ''}
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Suggestions Toggle */}
        <button
          onClick={onToggleSuggestions}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            showSuggestions
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
        </button>

        {/* Export Menu */}
        <div className="relative group">
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <DocumentArrowDownIcon className="w-4 h-4" />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <button
              onClick={() => onExport('markdown')}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Export as Markdown
            </button>
            <button
              onClick={() => onExport('html')}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Export as HTML
            </button>
            <button
              onClick={() => onExport('json')}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Export as JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
