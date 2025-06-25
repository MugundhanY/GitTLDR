'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  QuestionMarkCircleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  CogIcon,
  MicrophoneIcon,
  StopIcon
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
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [localAttachments, setLocalAttachments] = useState<QuestionAttachment[]>(attachments)
  const recognitionRef = useRef<any>(null)

  // Sync prop changes (if any) to local state
  useEffect(() => {
    setLocalAttachments(attachments)
  }, [attachments])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true // Enable streaming
      recognitionRef.current.lang = 'en-US'
      recognitionRef.current.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = 0; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }
        setInterimTranscript(interim)
        if (final) {
          onQuestionChange((question || '') + final)
        }
        if (event.results[event.results.length - 1].isFinal) {
          setIsRecording(false)
          setInterimTranscript('')
        }
      }
      recognitionRef.current.onerror = () => { setIsRecording(false); setInterimTranscript('') }
      recognitionRef.current.onend = () => { setIsRecording(false); setInterimTranscript('') }
    }
    if (!isRecording) {
      setIsRecording(true)
      recognitionRef.current.start()
    } else {
      setIsRecording(false)
      recognitionRef.current.stop()
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300 ${className}`}>
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse`}>
              <QuestionMarkCircleIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ask a Question</h2>
          </div>          <div className="flex items-center gap-2">
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
        <div className="bg-gradient-to-r from-purple-100/80 to-purple-200/60 dark:from-purple-900/40 dark:to-purple-800/60 border border-purple-200 dark:border-purple-800 rounded-xl px-5 py-3 mt-3 mb-3 mx-3 flex items-center gap-3 shadow-md">
          <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow">
            <CogIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">Thinking Mode Enabled</span>
            <span className="block text-sm text-purple-700 dark:text-purple-300 mt-0.5">Step-by-step AI reasoning for complex questions.</span>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-6 space-y-4 rounded-b-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your Question
            </label>
            <div className="w-full flex flex-col gap-0 relative">
              <textarea
                placeholder="What does this code do? How does authentication work? Explain the main architecture... (Enable Deep Research for complex analysis)"
                value={interimTranscript ? question + interimTranscript : question}
                onChange={(e) => { onQuestionChange(e.target.value); setInterimTranscript('') }}
                className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-t-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-${enableDeepResearch ? 'purple' : 'blue'}-500 focus:border-transparent resize-none transition-all duration-200 min-h-[56px]`}
                rows={3}
                onKeyPress={handleKeyPress}
                style={{ borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }}
              />
              <div className="flex gap-2 items-center justify-end bg-slate-100 dark:bg-slate-700 border-x border-b border-slate-200 dark:border-slate-600 rounded-b-xl px-3 py-2" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-full bg-white dark:bg-slate-800 hover:bg-${enableDeepResearch ? 'purple' : 'blue'}-100 dark:hover:bg-${enableDeepResearch ? 'purple' : 'blue'}-900/30 transition-colors shadow border border-slate-200 dark:border-slate-600 ${isRecording ? `animate-pulse border-${enableDeepResearch ? 'purple' : 'blue'}-500` : ''}`}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                >
                  {isRecording ? (
                    <span className="inline-flex items-center justify-center w-8 h-8">
                      <svg viewBox="0 0 32 32" fill="currentColor" className={`w-8 h-8 text-${enableDeepResearch ? 'purple' : 'blue'}-600`}>
                        <rect x="8" y="8" width="16" height="16" rx="4" />
                      </svg>
                    </span>
                  ) : (
                    <MicrophoneIcon className={`w-5 h-5 text-${enableDeepResearch ? 'purple' : 'blue'}-600`} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isAsking || isUploadingAttachment || !(interimTranscript ? (question + interimTranscript).trim() : question.trim()) || !repository}
                  className={`p-2 rounded-full bg-${enableDeepResearch ? 'purple' : 'blue'}-500 hover:bg-${enableDeepResearch ? 'purple' : 'blue'}-600 dark:bg-${enableDeepResearch ? 'purple' : 'blue'}-700 dark:hover:bg-${enableDeepResearch ? 'purple' : 'blue'}-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow`}
                  title="Ask AI"
                >
                  {isAsking ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {onAttachmentsChange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Attachments (Optional)
              </label>
              <AttachmentUploader
                attachments={localAttachments}
                onAttachmentsChange={setLocalAttachments}
                disabled={isAsking}
                repositoryId={repository.id}
                onUploadingChange={setIsUploadingAttachment}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
