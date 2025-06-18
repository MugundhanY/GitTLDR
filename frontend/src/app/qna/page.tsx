'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository, Repository } from '@/contexts/RepositoryContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useQnA } from '@/contexts/QnAContext'
import { 
  ChatBubbleLeftRightIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

// Components
import QuestionInput from '@/components/qna/QuestionInput'
import QnAHeader from '@/components/qna/QnAHeader'
import QnASearchBar from '@/components/qna/QnASearchBar'
import QnAFilterPanel from '@/components/qna/QnAFilterPanel'
import QnAEmptyState from '@/components/qna/QnAEmptyState'
import QuestionCard from '@/components/qna/QuestionCard'
import QuestionSuggestions from '@/components/ui/QuestionSuggestions'
import ReasoningSteps from '@/components/qna/ReasoningSteps'
import ThinkingProcess from '@/components/qna/ThinkingProcess'

// Hooks
import { useQnAFiltering, Question } from '@/hooks/useQnAFiltering'
import { useQnAActions } from '@/hooks/useQnAActions'
import { useCodeFormatting } from '@/hooks/useCodeFormatting'

import { QuestionAttachment } from '@/types/attachments'

export default function QnAPage() {
  const { selectedRepository } = useRepository()
  const { isCollapsed } = useSidebar()
  const { incrementQuestionCount, updateQuestionCount, triggerStatsRefreshOnCompletion } = useQnA()
    // Core state
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [visibleQuestions, setVisibleQuestions] = useState(10)  
  const [enableDeepResearch, setEnableDeepResearch] = useState(false)
  const [questionAttachments, setQuestionAttachments] = useState<QuestionAttachment[]>([])
  const [currentThinkingQuestion, setCurrentThinkingQuestion] = useState('')
  const filtering = useQnAFiltering({ 
    questions, 
    selectedRepositoryId: selectedRepository?.id 
  })
  
  const actions = useQnAActions({
    selectedRepository: selectedRepository ? { 
      id: selectedRepository.id, 
      name: selectedRepository.name 
    } : undefined,
    onQuestionsUpdate: (newQuestions: Question[] | Question) => {
      if (Array.isArray(newQuestions)) {
        setQuestions(newQuestions)
      } else {
        // Handle single question update - either update existing or add new
        setQuestions(prev => {
          const existingQuestionIndex = prev.findIndex(q => q.id === newQuestions.id)
          if (existingQuestionIndex >= 0) {
            // Update existing question
            return prev.map(q => q.id === newQuestions.id ? newQuestions : q)
          } else {
            // Add new question at the beginning
            return [newQuestions, ...prev]
          }
        })
      }
    },
    incrementQuestionCount,
    triggerStatsRefreshOnCompletion
  })
  
  // Update the deep research setting
  useEffect(() => {
    actions.multiStepReasoning.enableMultiStepReasoning = enableDeepResearch
  }, [enableDeepResearch, actions.multiStepReasoning])

  const codeFormatting = useCodeFormatting()

  // Page visibility tracking
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
  }, [])  // Fetch questions when repository changes
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
        
        // Merge with any pending questions
        setQuestions(prev => {
          const pendingQuestions = prev.filter(q => q.status === 'pending')
          const completedQuestionIds = new Set(fetchedQuestions.map((q: Question) => q.id))
          const remainingPendingQuestions = pendingQuestions.filter(q => !completedQuestionIds.has(q.id))
          
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
  }, [selectedRepository?.id]) // Include selectedRepository?.id as dependency for proper memoization  // Only fetch questions once when repository changes (not continuously)
  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions]) // Depend on memoized fetchQuestions function

  // Update question count when questions change
  useEffect(() => {
    if (selectedRepository?.id) {
      const repositoryQuestions = questions.filter(q => q?.repositoryId === selectedRepository.id)
      updateQuestionCount(repositoryQuestions.length)
    }
  }, [questions, selectedRepository?.id, updateQuestionCount])
  
  // Auto-show suggestions for new repositories or when no questions exist
  useEffect(() => {
    if (selectedRepository?.id) {
      const repositoryQuestions = questions.filter(q => q?.repositoryId === selectedRepository.id)
      // Only auto-show suggestions when there are no questions, don't auto-hide when questions exist
      if (repositoryQuestions.length === 0 && !newQuestion.trim()) {
        setShowSuggestions(true)
      }
    }
  }, [questions, selectedRepository?.id, newQuestion])

  // Advanced search effect - only trigger search when confidence filter is enabled and settings change
  useEffect(() => {
    if (filtering.useConfidenceFilter) {
      actions.performAdvancedSearch({
        searchQuery: filtering.searchQuery,
        selectedCategory: filtering.selectedCategory,
        selectedTags: filtering.selectedTags,
        selectedFileTypes: filtering.selectedFileTypes,
        filterFavorites: filtering.filterFavorites,
        minConfidence: filtering.minConfidence,
        maxConfidence: filtering.maxConfidence,
        useConfidenceFilter: filtering.useConfidenceFilter
      })
    }
    // REMOVED: Don't call fetchQuestions() here as it causes continuous polling
  }, [
    filtering.useConfidenceFilter, 
    filtering.minConfidence, 
    filtering.maxConfidence, 
    actions.performAdvancedSearch, // Only depend on the search function
    filtering.searchQuery,
    filtering.selectedCategory,
    filtering.selectedTags,
    filtering.selectedFileTypes,
    filtering.filterFavorites
  ])

  // Memoized filtered questions for display
  const questionsToShow = useMemo(() => 
    filtering.filteredQuestions.slice(0, visibleQuestions), 
    [filtering.filteredQuestions, visibleQuestions]
  )
  
  const loadMoreQuestions = useCallback(() => {
    setVisibleQuestions(prev => Math.min(prev + 10, filtering.filteredQuestions.length))
  }, [filtering.filteredQuestions.length])  // Question handlers
  const handleAskQuestion = useCallback(async () => {
    if (!newQuestion.trim()) return
    
    // If thinking mode is enabled, trigger thinking process
    if (enableDeepResearch) {
      setCurrentThinkingQuestion(newQuestion.trim())
    }
    
    await actions.handleAskQuestion(newQuestion.trim(), questionAttachments)
    setNewQuestion('')
    setQuestionAttachments([]) // Clear attachments after submitting
  }, [newQuestion, questionAttachments, actions, enableDeepResearch, selectedRepository])  
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setNewQuestion(suggestion)
    setShowSuggestions(false)
    
    // If thinking mode is enabled, set the thinking question
    if (enableDeepResearch) {
      setCurrentThinkingQuestion(suggestion)
    }
      // Auto-focus on the textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What does this code do"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(suggestion.length, suggestion.length)
      }
    }, 100)
  }, [enableDeepResearch])
  const handleSelectFollowUp = useCallback((originalQuestion: Question, followUpText: string) => {
    actions.handleSelectFollowUp(originalQuestion, followUpText, setNewQuestion)
  }, [actions])

  // Export handler
  const handleExport = useCallback((format: 'markdown' | 'json' | 'html') => {
    actions.exportQuestions(format, {
      filterFavorites: filtering.filterFavorites,
      selectedCategory: filtering.selectedCategory,
      selectedFileTypes: filtering.selectedFileTypes
    })
  }, [actions, filtering])

  // Status utility functions
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

  // Loading and error states
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
      {/* Background */}
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
                  <div className="animate-in slide-in-from-left duration-500 delay-200">                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <SparklesIcon className="w-6 h-6 text-blue-500" />
                      Q&A Assistant                      {enableDeepResearch && (
                        <span className="text-sm px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-medium">
                          Thinking Mode
                        </span>
                      )}
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
            <div className="grid grid-cols-12 gap-8">              {/* Question Input Section */}              <div className="col-span-12 animate-in fade-in slide-in-from-top duration-600 delay-100">
                <QuestionInput
                  repository={selectedRepository}
                  question={newQuestion}
                  onQuestionChange={setNewQuestion}
                  onSubmit={handleAskQuestion}
                  isAsking={actions.isAsking}
                  showSuggestions={showSuggestions}
                  onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
                  onSelectSuggestion={handleSelectSuggestion}
                  enableDeepResearch={enableDeepResearch}
                  onToggleDeepResearch={() => setEnableDeepResearch(!enableDeepResearch)}
                  attachments={questionAttachments}
                  onAttachmentsChange={setQuestionAttachments}                />
              </div>

              {/* AI Thinking Process */}
              {enableDeepResearch && selectedRepository && currentThinkingQuestion && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-200">
                  <ThinkingProcess
                    repositoryId={selectedRepository.id}
                    question={currentThinkingQuestion}
                    isVisible={enableDeepResearch}
                    onClose={() => setEnableDeepResearch(false)}
                  />
                </div>
              )}

              {/* Question Suggestions Section */}
              {showSuggestions && selectedRepository && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-150">
                  <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center animate-pulse">
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Question Suggestions</h2>
                          <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full">
                            Smart Templates
                          </span>
                        </div>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <ChevronDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-0 rounded-b-2xl">
                      <QuestionSuggestions
                        repository={selectedRepository}
                        onSelectQuestion={handleSelectSuggestion}
                        className="border-none rounded-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Questions & Answers Section */}
              <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-200">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">                    <QnAHeader
                      questionsCount={filtering.filteredQuestions.length}
                      useConfidenceFilter={filtering.useConfidenceFilter}
                      minConfidence={filtering.minConfidence}
                      maxConfidence={filtering.maxConfidence}
                      selectedFileTypes={filtering.selectedFileTypes}
                      showSuggestions={showSuggestions}
                      onExport={handleExport}
                      onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
                    />

                    {/* Search Bar */}
                    <QnASearchBar
                      searchQuery={filtering.searchQuery}
                      onSearchChange={filtering.setSearchQuery}
                      className="mb-3 mt-3"
                    />

                    {/* Filters */}
                    <QnAFilterPanel
                      searchQuery={filtering.searchQuery}
                      onSearchChange={filtering.setSearchQuery}
                      filterFavorites={filtering.filterFavorites}
                      onToggleFavorites={() => filtering.setFilterFavorites(!filtering.filterFavorites)}
                      categories={filtering.categories}
                      selectedCategory={filtering.selectedCategory}
                      onCategoryChange={filtering.setSelectedCategory}
                      allTags={filtering.allTags}
                      selectedTags={filtering.selectedTags}
                      onToggleTag={filtering.toggleTag}
                      allFileTypes={filtering.allFileTypes}
                      selectedFileTypes={filtering.selectedFileTypes}
                      onToggleFileType={filtering.toggleFileType}
                      useConfidenceFilter={filtering.useConfidenceFilter}
                      onToggleConfidenceFilter={() => filtering.setUseConfidenceFilter(!filtering.useConfidenceFilter)}
                      minConfidence={filtering.minConfidence}
                      maxConfidence={filtering.maxConfidence}
                      onConfidenceChange={filtering.handleConfidenceChange}
                      onClearFilters={filtering.clearAllFilters}
                      showFilters={filtering.showFilters}
                      onToggleFilters={() => filtering.setShowFilters(!filtering.showFilters)}
                    />
                  </div>
                  
                  {/* Questions List */}
                  <div className="p-6 rounded-b-2xl">
                    {filtering.filteredQuestions.length === 0 ? (
                      <QnAEmptyState repositoryName={selectedRepository.name} />
                    ) : (
                      <div className="space-y-4">
                        {questionsToShow.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            selectedRepository={selectedRepository}
                            expandedFiles={actions.expandedFiles}
                            loadingFiles={actions.loadingFiles}
                            fileContents={actions.fileContents}
                            copiedStates={actions.copiedStates}
                            languageMap={codeFormatting.languageMap}
                            getStatusIcon={getStatusIcon}
                            getStatusColor={getStatusColor}
                            toggleFileExpansion={actions.toggleFileExpansion}
                            copyToClipboard={actions.copyToClipboard}
                            formatCodeContent={codeFormatting.formatCodeContent}
                            getLanguageColor={codeFormatting.getLanguageColor}
                            onQuestionUpdate={actions.handleQuestionUpdate}
                            getFollowUpSuggestions={actions.getFollowUpSuggestions}
                            handleSelectFollowUp={handleSelectFollowUp}
                            isPageVisible={isPageVisible}
                            useConfidenceFilter={filtering.useConfidenceFilter}
                          />
                        ))}
                        
                        {/* Load More Button */}
                        {questionsToShow.length < filtering.filteredQuestions.length && (
                          <div className="text-center pt-6">
                            <button
                              onClick={loadMoreQuestions}
                              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors duration-200 font-medium"
                            >
                              Load More Questions ({filtering.filteredQuestions.length - questionsToShow.length} remaining)
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
