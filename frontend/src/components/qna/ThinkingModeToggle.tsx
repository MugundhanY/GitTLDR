'use client'

import { useState } from 'react'
import { 
  CpuChipIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface ThinkingModeToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  className?: string
}

export default function ThinkingModeToggle({ 
  enabled, 
  onToggle, 
  className = '' 
}: ThinkingModeToggleProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>      <div className="flex items-center gap-2">
        <CpuChipIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          Thinking Mode
        </span>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
        {enabled && (
          <SparklesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-2 animate-pulse" />
        )}
      </label>
      
      {enabled && (
        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
          Deep AI Reasoning
        </span>
      )}
    </div>
  )
}
