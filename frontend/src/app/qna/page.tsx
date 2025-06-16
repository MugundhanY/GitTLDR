'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository, Repository } from '@/contexts/RepositoryContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useQnA } from '@/contexts/QnAContext'
import { Button } from '@/components/ui/Button'
import MarkdownContent from '@/components/ui/MarkdownContent'
import QuestionSuggestions from '@/components/ui/QuestionSuggestions'
import QuestionMetadata from '@/components/ui/QuestionMetadata'
import { 
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface Question {
  id: string
  query: string
  answer?: string
  repositoryId: string
  repositoryName: string
  createdAt: string
  updatedAt?: string
  status: 'pending' | 'completed' | 'failed'
  confidence?: number
  relevantFiles?: string[]
  isFavorite?: boolean
  tags?: string[]
  category?: string
  notes?: string
}

interface FileContent {
  path: string
  content: string
  language: string
  size: number
}

// Memoized Question Component for better performance
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
  getLanguageColor,  onQuestionUpdate,
  getFollowUpSuggestions,
  handleSelectFollowUp,
  isPageVisible = true,
  useConfidenceFilter = false
}: {
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
  handleSelectFollowUp: (originalQuestion: Question, followUpText: string) => void
  isPageVisible?: boolean
  onToggleFavorite?: (question: Question) => void
  useConfidenceFilter?: boolean
}) => {
  const [isInView, setIsInView] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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
    }    return () => observer.disconnect()
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
            </h4>            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
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
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
      </div>

      {/* Expanded Content - Only visible when expanded */}
      {isExpanded && isInView && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          {question.answer ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-blue-600 dark:text-blue-400">AI Assistant</span>                  {question.confidence && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      useConfidenceFilter 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-medium'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700'
                    }`}>
                      {useConfidenceFilter && <SparklesIcon className="w-3 h-3 inline mr-1" />}
                      {Math.round(question.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(question.answer || '', `answer-${question.id}`)
                  }}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Copy AI response"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-3">
                <MarkdownContent content={question.answer} />
              </div>

              {question.relevantFiles && question.relevantFiles.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    Related Files ({question.relevantFiles.length}):
                  </h5>
                  <div className="space-y-3">
                    {question.relevantFiles.map((filePath, index) => {
                      const fileName = filePath.split('/').pop() || filePath
                      const isFileExpanded = expandedFiles[filePath] || false
                      const isLoading = loadingFiles[filePath] || false
                      const fileContent = fileContents[filePath]
                      const isCopied = copiedStates[filePath] || false
                      const extension = fileName.split('.').pop()?.toLowerCase() || ''
                      const detectedLanguage = languageMap[extension] || 'text'
                      
                      return (
                        <div key={index} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFileExpansion(filePath)
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              {isFileExpanded ? (
                                <ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              )}
                              <CodeBracketIcon className="w-4 h-4 text-blue-500" />
                              <div>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{fileName}</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${getLanguageColor(detectedLanguage)}`}></span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{detectedLanguage}</span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500">{filePath}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {fileContent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(fileContent.content, filePath)
                                  }}
                                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded transition-colors"
                                  title="Copy file content"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              )}
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {isFileExpanded ? 'Click to collapse' : 'Click to expand'}
                              </span>
                            </div>
                          </div>
                          
                          {isFileExpanded && (
                            <div className="border-t border-slate-200 dark:border-slate-600">
                              {isLoading ? (
                                <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Loading file content...
                                </div>
                              ) : fileContent ? (
                                <LazyCodeContent
                                  fileContent={fileContent}
                                  formatCodeContent={formatCodeContent}
                                  isCopied={isCopied}
                                  copyToClipboard={copyToClipboard}
                                  filePath={filePath}
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
              )}              {/* Question Metadata */}
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
                        onClick={() => handleSelectFollowUp(question, suggestion)}
                        className="text-xs px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors duration-200 border border-blue-200 dark:border-blue-800"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : question.status === 'pending' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-yellow-800 dark:text-yellow-300">AI is analyzing your question and the repository...</span>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-700 dark:text-red-400">Failed to generate answer</span>
              </div>
              <p className="text-red-600 dark:text-red-300">
                There was an issue processing your question. Please try asking again or rephrase your question.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

QuestionCard.displayName = 'QuestionCard'
const LazyCodeContent = memo(({
  fileContent, 
  formatCodeContent, 
  isCopied, 
  copyToClipboard, 
  filePath,
  isPageVisible = true
}: {
  fileContent: FileContent
  formatCodeContent: (content: string, language: string) => string
  isCopied: boolean
  copyToClipboard: (text: string, filePath: string) => void
  filePath: string
  isPageVisible?: boolean
}) => {
  const [shouldRender, setShouldRender] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Only render when page is visible and delay for performance
    if (isPageVisible) {
      const timer = setTimeout(() => setShouldRender(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShouldRender(false)
    }
  }, [isPageVisible])

  if (!shouldRender || !isPageVisible) {
    return (
      <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2"></div>
        {!isPageVisible ? 'Content paused (tab not active)' : 'Rendering code...'}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {isCopied && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded z-10">
          Copied!
        </div>
      )}
      <pre className="p-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 overflow-x-auto max-h-96">
        <code 
          className={`language-${fileContent.language}`}
          dangerouslySetInnerHTML={{
            __html: formatCodeContent(fileContent.content, fileContent.language)
          }}
        />
      </pre>
      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {fileContent.content.split('\n').length} lines • {fileContent.size > 0 ? `${Math.round(fileContent.size / 1024)}KB` : 'Unknown size'}
        </span>
        <button
          onClick={() => copyToClipboard(fileContent.content, filePath)}
          className="flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ClipboardDocumentIcon className="w-3 h-3" />
          <span>Copy</span>
        </button>      </div>
    </div>
  )
})

QuestionCard.displayName = 'QuestionCard'

LazyCodeContent.displayName = 'LazyCodeContent'

export default function QnAPage() {
  const { selectedRepository } = useRepository()
  const { isCollapsed } = useSidebar()
  const { incrementQuestionCount, updateQuestionCount } = useQnA()
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAsking, setIsAsking] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({})
  const [fileContents, setFileContents] = useState<{ [key: string]: FileContent }>({})
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({})
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
  const [showSuggestions, setShowSuggestions] = useState(true) // Show by default for new users
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [showHistory, setShowHistory] = useState(false)
    // Integrated filtering state (previously in QuestionHistory)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minConfidence, setMinConfidence] = useState<number>(0)
  const [maxConfidence, setMaxConfidence] = useState<number>(1)
  const [useConfidenceFilter, setUseConfidenceFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  // Add visibility state to control rendering
  const [isPageVisible, setIsPageVisible] = useState(true)
  // Add page visibility listener to pause expensive operations when not focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    const handleFocus = () => setIsPageVisible(true)
    const handleBlur = () => setIsPageVisible(false)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Optimize question rendering with pagination
  const [visibleQuestions, setVisibleQuestions] = useState(10)

  // Memoized keywords to prevent recreation on every render
  const keywords = useMemo(() => ({
    javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'],
    typescript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'interface', 'type'],
    python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'return', 'try', 'except'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'import'],
    cpp: ['#include', 'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'class'],
    c: ['#include', 'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return']
  }), [])

  // Memoized language colors to prevent recreation
  const languageColors = useMemo(() => ({
    typescript: 'bg-blue-500',
    javascript: 'bg-yellow-500',
    python: 'bg-green-500',
    java: 'bg-orange-500',
    cpp: 'bg-purple-500',
    c: 'bg-slate-500',
    go: 'bg-cyan-500',
    rust: 'bg-red-500',
    php: 'bg-indigo-500',
    ruby: 'bg-pink-500',
    swift: 'bg-orange-400',
    kotlin: 'bg-purple-400',
    html: 'bg-orange-600',
    css: 'bg-blue-600',
    json: 'bg-slate-600',
    yaml: 'bg-green-600',
    markdown: 'bg-slate-700',
    shell: 'bg-slate-800',
    dockerfile: 'bg-blue-700'
  }), [])

  // Memoized language mapping for file extensions
  const languageMap = useMemo(() => ({
    'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
    'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'go': 'go',
    'rs': 'rust', 'php': 'php', 'rb': 'ruby', 'swift': 'swift', 'kt': 'kotlin',
    'html': 'html', 'css': 'css', 'json': 'json', 'yml': 'yaml', 'yaml': 'yaml',
    'md': 'markdown', 'sh': 'shell', 'dockerfile': 'dockerfile'
  } as { [key: string]: string }), [])
  const fetchQuestions = useCallback(async () => {
    if (!selectedRepository?.id) {
      setIsLoading(false)
      return
    }
    
    try {
      const response = await fetch(`/api/qna?repositoryId=${selectedRepository.id}&userId=1`)
      if (response.ok) {
        const data = await response.json()
        const fetchedQuestions = data.questions || []
        
        // Merge with any pending questions that might not be in the database yet
        setQuestions(prev => {
          const pendingQuestions = prev.filter(q => q.status === 'pending')
          const completedQuestionIds = new Set(fetchedQuestions.map((q: Question) => q.id))
          
          // Remove pending questions that are now completed and update with fetched data
          const remainingPendingQuestions = pendingQuestions.filter(q => !completedQuestionIds.has(q.id))
          
          // Combine and sort by creation date
          const allQuestions = [...fetchedQuestions, ...remainingPendingQuestions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          
          return allQuestions
        })
      } else {
        console.error('Failed to fetch questions:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedRepository?.id])
  // Debounced version of fetchQuestions to prevent excessive calls
  const debouncedFetchQuestions = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(fetchQuestions, 300)
    }
  }, [fetchQuestions])

  const fetchFileContent = useCallback(async (filePath: string) => {
    if (!selectedRepository?.id) return

    // Check if already loaded or loading to prevent duplicate requests
    if (fileContents[filePath] || loadingFiles[filePath]) {
      return
    }

    setLoadingFiles(prev => ({ ...prev, [filePath]: true }))
    
    try {
      // First, find the file by path to get its ID
      const filesResponse = await fetch(`/api/repositories/${selectedRepository.id}/files?path=${encodeURIComponent(filePath)}`)
      if (!filesResponse.ok) {
        throw new Error(`Failed to find file: ${filesResponse.status}`)
      }
      
      const filesData = await filesResponse.json()
      const file = filesData.files?.find((f: any) => f.path === filePath)
      
      if (!file) {
        throw new Error('File not found in repository')
      }
      
      // Now fetch the file content using the file ID
      const contentResponse = await fetch(`/api/repositories/${selectedRepository.id}/files/${file.id}/content`)
      if (!contentResponse.ok) {
        throw new Error(`Failed to fetch file content: ${contentResponse.status}`)
      }
      
      const contentData = await contentResponse.json()
      
      if (contentData.error) {
        setFileContents(prev => ({
          ...prev,
          [filePath]: {
            path: filePath,
            content: 'File content not available',
            language: file.language || 'text',
            size: file.size || 0
          }
        }))
      } else {
        setFileContents(prev => ({
          ...prev,
          [filePath]: {
            path: filePath,
            content: contentData.content || 'File content not available',
            language: file.language || 'text',
            size: file.size || 0
          }
        }))
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContents(prev => ({
        ...prev,
        [filePath]: {
          path: filePath,
          content: 'Failed to load file content',
          language: 'text',
          size: 0
        }
      }))    } finally {
      setLoadingFiles(prev => ({ ...prev, [filePath]: false }))
    }
  }, [selectedRepository?.id, fileContents, loadingFiles])
    const toggleFileExpansion = useCallback((filePath: string) => {
    setExpandedFiles(prev => {
      const isExpanding = !prev[filePath]
      const newState = { ...prev, [filePath]: isExpanding }
      
      // Only fetch if expanding and content doesn't exist yet
      if (isExpanding && !fileContents[filePath] && !loadingFiles[filePath]) {
        // Use setTimeout to defer the API call and prevent blocking the UI
        setTimeout(() => fetchFileContent(filePath), 0)
      }
        return newState
    })
  }, [fetchFileContent, fileContents, loadingFiles])
  
  const copyToClipboard = useCallback(async (text: string, filePath: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [filePath]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [filePath]: false }))
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [])  // Memoize formatted content to avoid re-processing on every render
  const formattedCodeCache = useMemo(() => new Map<string, string>(), [])

  const formatCodeContent = useCallback((content: string, language: string) => {
    // Create cache key
    const cacheKey = `${content.length}-${language}-${content.substring(0, 100)}`
    
    // Check cache first
    if (formattedCodeCache.has(cacheKey)) {
      return formattedCodeCache.get(cacheKey)!
    }

    // Early return for large files to prevent performance issues
    if (content.length > 10000) {
      const truncated = content.substring(0, 10000) + '\n\n... (Content truncated for performance)'
      formattedCodeCache.set(cacheKey, truncated)
      return truncated
    }

    // Skip highlighting for very large files or when content is empty
    if (!content || content.length > 5000) {
      formattedCodeCache.set(cacheKey, content)
      return content
    }

    const langKeywords = keywords[language as keyof typeof keywords] || []
    
    if (langKeywords.length === 0) {
      formattedCodeCache.set(cacheKey, content)
      return content
    }

    // Use a more efficient approach - only highlight small chunks
    try {
      let highlighted = content
      
      // Only apply keyword highlighting for small files
      if (langKeywords.length > 0 && content.length < 3000) {
        const keywordPattern = `\\b(${langKeywords.slice(0, 10).join('|')})\\b` // Limit keywords
        const regex = new RegExp(keywordPattern, 'g')
        highlighted = highlighted.replace(regex, '<span class="text-blue-500 dark:text-blue-400 font-semibold">$1</span>')
      }

      formattedCodeCache.set(cacheKey, highlighted)
      return highlighted
    } catch (error) {
      // Fallback to plain content if highlighting fails
      formattedCodeCache.set(cacheKey, content)
      return content
    }
  }, [keywords, formattedCodeCache])
  const getLanguageColor = useCallback((language: string) => {
    return languageColors[language.toLowerCase() as keyof typeof languageColors] || 'bg-slate-500'
  }, [languageColors])

  // Computed values for filtering
  const categories = useMemo(() => 
    Array.from(new Set(questions.map(q => q.category).filter(Boolean))), 
    [questions]
  )
  
  const allTags = useMemo(() => 
    Array.from(new Set(questions.flatMap(q => q.tags || []))), 
    [questions]
  )
  // Enhanced filtering logic
  const filteredQuestions = useMemo(() => {
    let filtered = selectedRepository?.id 
      ? questions.filter(q => q?.repositoryId === selectedRepository.id)
      : questions

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(q => 
        q.query.toLowerCase().includes(query) ||
        q.answer?.toLowerCase().includes(query) ||
        q.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply favorites filter
    if (filterFavorites) {
      filtered = filtered.filter(q => q.isFavorite)
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory)
    }

    // Apply tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => 
        selectedTags.some(tag => q.tags?.includes(tag))
      )
    }

    // Apply confidence level filter
    if (useConfidenceFilter) {
      filtered = filtered.filter(q => {
        const confidence = q.confidence || 0
        return confidence >= minConfidence && confidence <= maxConfidence
      })
    }

    console.log('🔍 filteredQuestions updated:', {
      totalQuestions: questions.length,
      filteredCount: filtered.length,
      repositoryId: selectedRepository?.id,
      searchQuery,
      filterFavorites,
      selectedCategory,
      selectedTags,
      confidenceFilter: useConfidenceFilter ? `${minConfidence}-${maxConfidence}` : 'disabled'
    })
    
    return filtered
  }, [questions, selectedRepository?.id, searchQuery, filterFavorites, selectedCategory, selectedTags, useConfidenceFilter, minConfidence, maxConfidence])

  // Filter utility functions
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])
  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setFilterFavorites(false)
    setSelectedCategory('')
    setSelectedTags([])
    setUseConfidenceFilter(false)
    setMinConfidence(0)
    setMaxConfidence(1)
  }, [])

  // Export functionality
  const exportQuestions = useCallback(async (format: 'markdown' | 'json' | 'html') => {
    if (!selectedRepository?.id) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: '1',
        format,
        ...(filterFavorites && { favoritesOnly: 'true' }),
        ...(selectedCategory && { category: selectedCategory })
      })

      const response = await fetch(`/api/qna/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `qna-export.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }    } catch (error) {
      console.error('Error exporting questions:', error)
    }  }, [selectedRepository?.id, filterFavorites, selectedCategory])

  // Advanced search with confidence filtering
  const performAdvancedSearch = useCallback(async () => {
    if (!selectedRepository?.id || !useConfidenceFilter) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: '1',
        ...(searchQuery && { query: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedTags.length > 0 && { tags: selectedTags.join(',') }),
        ...(filterFavorites && { favoritesOnly: 'true' }),
        minConfidence: minConfidence.toString(),
        maxConfidence: maxConfidence.toString()
      })

      const response = await fetch(`/api/qna/search?${params}`)
      if (response.ok) {
        const data = await response.json()
        const searchedQuestions = data.questions || []
        
        // Update questions with search results when confidence filtering is active
        setQuestions(prev => {
          const pendingQuestions = prev.filter(q => q.status === 'pending')
          const allQuestions = [...searchedQuestions, ...pendingQuestions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          return allQuestions
        })
      }
    } catch (error) {
      console.error('Error performing advanced search:', error)
    }
  }, [selectedRepository?.id, useConfidenceFilter, searchQuery, selectedCategory, selectedTags, filterFavorites, minConfidence, maxConfidence])

  // Trigger advanced search when confidence filter settings change
  useEffect(() => {
    if (useConfidenceFilter) {
      performAdvancedSearch()
    } else {
      // Refresh normal questions when confidence filter is disabled
      fetchQuestions()
    }
  }, [useConfidenceFilter, minConfidence, maxConfidence, performAdvancedSearch, fetchQuestions])

  const questionsToShow = useMemo(() => 
    filteredQuestions.slice(0, visibleQuestions), 
    [filteredQuestions, visibleQuestions]
  )
  
  const loadMoreQuestions = useCallback(() => {
    setVisibleQuestions(prev => Math.min(prev + 10, filteredQuestions.length))
  }, [filteredQuestions.length])
  // Performance monitoring
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const measureFPS = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        
        // Log warning if FPS drops below 30
        if (fps < 30 && isPageVisible) {
          console.warn(`Q&A Page performance warning: ${fps} FPS`)
        }
        
        frameCount = 0
        lastTime = currentTime
      }
      
      if (isPageVisible) {
        requestAnimationFrame(measureFPS)
      }
    }
    
    if (isPageVisible) {
      requestAnimationFrame(measureFPS)    }
  }, [isPageVisible])
  
  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])
  // Update question count when questions array changes
  useEffect(() => {
    if (selectedRepository?.id) {
      const repositoryQuestions = questions.filter(q => q?.repositoryId === selectedRepository.id)
      console.log('📊 Updating question count:', {
        repositoryId: selectedRepository.id,
        totalQuestions: questions.length,
        repositoryQuestions: repositoryQuestions.length,
        questionIds: repositoryQuestions.map(q => q.id)
      })
      updateQuestionCount(repositoryQuestions.length)
    }
  }, [questions, selectedRepository?.id, updateQuestionCount])
  
  // Auto-hide suggestions when user has questions or starts typing
  useEffect(() => {
    if (selectedRepository?.id) {
      const repositoryQuestions = questions.filter(q => q?.repositoryId === selectedRepository.id)
      // Hide suggestions if there are questions, but show if no questions and no text entered
      if (repositoryQuestions.length > 0) {
        setShowSuggestions(false)
      } else if (repositoryQuestions.length === 0 && !newQuestion.trim()) {
        setShowSuggestions(true)
      }
    }
  }, [questions, selectedRepository?.id, newQuestion])
  
  // Store active polling timeouts for cleanup
  const pollingTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())
    // Cleanup polling timeouts on unmount
  useEffect(() => {
    return () => {
      const currentTimeouts = pollingTimeouts.current
      currentTimeouts.forEach(timeout => clearTimeout(timeout))
      currentTimeouts.clear()
    }
  }, [])

  const handleAskQuestion = async () => {
    if (!newQuestion.trim() || !selectedRepository?.id) return

    setIsAsking(true)
    const questionText = newQuestion.trim()
    
    try {
      const response = await fetch('/api/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          question: questionText,
          userId: '1'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Question submitted successfully:', data)
        
        const pendingQuestion: Question = {
          id: data.questionId,
          query: questionText,
          answer: undefined,
          repositoryId: selectedRepository.id,
          repositoryName: selectedRepository.name,
          createdAt: new Date().toISOString(),
          status: 'pending'
        }        // Add the pending question to the list immediately and clear input
        setQuestions(prev => {
          // Ensure we don't add duplicates
          const exists = prev.some(q => q.id === data.questionId)
          if (exists) {
            console.log('🚫 Question already exists, not adding duplicate:', data.questionId)
            return prev
          }
          console.log('✅ Adding pending question to state:', {
            questionId: data.questionId,
            query: questionText.substring(0, 50),
            currentQuestionsCount: prev.length
          })
          return [pendingQuestion, ...prev]
        })
        setNewQuestion('')
        
        // Trigger immediate sidebar stats refresh
        incrementQuestionCount()
        
        // Set up robust polling to check for the answer
        let attempts = 0
        const maxAttempts = 36 // Poll for up to 3 minutes (36 * 5 seconds)
        
        const poll = async () => {
          try {
            console.log(`Polling attempt ${attempts + 1} for question ${data.questionId}`)
            
            const pollResponse = await fetch(`/api/qna?repositoryId=${selectedRepository.id}&userId=1`)
            if (pollResponse.ok) {
              const pollData = await pollResponse.json()
              const allQuestions = pollData.questions || []
              
              // Find our question in the response
              const completedQuestion = allQuestions.find((q: Question) => q.id === data.questionId)
              
              if (completedQuestion && completedQuestion.answer && completedQuestion.status === 'completed') {
                console.log('Question completed, updating UI:', completedQuestion)
                // Update the question with the answer
                setQuestions(prev => 
                  prev.map(q => q.id === data.questionId ? {
                    ...completedQuestion,
                    repositoryId: selectedRepository.id,
                    repositoryName: selectedRepository.name
                  } : q)
                )
                return // Stop polling
              }
            }
            
            attempts++
            if (attempts < maxAttempts) {
              const timeoutId = setTimeout(poll, 5000) // Poll again in 5 seconds
              pollingTimeouts.current.add(timeoutId)
            } else {
              console.log('Max polling attempts reached, marking as failed')
              // After max attempts, mark as failed
              setQuestions(prev => 
                prev.map(q => q.id === data.questionId ? { ...q, status: 'failed' as const } : q)
              )
            }
          } catch (error) {
            console.error('Error polling for answer:', error)
            attempts++
            if (attempts < maxAttempts) {
              const timeoutId = setTimeout(poll, 5000)
              pollingTimeouts.current.add(timeoutId)
            }
          }
        }
        
        // Start polling after a short delay
        const initialTimeoutId = setTimeout(poll, 3000)
        pollingTimeouts.current.add(initialTimeoutId)
        
      } else {
        throw new Error('Failed to ask question')
      }
    } catch (error) {      console.error('Error asking question:', error)
      alert('Failed to ask question. Please try again.')
      // Remove the pending question if submission failed
      setQuestions(prev => prev.filter(q => q.query !== questionText || q.status !== 'pending'))
    } finally {
      setIsAsking(false)
    }
  }

  // Handler for question suggestions
  const handleSelectSuggestion = (suggestion: string) => {
    setNewQuestion(suggestion)
    setShowSuggestions(false)
    // Auto-focus on the textarea after selecting a suggestion
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What does this code do"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(suggestion.length, suggestion.length)
      }
    }, 100)
  }
  // Handler for selecting a question from history
  const handleSelectFromHistory = (question: Question) => {
    setSelectedQuestion(question)
    setNewQuestion(question.query)
    setShowHistory(false)
    
    // Scroll to the selected question if it exists in the current list
    setTimeout(() => {
      const questionElement = document.querySelector(`[data-question-id="${question.id}"]`)
      if (questionElement) {
        questionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
        
        // Add a temporary highlight effect
        questionElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
        setTimeout(() => {
          questionElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
        }, 2000)
      } else {
        // If question not visible, scroll to the question input area
        const questionInput = document.querySelector('textarea[placeholder*="What does this code do"]')
        if (questionInput) {
          questionInput.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          })
        }
      }
    }, 100)
  }

  // Generate follow-up question suggestions based on question category and content
  const getFollowUpSuggestions = useCallback((question: Question): string[] => {
    const category = question.category?.toLowerCase()
    const baseQuestions = []

    // Category-specific follow-ups
    switch (category) {
      case 'architecture':
        baseQuestions.push(
          "How would this scale with increased load?",
          "What are the security implications?",
          "Can you explain the data flow?"
        )
        break
      case 'implementation':
        baseQuestions.push(
          "Are there any edge cases to consider?",
          "How can this be optimized?",
          "What are alternative approaches?"
        )
        break
      case 'debugging':
        baseQuestions.push(
          "What debugging steps would you recommend?",
          "How can I prevent this issue?",
          "Are there related issues to watch for?"
        )
        break
      case 'configuration':
        baseQuestions.push(
          "What are the recommended settings?",
          "How do I troubleshoot configuration issues?",
          "What security considerations apply?"
        )
        break
      default:
        baseQuestions.push(
          "Can you provide more details?",
          "What are the best practices here?",
          "How does this relate to other parts of the codebase?"
        )
    }

    // Add generic follow-ups
    baseQuestions.push(
      "Show me examples of this pattern",
      "What documentation exists for this?"
    )

    return baseQuestions.slice(0, 4) // Limit to 4 suggestions to avoid UI clutter
  }, [])

  // Handle selecting a follow-up question
  const handleSelectFollowUp = useCallback((originalQuestion: Question, followUpText: string) => {
    const contextualQuestion = `Regarding "${originalQuestion.query.slice(0, 50)}${originalQuestion.query.length > 50 ? '...' : ''}", ${followUpText.toLowerCase()}`
    setNewQuestion(contextualQuestion)
    
    // Scroll to question input
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What does this code do"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(contextualQuestion.length, contextualQuestion.length)
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)  }, [])

  // Handler for updating question metadata
  const handleQuestionUpdate = useCallback(async (updatedQuestion: Question) => {
    // Optimistic update for immediate UI feedback
    setQuestions(prev => 
      prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
    )
    if (selectedQuestion?.id === updatedQuestion.id) {
      setSelectedQuestion(updatedQuestion)
    }

    // Update the question in the QuestionHistory component if it's visible
    // This will be handled by the parent-child data flow
    try {
      // The actual API call is handled in QuestionMetadata component
      // We just need to ensure the state is properly synchronized
      console.log('Question updated:', updatedQuestion.id)
    } catch (error) {
      console.error('Error updating question:', error)
    }
  }, [selectedQuestion])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <QuestionMarkCircleIcon className="h-5 w-5 text-slate-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-md flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Q&A Assistant</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">No repository selected</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                Select a Repository
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Choose a repository from the navigation above to start asking questions about your codebase.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Q&A Assistant</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedRepository.name}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading Q&A...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 -z-50 animate-gradient-x"></div>
      
      <DashboardLayout>
        <div className="min-h-screen relative z-0">
          {/* Header */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 animate-in slide-in-from-top duration-700">
            <div className={`mx-auto px-8 py-7 transition-all duration-300 ${
              isCollapsed ? 'max-w-none' : 'max-w-7xl'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    {selectedRepository.owner?.avatar_url ? (
                      <Image
                        src={selectedRepository.owner.avatar_url}
                        alt={`${selectedRepository.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="animate-in slide-in-from-left duration-500 delay-200">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <SparklesIcon className="w-6 h-6 text-blue-500" />
                      Q&A Assistant
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Ask questions about {selectedRepository.name} and get AI-powered answers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className={`mx-auto px-8 py-8 transition-all duration-300 ${
            isCollapsed ? 'max-w-none' : 'max-w-7xl'
          }`}>
            <div className="grid grid-cols-12 gap-8">
              {/* Ask Question Section */}
              <div className="col-span-12 animate-in fade-in slide-in-from-top duration-600 delay-100">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                          <QuestionMarkCircleIcon className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ask a Question</h2>
                      </div>                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                        >
                          <SparklesIcon className="w-4 h-4" />
                          {showSuggestions ? 'Hide' : 'Show'} Suggestions
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4 rounded-b-2xl">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Your Question
                      </label>
                      <textarea
                        placeholder="What does this code do? How does authentication work? Explain the main architecture..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                        rows={3}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                      />
                    </div>

                    <Button
                      onClick={handleAskQuestion}
                      disabled={isAsking || !newQuestion.trim() || !selectedRepository}
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
                    </Button>
                  </div>
                </div>
              </div>

              {/* Question Suggestions */}
              {selectedRepository && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-150">
                  <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
                      <div className="flex items-center justify-between">                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center animate-pulse">
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Question Suggestions</h2>
                          <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full">
                            Smart Templates
                          </span>
                        </div>
                        <button
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          {showSuggestions ? (
                            <ChevronDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {showSuggestions && (
                      <div className="p-0 rounded-b-2xl">
                        <QuestionSuggestions
                          repository={selectedRepository}
                          onSelectQuestion={handleSelectSuggestion}
                          className="border-none rounded-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}              {/* Questions & Answers with Integrated History Features */}
              <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-200">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
                        </div>                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Questions & Answers</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">
                          {filteredQuestions.length} questions
                        </div>
                        {useConfidenceFilter && (
                          <div className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            Confidence: {Math.round(minConfidence * 100)}-{Math.round(maxConfidence * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Toggle filters"
                        >
                          <FunnelIcon className="w-4 h-4" />
                        </button>
                        <div className="relative group">
                          <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <button
                              onClick={() => exportQuestions('markdown')}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                            >
                              Export as Markdown
                            </button>
                            <button
                              onClick={() => exportQuestions('html')}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                            >
                              Export as HTML
                            </button>
                            <button
                              onClick={() => exportQuestions('json')}
                              className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                            >
                              Export as JSON
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filters */}
                    {showFilters && (
                      <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => setFilterFavorites(!filterFavorites)}
                              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                filterFavorites 
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <StarIcon className="w-4 h-4" />
                              Favorites Only
                            </button>
                            
                            {categories.length > 0 && (
                              <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-2 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                              >
                                <option value="">All Categories</option>
                                {categories.map(category => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <button
                            onClick={clearAllFilters}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            Clear All
                          </button>
                        </div>                        {/* Tag Filter */}
                        {allTags.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Tags
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {allTags.slice(0, 10).map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => toggleTag(tag)}
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

                        {/* Confidence Level Filter */}
                        <div>                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              AI Confidence Level
                            </label>
                            <button
                              onClick={() => setUseConfidenceFilter(!useConfidenceFilter)}
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
                                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
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
                                  onChange={(e) => setMaxConfidence(parseFloat(e.target.value))}
                                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">
                                  {Math.round(maxConfidence * 100)}%
                                </span>
                              </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                Showing answers with {Math.round(minConfidence * 100)}% - {Math.round(maxConfidence * 100)}% confidence
                              </div>
                              
                              {/* Preset confidence levels */}
                              <div className="flex gap-1 mt-2">
                                <button
                                  onClick={() => {
                                    setMinConfidence(0.8)
                                    setMaxConfidence(1.0)
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 rounded transition-colors"
                                >
                                  High (80-100%)
                                </button>
                                <button
                                  onClick={() => {
                                    setMinConfidence(0.5)
                                    setMaxConfidence(0.8)
                                  }}
                                  className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300 rounded transition-colors"
                                >
                                  Medium (50-80%)
                                </button>
                                <button
                                  onClick={() => {
                                    setMinConfidence(0.0)
                                    setMaxConfidence(0.5)
                                  }}
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
                  
                  <div className="p-6 rounded-b-2xl">
                    {filteredQuestions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                          <QuestionMarkCircleIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No questions yet</h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          Ask your first question about {selectedRepository.name} to get started!
                        </p>                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Always render questions, but pass visibility state for internal optimizations */}                        {questionsToShow.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            selectedRepository={selectedRepository}
                            expandedFiles={expandedFiles}
                            loadingFiles={loadingFiles}
                            fileContents={fileContents}
                            copiedStates={copiedStates}
                            languageMap={languageMap}
                            getStatusIcon={getStatusIcon}
                            getStatusColor={getStatusColor}
                            toggleFileExpansion={toggleFileExpansion}
                            copyToClipboard={copyToClipboard}
                            formatCodeContent={formatCodeContent}
                            getLanguageColor={getLanguageColor}
                            onQuestionUpdate={handleQuestionUpdate}                            getFollowUpSuggestions={getFollowUpSuggestions}
                            handleSelectFollowUp={handleSelectFollowUp}
                            isPageVisible={isPageVisible ?? true}
                            useConfidenceFilter={useConfidenceFilter}
                          />
                        ))}
                        
                        {/* Load More Button */}
                        {questionsToShow.length < filteredQuestions.length && (
                          <div className="text-center pt-6">
                            <button
                              onClick={loadMoreQuestions}
                              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors duration-200 font-medium"
                            >
                              Load More Questions ({filteredQuestions.length - questionsToShow.length} remaining)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
