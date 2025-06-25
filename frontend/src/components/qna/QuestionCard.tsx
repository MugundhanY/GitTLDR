'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  SpeakerWaveIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import MarkdownContent from '@/components/ui/MarkdownContent'
import QuestionMetadata from '@/components/ui/QuestionMetadata'
import LazyCodeContent from '@/components/qna/LazyCodeContent'
import ReasoningSteps from '@/components/qna/ReasoningSteps'
import AttachmentDisplay from '@/components/qna/AttachmentDisplay'
import { Question, FileContent } from '@/hooks/useQnAFiltering'
import { Repository } from '@/contexts/RepositoryContext'

interface QuestionCardProps {
  question: Question
  selectedRepository: Repository
  expandedFiles: { [key: string]: boolean }
  loadingFiles: { [key: string]: boolean }
  fileContents: { [key: string]: FileContent }
  copiedStates: { [key: string]: boolean }
  languageMap: { [key: string]: string }
  getStatusIcon: (status: string) => React.ReactElement
  getStatusColor: (status: string) => string
  toggleFileExpansion: (filePath: string) => void
  copyToClipboard: (text: string, filePath: string) => void
  formatCodeContent: (content: string, language: string) => string
  getLanguageColor: (language: string) => string
  onQuestionUpdate: (question: Question) => void
  getFollowUpSuggestions: (question: Question) => string[]
  handleSelectFollowUp: (originalQuestion: Question, followUpText: string, onQuestionChange: (text: string) => void) => void
  isPageVisible?: boolean
  onToggleFavorite?: (question: Question) => void
  useConfidenceFilter?: boolean
}

const QuestionCard = memo(({
  question,
  selectedRepository,
  expandedFiles,
  loadingFiles,
  fileContents,
  copiedStates,
  languageMap,
  getStatusIcon,
  getStatusColor,
  toggleFileExpansion,
  copyToClipboard,
  formatCodeContent,
  getLanguageColor,
  onQuestionUpdate,
  getFollowUpSuggestions,
  handleSelectFollowUp,
  isPageVisible = true,
  useConfidenceFilter = false
}: QuestionCardProps) => {
  const [isInView, setIsInView] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [showFullQuestion, setShowFullQuestion] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Animate card expansion/collapse
  const detailsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.style.transition = 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s';
      detailsRef.current.style.overflow = 'hidden';
      detailsRef.current.style.maxHeight = isExpanded ? detailsRef.current.scrollHeight + 'px' : '0px';
      detailsRef.current.style.opacity = isExpanded ? '1' : '0';
    }
  }, [isExpanded]);

  // Handle favorite toggle
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the question when clicking favorite
    const updatedQuestion = {
      ...question,
      isFavorite: !question.isFavorite
    };
    // Optimistic update
    onQuestionUpdate(updatedQuestion);
    try {
      const response = await fetch('/api/qna', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          userId: '1',
          isFavorite: !question.isFavorite
        })
      });
      if (!response.ok) {
        // Revert on failure
        onQuestionUpdate(question);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      onQuestionUpdate(question);
    }
  }

  // Voice output for answer
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }
  const handleStopSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  useEffect(() => {
    // Fetch feedback state for this question and user
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/feedback?answerId=${question.id}&userId=1&type=qna`)
        if (!res.ok) {
          setFeedback(null)
          return
        }
        const text = await res.text()
        if (!text) {
          setFeedback(null)
          return
        }
        const data = JSON.parse(text)
        if (data.feedback && data.feedback.value) {
          setFeedback(data.feedback.value)
        } else {
          setFeedback(null)
        }
      } catch (e) {
        setFeedback(null)
      }
    }
    fetchFeedback()
  }, [question.id])

  const handleFeedback = async (value: 'like' | 'dislike') => {
    // Optimistic update
    const newValue = feedback === value ? null : value;
    setFeedback(newValue);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerId: question.id,
          type: 'qna',
          value: newValue,
          userId: '1',
        })
      });
    } catch (e) {
      // Revert on error
      setFeedback(feedback);
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect() // Only observe once
        }
      },
      { rootMargin: '100px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])
  
  return (
    <article
      ref={cardRef}
      data-question-id={question.id}
      className="border-2 border-green-200 dark:border-green-800 rounded-2xl bg-white/70 dark:bg-green-950/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-green-400 outline-none scale-100 hover:scale-[1.02]"
      tabIndex={0}
      aria-labelledby={`question-title-${question.id}`}
    >
      {/* Question Header - Always Visible */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`question-details-${question.id}`}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(v => !v) }}
      >
        <div className="flex-1 flex items-start gap-2">
          <div className="flex items-center gap-2 mt-1">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-green-500" />
            )}
            {getStatusIcon(question.status)}
          </div>
          <div className="flex-1">
            <h4 id={`question-title-${question.id}`} className="text-base font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">
              {showFullQuestion || question.query.length < 120 ? question.query : `${question.query.slice(0, 120)}...`}
              {question.query.length >= 120 && (
                <button
                  className="ml-2 text-xs text-green-600 underline hover:text-green-800 focus:outline-none"
                  onClick={e => { e.stopPropagation(); setShowFullQuestion(v => !v) }}
                  tabIndex={-1}
                >
                  {showFullQuestion ? 'Show less' : 'Show more'}
                </button>
              )}
            </h4>
            {/* Removed repo name */}
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200 font-medium">
              <span>{new Date(question.createdAt).toLocaleString()}</span>
              {question.category && (
                <>
                  <span>•</span>
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                    {question.category}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Modern Favorite Button - blazing fast, no loader */}
        <button
          onClick={handleToggleFavorite}
          className={`relative p-2 rounded-full shadow-md bg-white/60 dark:bg-green-900/40 border border-yellow-200 dark:border-yellow-700 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
            question.isFavorite
              ? 'text-yellow-400 dark:text-yellow-300 scale-110'
              : 'text-slate-400 hover:text-yellow-400 dark:hover:text-yellow-300'
          }`}
          title={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{ boxShadow: question.isFavorite ? '0 2px 8px 0 rgba(255, 193, 7, 0.15)' : undefined }}
        >
          {question.isFavorite ? (
            <StarIconSolid className="w-6 h-6" />
          ) : (
            <StarIcon className="w-6 h-6" />
          )}
        </button>
        <span className={`ml-3 px-3 py-1 text-sm font-semibold rounded-full shadow-sm ${getStatusColor(question.status)}`}>{question.status}</span>
      </div>
      {/* Visual separation between question and answer */}
      <div className="h-1 bg-gradient-to-r from-green-200/60 via-green-100/0 to-green-200/60 dark:from-green-900/60 dark:to-green-900/60" />
      {/* Question Details - Expandable with animation */}
      <div
        id={`question-details-${question.id}`}
        ref={detailsRef}
        aria-hidden={!isExpanded}
        className="will-change-[max-height,opacity]"
      >
        {isExpanded && isInView && (
          <div>
            {/* Attachments Section */}
            {(question.questionAttachments?.length ?? 0) > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <AttachmentDisplay 
                  attachments={question.questionAttachments ?? []}
                />
              </div>
            )}
            {/* Scrollable answer+metadata+followup section */}
            <div className="relative max-h-[32rem] overflow-y-auto rounded-b-2xl">
              {/* Answer Section */}
              {question.answer && (
                <div className="p-0 bg-gradient-to-br from-white/90 via-green-50/80 to-green-100/60 dark:from-green-950/80 dark:via-green-900/60 dark:to-green-950/80">
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-green-100 dark:border-green-900/40">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">Answer</h5>
                    {useConfidenceFilter && typeof question.confidence === 'number' && (
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full shadow-sm ${
                        question.confidence > 0.8 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : question.confidence > 0.5 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {Math.round(question.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  {/* Scrollable answer with fade for long content */}
                  <div className="relative px-4 pt-2 pb-0">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <MarkdownContent content={question.answer} />
                    </div>
                  </div>
                  {/* Modern Action Bar with loading spinners */}
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 mt-2 bg-white/60 dark:bg-green-950/60 rounded-xl shadow-sm border border-green-100 dark:border-green-900/40 mx-4 mb-4">
                    {/* Play/Stop Button */}
                    {!isSpeaking ? (
                      <button
                        type="button"
                        onClick={() => handleSpeak(question.answer || '')}
                        className="p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                        title="Read answer aloud"
                        aria-label="Read answer aloud"
                      >
                        <SpeakerWaveIcon className="w-5 h-5 text-green-600" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopSpeak}
                        className="p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        title="Stop reading"
                        aria-label="Stop reading"
                      >
                        <svg viewBox="0 0 32 32" fill="currentColor" className="w-5 h-5 text-red-600">
                          <rect x="8" y="8" width="16" height="16" rx="4" />
                        </svg>
                      </button>
                    )}
                    {/* Like/Dislike Buttons - blazing fast, no loader */}
                    <button
                      type="button"
                      onClick={() => handleFeedback('like')}
                      className={`p-2 rounded-full border border-slate-200 dark:border-green-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transform-gpu ${
                        feedback === 'like' ? 'bg-green-500 !text-white scale-110 shadow-lg' : 'bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }`}
                      title="Like answer"
                      aria-label="Like answer"
                      style={{ transition: 'background 0.2s, color 0.2s, transform 0.2s' }}
                    >
                      <HandThumbUpIcon className={`w-5 h-5 ${feedback === 'like' ? '!text-white' : 'text-green-600'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback('dislike')}
                      className={`p-2 rounded-full border border-slate-200 dark:border-green-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transform-gpu ${
                        feedback === 'dislike' ? 'bg-red-500 !text-white scale-110 shadow-lg' : 'bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                      }`}
                      title="Dislike answer"
                      aria-label="Dislike answer"
                      style={{ transition: 'background 0.2s, color 0.2s, transform 0.2s' }}
                    >
                      <HandThumbDownIcon className={`w-5 h-5 ${feedback === 'dislike' ? '!text-white' : 'text-red-600'}`} />
                    </button>
                    {feedback && (
                      <span className={`ml-2 text-xs ${feedback === 'like' ? 'text-green-600' : 'text-red-600'}`}>{feedback === 'like' ? 'Thanks for your feedback!' : 'We appreciate your feedback!'}</span>
                    )}
                  </div>
                  {/* End Action Bar */}
                  {/* Multi-Step Reasoning */}
                  {question.hasMultiStepReasoning && (question.reasoningSteps?.length ?? 0) > 0 && (
                    <div className="mt-6">
                      <ReasoningSteps 
                        steps={question.reasoningSteps ?? []}
                        isProcessing={false}
                        showByDefault={false}
                        className="border-t border-slate-200 dark:border-slate-700 pt-4"
                      />
                    </div>
                  )}
                </div>
              )}
              {/* Relevant Files - modern card style with more padding and gap */}
              {(question.relevantFiles?.length ?? 0) > 0 && (
                <div className="border-t border-green-100 dark:border-green-900/40 p-6 mt-6 rounded-2xl bg-gradient-to-br from-blue-50/60 via-white/60 to-green-50/60 dark:from-blue-950/40 dark:via-green-950/40 dark:to-green-950/60 shadow-md space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <DocumentTextIcon className="w-6 h-6 text-blue-500" />
                    <h5 className="text-lg font-bold text-slate-700 dark:text-slate-200">
                      Relevant Files <span className="text-xs font-normal">({question.relevantFiles?.length ?? 0})</span>
                    </h5>
                  </div>
                  <div className="space-y-4">
                    {(question.relevantFiles ?? []).map((filePath) => {
                      // Handle different possible formats of filePath
                      let pathString: string
                      if (typeof filePath === 'string') {
                        pathString = filePath
                      } else if (filePath && typeof filePath === 'object') {
                        pathString = (filePath as any).path || (filePath as any).name || (filePath as any).fileName || String(filePath)
                      } else {
                        pathString = String(filePath)
                      }
                      
                      const isExpanded = expandedFiles[pathString]
                      const isLoading = loadingFiles[pathString]
                      const fileContent = fileContents[pathString]
                      const extension = pathString.split('.').pop()?.toLowerCase() || ''
                      const language = languageMap[`.${extension}`] || 'text'
                      const isCopied = copiedStates[pathString]

                      return (
                        <div key={pathString} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          {/* File Header with separate clickable areas */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                            {/* Expandable area - clicking here toggles expansion */}
                            <button
                              onClick={() => toggleFileExpansion(pathString)}
                              className="flex items-center gap-3 flex-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded p-1 -m-1"
                            >
                              {isExpanded ? (
                                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                              )}
                              <CodeBracketIcon className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 text-left truncate font-mono">
                                {pathString}
                              </span>
                            </button>
                            
                            {/* Action buttons area - separate from expansion button */}
                            <div className="flex items-center gap-2 ml-2">
                              {extension && (
                                <span className={`px-2 py-1 text-xs text-white rounded ${getLanguageColor(language)}`}>
                                  {extension.toUpperCase()}
                                </span>
                              )}
                              {fileContent && (
                                <button
                                  onClick={() => copyToClipboard(fileContent.content, pathString)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
                                  title="Copy file content"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="border-t border-slate-200 dark:border-slate-700">
                              {isLoading ? (
                                <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Loading file content...
                                </div>
                              ) : fileContent ? (                            <LazyCodeContent
                                  fileContent={fileContent}
                                  formatCodeContent={formatCodeContent}
                                  isCopied={isCopied}
                                  copyToClipboard={copyToClipboard}
                                  filePath={pathString}
                                  isPageVisible={isPageVisible ?? true}
                                />
                              ) : (
                                <div className="p-4 text-slate-500 dark:text-slate-400 text-center">
                                  Failed to load file content
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Question Metadata - modern card style with more padding and gap */}
              <div className="border-t border-green-100 dark:border-green-900/40 pt-6 mt-6 rounded-2xl bg-gradient-to-br from-green-50/60 via-white/60 to-blue-50/60 dark:from-green-950/40 dark:via-blue-950/40 dark:to-green-950/60 shadow-md px-6 pb-4">
                <QuestionMetadata
                  question={question}
                  onUpdate={onQuestionUpdate}
                  className="mb-4"
                />
              </div>
              {/* Follow-up Questions Suggestions - modern card style with more padding and gap */}
              {question.status === 'completed' && question.answer && (
                <div className="border-t border-green-100 dark:border-green-900/40 pt-6 mt-6 rounded-2xl bg-gradient-to-br from-blue-50/60 via-white/60 to-green-50/60 dark:from-blue-950/40 dark:via-green-950/40 dark:to-green-950/60 shadow-md px-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      Ask Follow-up Questions
                    </h5>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {getFollowUpSuggestions(question).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectFollowUp(question, suggestion, () => {})}
                        className="text-xs px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors duration-200 border border-blue-200 dark:border-blue-800"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Loading or Error States */}
            {question.status === 'pending' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Processing your question... This may take a few moments.
                  </p>
                </div>
              </div>
            )}
            {question.status === 'failed' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Failed to process this question. Please try asking again.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
})

QuestionCard.displayName = 'QuestionCard'

export default QuestionCard
