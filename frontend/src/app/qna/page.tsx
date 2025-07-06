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
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
  const [newQuestion, setNewQuestion] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [visibleQuestions, setVisibleQuestions] = useState(10)
  const [enableDeepResearch, setEnableDeepResearch] = useState(false)
  const [questionAttachments, setQuestionAttachments] = useState<QuestionAttachment[]>([])
  const [currentThinkingQuestion, setCurrentThinkingQuestion] = useState('')
  const [optimisticQuestions, setOptimisticQuestions] = useState<Question[]>([])
  const queryClient = useQueryClient()

  // React Query: Fetch questions
  // Fix: fetchedQuestions is unknown by default, so type it as Question[]
  const {
    data: fetchedQuestionsRaw = [],
    isLoading,
    refetch: refetchQuestions
  } = useQuery<Question[]>({
    queryKey: ['questions', selectedRepository?.id],
    queryFn: async () => {
      if (!selectedRepository?.id) return []
      const response = await fetch(`/api/qna?repositoryId=${selectedRepository.id}&userId=1`)
      if (!response.ok) throw new Error('Failed to fetch questions')
      const data = await response.json()
      return data.questions || []
    },
    enabled: !!selectedRepository?.id,
    staleTime: 1000 * 60 // 1 minute
  })
  const fetchedQuestions = fetchedQuestionsRaw as Question[]

  // Merge fetched and optimistic questions, deduping by id (optimistic first)
  const mergedQuestions = useMemo(() => {
    const byId = new Map<string, Question>()
    for (const q of optimisticQuestions) byId.set(q.id, q)
    for (const q of fetchedQuestions) if (!byId.has(q.id)) byId.set(q.id, q)
    return Array.from(byId.values())
  }, [optimisticQuestions, fetchedQuestions])

  // Sort mergedQuestions so pending (optimistic) questions appear first, then by createdAt desc
  const sortedMergedQuestions = useMemo(() => {
    return [...mergedQuestions].sort((a, b) => {
      // Pending (optimistic) questions first
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      // Then by createdAt desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [mergedQuestions])

  // Use sortedMergedQuestions for filtering
  const filtering = useQnAFiltering({ 
    questions: sortedMergedQuestions, 
    selectedRepositoryId: selectedRepository?.id 
  })

  const actions = useQnAActions({
    selectedRepository: selectedRepository ? { 
      id: selectedRepository.id, 
      name: selectedRepository.name 
    } : undefined,
    onQuestionsUpdate: (newQuestions: Question[] | Question) => {
      // Optimistically update the local state for instant UI
      setOptimisticQuestions(prev => {
        if (Array.isArray(newQuestions)) {
          // Replace or merge all
          const byId = new Map(prev.map(q => [q.id, q]))
          for (const q of newQuestions) byId.set(q.id, q)
          return Array.from(byId.values())
        } else {
          // Update or insert single question
          const found = prev.find(q => q.id === newQuestions.id)
          if (found) {
            return prev.map(q => q.id === newQuestions.id ? newQuestions : q)
          } else {
            return [newQuestions, ...prev]
          }
        }
      })
      // Optionally, schedule a refetch after a short delay to sync with server
      // setTimeout(() => refetchQuestions(), 2000)
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
  }, [])

  // Update question count when fetchedQuestions change
  useEffect(() => {
    if (selectedRepository?.id) {
      const repositoryQuestions = fetchedQuestions.filter(q => q?.repositoryId === selectedRepository.id)
      updateQuestionCount(repositoryQuestions.length)
    }
  }, [fetchedQuestions, selectedRepository?.id, updateQuestionCount])

  // Remove optimistic questions only when backend returns a matching completed question
  useEffect(() => {
    if (!optimisticQuestions.length) return;
    const completedIds = new Set(fetchedQuestions.map(q => q.query.trim().toLowerCase()));
    setOptimisticQuestions(prev => prev.filter(optQ => !completedIds.has(optQ.query.trim().toLowerCase())));
  }, [fetchedQuestions, optimisticQuestions.length]);

  // Add optimistic pending question for deep thinking as well
  useEffect(() => {
    if (enableDeepResearch && currentThinkingQuestion && selectedRepository?.id) {
      // Only add if not already present
      const alreadyExists = optimisticQuestions.some(q => q.query.trim().toLowerCase() === currentThinkingQuestion.trim().toLowerCase());
      if (!alreadyExists) {
        const optimisticId = `optimistic-deep-${Date.now()}`;
        const pendingQuestion: Question = {
          id: optimisticId,
          query: currentThinkingQuestion.trim(),
          repositoryId: selectedRepository.id,
          repositoryName: selectedRepository.name,
          createdAt: new Date().toISOString(),
          status: 'pending',
          tags: [],
          category: '',
          relevantFiles: [],
          confidence: 0,
          isFavorite: false,
          reasoningSteps: [],
          hasMultiStepReasoning: true,
          questionAttachments: questionAttachments || [],
        };
        setOptimisticQuestions(prev => [pendingQuestion, ...prev]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDeepResearch, currentThinkingQuestion, selectedRepository?.id])

  // In ThinkingProcess onAnswerSubmitted, just refetch (optimistic removal is handled globally)
  const handleAskQuestion = useCallback(async () => {
    if (!newQuestion.trim()) return
    
    // Set thinking mode if deep research is enabled
    if (enableDeepResearch) {
      setCurrentThinkingQuestion(newQuestion.trim())
    } else {
      setCurrentThinkingQuestion('')
    }
    
    // Clear the input
    const questionText = newQuestion.trim()
    setNewQuestion('')
    setQuestionAttachments([])
    
    // Let the actions handle the optimistic update and API call
    await actions.handleAskQuestion(questionText, questionAttachments)
    
    // Refetch after a short delay to ensure consistency
    setTimeout(() => {
      refetchQuestions()
    }, 1000)
  }, [newQuestion, questionAttachments, actions, enableDeepResearch, refetchQuestions])  
  
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setNewQuestion(suggestion)
    setShowSuggestions(false)
    
    // Auto-focus on the textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What does this code do"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(suggestion.length, suggestion.length)
      }
    }, 100)
  }, [])
  const handleSelectFollowUp = useCallback((originalQuestion: Question, followUpText: string) => {
    actions.handleSelectFollowUp(originalQuestion, followUpText, setNewQuestion)
  }, [actions])

  // Move all code that depends on 'filtering' to after its declaration
  // Export handler
  const handleExport = useCallback((format: 'markdown' | 'json' | 'html') => {
    actions.exportQuestions(format, {
      filterFavorites: filtering.filterFavorites,
      selectedCategory: filtering.selectedCategory,
      selectedFileTypes: filtering.selectedFileTypes
    })
  }, [actions, filtering])

  // Memoized filtered questions for display, sorted by createdAt (most recent first)
  const sortedFilteredQuestions = useMemo(
    () => [...filtering.filteredQuestions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filtering.filteredQuestions]
  )
  const questionsToShow = useMemo(() => 
    sortedFilteredQuestions.slice(0, visibleQuestions), 
    [sortedFilteredQuestions, visibleQuestions]
  )

  const loadMoreQuestions = useCallback(() => {
    setVisibleQuestions(prev => Math.min(prev + 10, filtering.filteredQuestions.length))
  }, [filtering.filteredQuestions.length])

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
            <div className={`mx-auto px-4 py-5 sm:px-8 sm:py-7 transition-all duration-300 ${
              isCollapsed ? 'max-w-none' : 'max-w-7xl'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="relative group">
                    {selectedRepository.owner?.avatar_url ? (
                      <Image
                        src={selectedRepository.owner.avatar_url}
                        alt={`${selectedRepository.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in"
                      />
                    ) : (
                      <div className={`w-12 h-12 sm:w-12 sm:h-12 bg-gradient-to-br from-${enableDeepResearch ? 'purple' : 'blue'}-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in`}>
                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="animate-in slide-in-from-left duration-500 delay-200">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                      <SparklesIcon className={`w-6 h-6 text-${enableDeepResearch ? 'purple' : 'blue'}-500`} />
                      Q&A Assistant
                      {enableDeepResearch && (
                        <span className="text-xs sm:text-sm px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-medium">
                          Thinking Mode
                        </span>
                      )}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-base">
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
            <div className="flex flex-col gap-8">
              {/* QnA Input + Suggestions Row */}
              <div className="w-full">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch h-full min-h-[220px]">
                  {/* Ask a Question (left, 2/3 or full width) */}
                  <div
                    className={`transition-all duration-500 ease-in-out h-full ${
                      showSuggestions && selectedRepository
                        ? 'lg:w-2/3 w-full'
                        : 'w-full'
                    } ${enableDeepResearch ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' : ''}`}
                  >
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
                      onAttachmentsChange={setQuestionAttachments}
                    />
                  </div>
                  {/* Suggestions (right, 1/3) */}
                  {showSuggestions && selectedRepository && (
                    <aside className="lg:w-1/3 w-full h-full flex flex-col">
                      <QuestionSuggestions
                        repository={selectedRepository}
                        onSelectQuestion={handleSelectSuggestion}
                        className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300 h-full"
                      />
                    </aside>
                  )}
                </div>
              </div>
              {/* AI Thinking Process */}
              {enableDeepResearch && selectedRepository && currentThinkingQuestion && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-200">
                  <ThinkingProcess
                    repositoryId={selectedRepository.id}
                    question={currentThinkingQuestion}
                    isVisible={enableDeepResearch}
                    onClose={() => {
                      setEnableDeepResearch(false)
                      setQuestionAttachments([])
                      setCurrentThinkingQuestion('') // Clear the current thinking question when closed
                    }}
                    attachments={questionAttachments}
                    onAnswerSubmitted={async (answer) => {
                      setQuestionAttachments([])
                      setTimeout(async () => {
                        await refetchQuestions()
                        console.log('Questions refreshed after thinking answer submitted')
                        setEnableDeepResearch(false)
                        setCurrentThinkingQuestion('') // Also clear after answer is posted
                      }, 1000)
                    }}
                    onClearThinking={() => setCurrentThinkingQuestion('')} // Clear when user hits Clear
                  />
                </div>
              )}

              {/* Questions & Answers Section */}
              <section className="col-span-12 animate-in fade-in slide-in-from-bottom duration-600 delay-200" aria-label="Questions and Answers">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
                    <QnAHeader
                      questionsCount={filtering.filteredQuestions.length}
                      useConfidenceFilter={filtering.useConfidenceFilter}
                      minConfidence={filtering.minConfidence}
                      maxConfidence={filtering.maxConfidence}
                      selectedFileTypes={filtering.selectedFileTypes}
                      showSuggestions={showSuggestions}
                      onExport={handleExport}
                      onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
                      onToggleFilters={() => filtering.setShowFilters(!filtering.showFilters)}
                    />
                    {/* Search Bar */}
                    <QnASearchBar
                      searchQuery={filtering.searchQuery}
                      onSearchChange={filtering.setSearchQuery}
                      className="mb-2 mt-2 sm:mb-3 sm:mt-3"
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
                  <div className="p-3 sm:p-6 rounded-b-2xl">
                    {filtering.filteredQuestions.length === 0 ? (
                      <QnAEmptyState repositoryName={selectedRepository.name} />
                    ) : (
                      <div className="space-y-4">
                        {questionsToShow.map((question: Question, idx: number) => (
                          <div
                            key={question.id}
                            style={{
                              animation: `fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both`,
                              animationDelay: `${idx * 60}ms`,
                            }}
                            tabIndex={-1}
                          >
                            <QuestionCard
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
                          </div>
                        ))}
                        {/* Load More Button */}
                        {questionsToShow.length < filtering.filteredQuestions.length && (
                          <div className="text-center pt-4 sm:pt-6">
                            <button
                              onClick={loadMoreQuestions}
                              className="px-4 py-2 sm:px-6 sm:py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors duration-200 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 text-sm sm:text-base"
                            >
                              Load More Questions ({filtering.filteredQuestions.length - questionsToShow.length} remaining)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

/* Add global fadeInUp animation if not present */
/* In your global CSS (e.g., globals.css):
@keyframes fadeInUp {
  from { opacity: 0; transform: translate3d(0, 24px, 0); }
  to { opacity: 1; transform: none; }
}

Add to your global CSS (e.g., globals.css) for smooth grid resizing:
.grid-cols-3 > .transition-all {
  transition-property: grid-column, width, max-width, min-width, padding, margin, background, box-shadow;
}
*/
