'use client'

import { useState, useRef, useEffect, memo, lazy, Suspense } from 'react'
import { useUserData } from '@/hooks/useUserData'
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
// Lazy load heavy components for better performance
const MarkdownContent = lazy(() => import('@/components/ui/MarkdownContent'))
import QuestionMetadata from '@/components/ui/QuestionMetadata'
import LazyCodeContent from '@/components/qna/LazyCodeContent'
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
  refetchQuestions?: () => Promise<void>
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
  useConfidenceFilter = false,
  refetchQuestions
}: QuestionCardProps) => {
  const { userData } = useUserData()
  const [isInView, setIsInView] = useState(false)
  // ✅ Start collapsed by default
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<'LIKE' | 'DISLIKE' | null>(question.feedback || null)
  const [isCopied, setIsCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [showFullQuestion, setShowFullQuestion] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // ✅ Track previous status to detect transition from pending to completed
  const prevStatusRef = useRef<string | null>(null);
  const hasAutoExpandedRef = useRef<boolean>(false);

  // ✅ Auto-expand when answer becomes available (only for actual status transitions from pending to completed)
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = question.status;

    // Initialize prevStatus on first mount
    if (prevStatus === null) {
      prevStatusRef.current = currentStatus;
      return;
    }

    // Auto-expand ONLY when transitioning from 'pending' to 'completed'
    // This ensures questions start collapsed and only expand when processing completes
    const shouldAutoExpand =
      prevStatus === 'pending' &&
      currentStatus === 'completed' &&
      question.answer &&
      question.answer.trim().length > 0 && // Ensure answer is not empty
      !hasAutoExpandedRef.current;

    if (shouldAutoExpand) {
      console.log(`🎉 Auto-expanding question ${question.id}: ${prevStatus} → ${currentStatus} (answer length: ${question.answer?.length})`);
      setIsExpanded(true);
      hasAutoExpandedRef.current = true;
    }

    // Update previous status for next comparison
    prevStatusRef.current = currentStatus;
  }, [question.status, question.answer, question.id]);

  // Debug log for relevant files
  useEffect(() => {
    if (question.status === 'completed') {
      console.log(`🔍 QuestionCard ${question.id}: relevantFiles =`, question.relevantFiles);
      console.log(`🔍 QuestionCard ${question.id}: relevantFiles length =`, question.relevantFiles?.length);
    }
  }, [question.relevantFiles, question.status, question.id]);

  // Optimized animation using CSS classes instead of JS manipulation
  const detailsRef = useRef<HTMLDivElement>(null)

  // Handle favorite toggle with optimistic update + server sync
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the question when clicking favorite
    
    const newFavoriteState = !question.isFavorite;
    console.log(`⭐ Toggling favorite: ${question.isFavorite} → ${newFavoriteState}`);
    
    // Optimistic update - show immediately (THIS IS INSTANT!)
    const updatedQuestion = {
      ...question,
      isFavorite: newFavoriteState
    };
    onQuestionUpdate(updatedQuestion);
    
    // Fire-and-forget API call (runs in background, doesn't block UI)
    fetch('/api/qna', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: question.id,
        userId: userData?.id || '1',
        isFavorite: newFavoriteState
      })
    })
      .then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Failed to toggle favorite:', response.status, errorData);
          // Revert on failure
          onQuestionUpdate(question);
        } else {
          const data = await response.json();
          console.log('✅ Favorite updated successfully:', data.question?.isFavorite);
          // Trigger refetch to sync with server (also in background)
          if (refetchQuestions) {
            refetchQuestions();
          }
        }
      })
      .catch(error => {
        console.error('❌ Error toggling favorite:', error);
        // Revert on error
        onQuestionUpdate(question);
      });
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

  // Sync feedback state only on mount or when question ID changes
  // Don't sync on feedback prop changes to preserve optimistic updates
  const initialFeedbackRef = useRef<'LIKE' | 'DISLIKE' | null>(question.feedback || null)
  
  useEffect(() => {
    // Only sync feedback from props when question ID changes (new question)
    // This prevents refetch from overwriting our optimistic updates
    initialFeedbackRef.current = question.feedback || null
    setFeedback(question.feedback || null)
  }, [question.id]) // Only depend on question.id, NOT question.feedback

  const handleFeedback = async (value: 'LIKE' | 'DISLIKE') => {
    // YouTube-style: Update UI instantly (optimistic update)
    const newFeedback = feedback === value ? null : value
    setFeedback(newFeedback)
    
    // Update parent state optimistically
    const updatedQuestion = { ...question, feedback: newFeedback, feedbackAt: new Date().toISOString() }
    onQuestionUpdate(updatedQuestion)

    // Background API call (fire and forget)
    fetch(`/api/qna/${question.id}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: newFeedback }),
    })
      .then(async response => {
        if (!response.ok) {
          console.error('Failed to update feedback')
          // Revert on error
          setFeedback(initialFeedbackRef.current)
          onQuestionUpdate(question)
        } else {
          console.log('✅ Feedback updated:', newFeedback)
          // Update the ref to the new value
          initialFeedbackRef.current = newFeedback
          // Don't refetch - optimistic update is enough and faster
        }
      })
      .catch(error => {
        console.error('❌ Error updating feedback:', error)
        // Revert on error
        setFeedback(initialFeedbackRef.current)
        onQuestionUpdate(question)
      })
  }

  const handleCopyAnswer = async () => {
    if (!question.answer) return
    
    try {
      await navigator.clipboard.writeText(question.answer)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
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
      data-expanded={isExpanded}  // Add expanded state as data attribute
      className={
        `border-2 border-slate-200 dark:border-slate-800 rounded-2xl ` +
        `bg-white dark:bg-slate-900 ` +
        `backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-green-400 outline-none scale-100 hover:scale-[1.02] ` +
        `overflow-x-auto`
      }
      tabIndex={0}
      aria-labelledby={`question-title-${question.id}`}
    >
      {/* Question Header - Always Visible */}
      <div
        className="p-3 sm:p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`question-details-${question.id}`}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(v => !v) }}
      >
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 mt-1 flex-shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            )}
            {getStatusIcon(question.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 id={`question-title-${question.id}`} className="text-base font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 break-words">
              {showFullQuestion || question.query.length < 120 ? question.query : `${question.query.slice(0, 120)}...`}
              {question.query.length >= 120 && (
                <button
                  className="ml-2 text-xs text-slate-500 underline hover:text-slate-700 focus:outline-none"
                  onClick={e => { e.stopPropagation(); setShowFullQuestion(v => !v) }}
                  tabIndex={-1}
                >
                  {showFullQuestion ? 'Show less' : 'Show more'}
                </button>
              )}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-800 dark:text-slate-400 font-medium break-words">
              <span>{new Date(question.createdAt).toLocaleString()}</span>
              {question.category && (
                <>
                  <span>•</span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                    {question.category}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Modern Favorite Button - YouTube-style instant feedback */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
          <button
            onClick={handleToggleFavorite}
            className={`relative p-2 rounded-full shadow-md bg-white/60 dark:bg-green-900/40 border border-yellow-200 dark:border-yellow-700 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 hover:scale-105 active:scale-95 ${
              question.isFavorite
                ? 'text-yellow-400 dark:text-yellow-300 scale-110'
                : 'text-slate-400 hover:text-yellow-400 dark:hover:text-yellow-300'
            }`}
            title={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{ boxShadow: question.isFavorite ? '0 2px 8px 0 rgba(255, 193, 7, 0.15)' : undefined }}
          >
            {question.isFavorite ? (
              <StarIconSolid className="w-6 h-6 transition-transform duration-200" />
            ) : (
              <StarIcon className="w-6 h-6 transition-transform duration-200" />
            )}
          </button>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(question.status)}`}>{question.status}</span>
        </div>
      </div>
      {/* Visual separation between question and answer */}
      <div className="h-1 bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-800 dark:to-slate-800" />
      {/* Question Details - Expandable with optimized CSS animation */}
      <div
        id={`question-details-${question.id}`}
        ref={detailsRef}
        aria-hidden={!isExpanded}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ willChange: isExpanded ? 'max-height, opacity' : 'auto' }}
      >
        {/* Only render content when expanded or about to expand for better performance */}
        {isExpanded && (
        <div>
            {/* Attachments Section */}
            {(question.questionAttachments?.length ?? 0) > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <AttachmentDisplay 
                  attachments={question.questionAttachments ?? []}
                />
              </div>
            )}
            {/* ✅ FIX: Optimized scrollable section with CSS containment for smooth scrolling */}
            <div 
              className="relative max-h-[32rem] overflow-y-auto rounded-b-2xl scroll-smooth"
              style={{ 
                contain: 'layout style paint',
                willChange: 'scroll-position',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Answer Section */}
              {question.answer && (
                <div className="p-0 bg-white dark:bg-slate-900">
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
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
                  {/* ✅ FIX: Optimized scrollable answer with progressive rendering */}
                  <div className="relative px-2 sm:px-4 pt-2 pb-0 overflow-x-auto">
                    <div className="prose prose-slate dark:prose-invert max-w-none break-words">
                      <Suspense fallback={
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      }>
                        {/* Use will-change for GPU acceleration during scroll */}
                        <div style={{ willChange: 'transform', contain: 'layout style paint' }}>
                          <MarkdownContent content={question.answer} />
                        </div>
                      </Suspense>
                    </div>
                  </div>
                  {/* Modern Action Bar with loading spinners */}
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 mt-2 bg-bg-green-50/60 dark:bg-green-950/60 rounded-xl shadow-sm border border-green-100 dark:border-green-900/40 mx-4 mb-4">
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
                    {/* Like/Dislike/Copy Buttons - YouTube-style instant feedback with clear visual indicators */}
                    <button
                      type="button"
                      onClick={() => handleFeedback('LIKE')}
                      className={`p-2 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transform ${
                        feedback === 'LIKE' 
                          ? 'bg-green-500 border-green-500 scale-110 shadow-lg dark:bg-green-600 dark:border-green-600' 
                          : 'bg-slate-50 border-slate-300 hover:bg-green-50 hover:border-green-400 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-green-500'
                      }`}
                      title={feedback === 'LIKE' ? 'Unlike answer' : 'Like answer'}
                      aria-label={feedback === 'LIKE' ? 'Unlike answer' : 'Like answer'}
                      aria-pressed={feedback === 'LIKE'}
                    >
                      <HandThumbUpIcon 
                        className={`w-5 h-5 transition-colors ${
                          feedback === 'LIKE' 
                            ? 'text-white stroke-2' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`} 
                        strokeWidth={feedback === 'LIKE' ? 2.5 : 2}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback('DISLIKE')}
                      className={`p-2 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transform ${
                        feedback === 'DISLIKE' 
                          ? 'bg-red-500 border-red-500 scale-110 shadow-lg dark:bg-red-600 dark:border-red-600' 
                          : 'bg-slate-50 border-slate-300 hover:bg-red-50 hover:border-red-400 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-red-500'
                      }`}
                      title={feedback === 'DISLIKE' ? 'Remove dislike' : 'Dislike answer'}
                      aria-label={feedback === 'DISLIKE' ? 'Remove dislike' : 'Dislike answer'}
                      aria-pressed={feedback === 'DISLIKE'}
                    >
                      <HandThumbDownIcon 
                        className={`w-5 h-5 transition-colors ${
                          feedback === 'DISLIKE' 
                            ? 'text-white stroke-2' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                        strokeWidth={feedback === 'DISLIKE' ? 2.5 : 2}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAnswer}
                      className={`p-2 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transform ${
                        isCopied 
                          ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg dark:bg-blue-600 dark:border-blue-600' 
                          : 'bg-slate-50 border-slate-300 hover:bg-blue-50 hover:border-blue-400 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-blue-500'
                      }`}
                      title="Copy answer"
                      aria-label="Copy answer"
                    >
                      <ClipboardDocumentIcon 
                        className={`w-5 h-5 transition-colors ${
                          isCopied 
                            ? 'text-white' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`} 
                      />
                    </button>
                    {feedback && (
                      <span className={`ml-2 text-xs font-medium ${feedback === 'LIKE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {feedback === 'LIKE' ? 'Liked!' : 'Disliked'}
                      </span>
                    )}
                    {isCopied && (
                      <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400">Copied!</span>
                    )}
                  </div>
                  {/* End Action Bar */}
                </div>
              )}
              {/* Relevant Files - modern card style with more padding and gap */}
              {(question.relevantFiles?.length ?? 0) > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-6 mt-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md space-y-4">
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
                              <span className="text-sm text-slate-700 dark:text-slate-300 text-left truncate font-mono break-all max-w-[120px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-[420px] xl:max-w-[520px]">
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
                                <>
                                <button
                                  onClick={() => copyToClipboard(fileContent.content, pathString)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
                                  title="Copy file content"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    if (!fileContent.content) return;
                                    const blob = new Blob([fileContent.content], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = pathString.split('/').pop() || 'file.txt';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }}
                                  disabled={!fileContent}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Download file"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                </>
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
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md px-6 pb-4">
                <QuestionMetadata
                  question={question}
                  onUpdate={onQuestionUpdate}
                  className="mb-4"
                />
              </div>
              {/* Follow-up Questions Suggestions - modern card style with more padding and gap */}
              {question.status === 'completed' && question.answer && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 rounded-2xl bg-white dark:bg-slate-900 shadow-md px-6 pb-4">
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
