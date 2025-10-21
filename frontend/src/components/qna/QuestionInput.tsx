'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  QuestionMarkCircleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
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
  attachments?: QuestionAttachment[]
  onAttachmentsChange?: (attachments: QuestionAttachment[] | ((prev: QuestionAttachment[]) => QuestionAttachment[])) => void
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
  attachments = [],
  onAttachmentsChange,
  className = ""
}: QuestionInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Handle functional updates from AttachmentUploader
  const handleAttachmentsChange = useCallback((attachmentsOrUpdater: QuestionAttachment[] | ((prev: QuestionAttachment[]) => QuestionAttachment[])) => {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachmentsOrUpdater)
    }
  }, [onAttachmentsChange])

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
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 rounded-t-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-2 lg:gap-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse`}>
              <QuestionMarkCircleIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap">Ask a Question</h2>
          </div>
          <div className="flex flex-row flex-wrap gap-2 mt-3 lg:mt-0 lg:flex-nowrap lg:ml-auto">
            <button
              onClick={onToggleSuggestions}
              className={`px-3 py-2 lg:px-4 lg:py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                showSuggestions
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              style={{ minWidth: 'unset' }}
            >
              <SparklesIcon className="w-4 h-4" />
              {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
            </button>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-6 space-y-4 rounded-b-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your Question
            </label>
            <div className="w-full flex flex-col gap-0 relative">
              <textarea
                placeholder="What does this code do? How does authentication work? Explain the main architecture..."
                value={interimTranscript ? question + interimTranscript : question}
                onChange={(e) => { onQuestionChange(e.target.value); setInterimTranscript('') }}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-t-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 min-h-[56px]"
                rows={3}
                onKeyPress={handleKeyPress}
                style={{ borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }}
              />
              <div className="flex gap-2 items-center justify-end bg-slate-100 dark:bg-slate-700 border-x border-b border-slate-200 dark:border-slate-600 rounded-b-xl px-3 py-2" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-full bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors shadow border border-slate-200 dark:border-slate-600 ${isRecording ? 'animate-pulse border-blue-500' : ''}`}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                >
                  {isRecording ? (
                    <span className="inline-flex items-center justify-center w-8 h-8">
                      <svg viewBox="0 0 32 32" fill="currentColor" className="w-8 h-8 text-blue-600">
                        <rect x="8" y="8" width="16" height="16" rx="4" />
                      </svg>
                    </span>
                  ) : (
                    <MicrophoneIcon className="w-5 h-5 text-blue-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isAsking || isUploadingAttachment || !(interimTranscript ? (question + interimTranscript).trim() : question.trim()) || !repository}
                  className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow"
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
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
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
