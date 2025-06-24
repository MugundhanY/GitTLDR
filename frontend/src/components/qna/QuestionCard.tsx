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
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Handle favorite toggle
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding the question when clicking favorite
    
    const updatedQuestion = {
      ...question,
      isFavorite: !question.isFavorite
    }
    
    // Optimistic update
    onQuestionUpdate(updatedQuestion)
    
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
      })

      if (!response.ok) {
        // Revert on failure
        onQuestionUpdate(question)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      // Revert on error
      onQuestionUpdate(question)
    }
  }

  // Voice output for answer
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
  const handleStopSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
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
    setFeedbackLoading(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerId: question.id,
        type: 'qna',
        value,
        userId: '1',
      })
    })
    setFeedback(value)
    setFeedbackLoading(false)
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
    <div 
      ref={cardRef} 
      data-question-id={question.id}
      className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
    >
      {/* Question Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-start gap-3">
          <div className="flex items-center gap-2 mt-1">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            )}
            {getStatusIcon(question.status)}
          </div>
          
          <div className="flex-1">
            <h4 className="text-base font-medium text-slate-900 dark:text-white mb-2 line-clamp-2">
              {question.query}
            </h4>
            
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>{selectedRepository.name}</span>
              <span>•</span>
              <span>{new Date(question.createdAt).toLocaleString()}</span>
              {question.category && (
                <>
                  <span>•</span>
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md text-xs font-medium">
                    {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
                  </span>
                </>
              )}
              {question.isFavorite && (
                <>
                  <span>•</span>
                  <span className="text-yellow-500">⭐ Favorite</span>
                </>
              )}
              {question.tags && question.tags.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex gap-1">
                    {question.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                    {question.tags.length > 2 && (
                      <span className="text-xs text-slate-400">+{question.tags.length - 2}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Favorite Star Button */}
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
              question.isFavorite 
                ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            }`}
            title={question.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {question.isFavorite ? (
              <StarIconSolid className="w-5 h-5" />
            ) : (
              <StarIcon className="w-5 h-5" />
            )}
          </button>
          
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(question.status)}`}>
            {question.status}
          </span>
        </div>
      </div>      {/* Question Details - Expandable */}
      {isExpanded && isInView && (
        <div className="border-t border-slate-200 dark:border-slate-700">          {/* Attachments Section */}
          {question.questionAttachments && question.questionAttachments.length > 0 && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <AttachmentDisplay 
                attachments={question.questionAttachments}
              />
            </div>
          )}
          
          {/* Answer Section */}
          {question.answer && (
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Answer</h5>
                <span className="flex items-center ml-2">
                  <button
                    type="button"
                    onClick={() => handleSpeak(question.answer || '')}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    title="Read answer aloud"
                  >
                    <SpeakerWaveIcon className="w-5 h-5 text-green-600" />
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSpeak}
                    className="ml-1 p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Stop reading"
                  >
                    <span className="w-5 h-5 block text-red-600">&#9632;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback('like')}
                    disabled={feedbackLoading}
                    className={`ml-2 p-2 rounded-full border border-slate-200 dark:border-green-600 transition-colors
                      ${feedback === 'like' ? 'bg-green-500 !text-white' : 'bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30'}
                      ${feedbackLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Like answer"
                  >
                    <HandThumbUpIcon className={`w-5 h-5 ${feedback === 'like' ? '!text-white' : 'text-green-600'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback('dislike')}
                    disabled={feedbackLoading}
                    className={`ml-1 p-2 rounded-full border border-slate-200 dark:border-green-600 transition-colors
                      ${feedback === 'dislike' ? 'bg-red-500 !text-white' : 'bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30'}
                      ${feedbackLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Dislike answer"
                  >
                    <HandThumbDownIcon className={`w-5 h-5 ${feedback === 'dislike' ? '!text-white' : 'text-red-600'}`} />
                  </button>
                  {feedback && (
                    <span className={`ml-2 text-xs ${feedback === 'like' ? 'text-green-600' : 'text-red-600'}`}>{feedback === 'like' ? 'Thanks for your feedback!' : 'We appreciate your feedback!'}</span>
                  )}
                </span>
                {useConfidenceFilter && question.confidence !== undefined && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    question.confidence > 0.8 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : question.confidence > 0.5 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {Math.round(question.confidence * 100)}% confidence
                  </span>
                )}              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <MarkdownContent content={question.answer} />
              </div>
              
              {/* Multi-Step Reasoning */}
              {question.hasMultiStepReasoning && question.reasoningSteps && question.reasoningSteps.length > 0 && (
                <div className="mt-6">
                  <ReasoningSteps 
                    steps={question.reasoningSteps}
                    isProcessing={false}
                    showByDefault={false}
                    className="border-t border-slate-200 dark:border-slate-700 pt-4"
                  />
                </div>
              )}
            </div>
          )}

          {/* Relevant Files */}
          {question.relevantFiles && question.relevantFiles.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Relevant Files ({question.relevantFiles.length})
                </h5>
              </div>              <div className="space-y-3">
                {question.relevantFiles.map((filePath) => {
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
          
          {/* Question Metadata */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
            <QuestionMetadata
              question={question}
              onUpdate={onQuestionUpdate}
              className="mb-4"
            />
          </div>

          {/* Follow-up Questions Suggestions */}
          {question.status === 'completed' && question.answer && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                  Ask Follow-up Questions
                </h5>
              </div>
              <div className="flex flex-wrap gap-2">
                {getFollowUpSuggestions(question).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectFollowUp(question, suggestion, () => {})}
                    className="text-xs px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors duration-200 border border-blue-200 dark:border-blue-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

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
          )}        </div>
      )}
    </div>
  )
})

QuestionCard.displayName = 'QuestionCard'

export default QuestionCard
