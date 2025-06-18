'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  QuestionMarkCircleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { Repository } from '@/contexts/RepositoryContext'
import { QuestionAttachment } from '@/types/attachments'
import AttachmentUploader from './AttachmentUploader'

interface QuestionInputProps {
  repository: Repository
  question: string
  onQuestionChange: (question: string) => void
  onSubmit: () => void
  isAsking: boolean
  showSuggestions: boolean
  onToggleSuggestions: () => void
  onSelectSuggestion: (suggestion: string) => void
  enableDeepResearch?: boolean
  onToggleDeepResearch?: () => void
  attachments?: QuestionAttachment[]
  onAttachmentsChange?: (attachments: QuestionAttachment[]) => void
  className?: string
}

export default function QuestionInput({
  repository,
  question,
  onQuestionChange,
  onSubmit,
  isAsking,
  showSuggestions,
  onToggleSuggestions,
  onSelectSuggestion,
  enableDeepResearch = false,
  onToggleDeepResearch,
  attachments = [],
  onAttachmentsChange,
  className = ""
}: QuestionInputProps) {
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300 ${className}`}>
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
              <QuestionMarkCircleIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ask a Question</h2>
          </div>          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSuggestions}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </button>            {onToggleDeepResearch && (
              <div className="relative group">
                <button
                  onClick={onToggleDeepResearch}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    enableDeepResearch
                      ? 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 text-purple-600 dark:text-purple-400 ring-2 ring-purple-200 dark:ring-purple-700/50'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CogIcon className="w-4 h-4" />
                  <span className="font-medium">Thinking Mode</span>
                  {enableDeepResearch && (
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  )}
                </button>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">                  {enableDeepResearch 
                    ? 'Thinking Mode: ON - Shows AI reasoning process'
                    : 'Enable to see step-by-step AI thinking'
                  }
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Deep Research Mode Info */}
      {enableDeepResearch && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <CogIcon className="w-3 h-3 text-white" />
            </div>
            <div>              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                Thinking Mode Enabled
              </h3>              <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                Watch the AI think through your question step by step. Perfect for complex analysis: 
                architecture patterns, cross-file dependencies, performance optimization, and comprehensive codebase understanding.
                You&apos;ll see the real AI reasoning process powered by DeepSeek R1.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-6 space-y-4 rounded-b-2xl">        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your Question
            </label>
            <textarea
              placeholder="What does this code do? How does authentication work? Explain the main architecture... (Enable Deep Research for complex analysis)"
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              rows={3}
              onKeyPress={handleKeyPress}
            />
          </div>

          {/* Attachments */}
          {onAttachmentsChange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Attachments (Optional)
              </label>              <AttachmentUploader
                attachments={attachments}
                onAttachmentsChange={onAttachmentsChange}
                disabled={isAsking}
                repositoryId={repository.id}
              />
            </div>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={isAsking || !question.trim() || !repository}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
        >
          {isAsking ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing Question...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="w-4 h-4" />
              Ask AI Assistant
            </>
          )}
        </Button>      </div>
    </div>
  )
}
