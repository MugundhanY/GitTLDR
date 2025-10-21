'use client'

import { useState, useEffect } from 'react'
import { useRepository } from '@/contexts/RepositoryContext'
import { useUserData } from '@/hooks/useUserData'
import { 
  StarIcon,
  TagIcon,
  FolderIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
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
  relevantFiles?: (string | any)[] // Can be strings or objects with path properties
  isFavorite?: boolean
  tags?: string[]
  category?: string
  notes?: string
}

interface QuestionHistoryProps {
  onSelectQuestion: (question: Question) => void
  currentQuestionId?: string
  className?: string
}

const QuestionHistory = ({ onSelectQuestion, currentQuestionId, className = '' }: QuestionHistoryProps) => {
  const { selectedRepository } = useRepository()
  const { userData } = useUserData()
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Get unique categories and tags
  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)))
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags || [])))

  useEffect(() => {
    if (selectedRepository?.id) {
      fetchQuestions()
    }
  }, [selectedRepository?.id])

  useEffect(() => {
    applyFilters()
  }, [questions, searchQuery, filterFavorites, selectedCategory, selectedTags])

  const fetchQuestions = async () => {
    if (!selectedRepository?.id || !userData?.id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: userData.id,
      })

      const response = await fetch(`/api/qna?${params}`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...questions]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(q => 
        q.query.toLowerCase().includes(query) ||
        q.answer?.toLowerCase().includes(query) ||
        q.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Favorites filter
    if (filterFavorites) {
      filtered = filtered.filter(q => q.isFavorite)
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory)
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => 
        selectedTags.some(tag => q.tags?.includes(tag))
      )
    }

    setFilteredQuestions(filtered)
  }
  const toggleFavorite = async (questionId: string, currentFavorite: boolean) => {
    // Optimistic update for immediate UI feedback
    setQuestions(prev => 
      prev.map(q => 
        q.id === questionId 
          ? { ...q, isFavorite: !currentFavorite }
          : q
      )
    )

    try {
      const response = await fetch('/api/qna', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          userId: userData?.id || '1',
          isFavorite: !currentFavorite
        })
      })

      if (!response.ok) {
        // Revert the optimistic update if the API call fails
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId 
              ? { ...q, isFavorite: currentFavorite }
              : q
          )
        )
        console.error('Failed to toggle favorite:', response.statusText)
      }
    } catch (error) {
      // Revert the optimistic update if there's an error
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, isFavorite: currentFavorite }
            : q
        )
      )
      console.error('Error toggling favorite:', error)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterFavorites(false)
    setSelectedCategory('')
    setSelectedTags([])
  }

  const exportQuestions = async (format: 'markdown' | 'json' | 'html') => {
    if (!selectedRepository?.id || !userData?.id) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: userData.id,
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
      }
    } catch (error) {
      console.error('Error exporting questions:', error)
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-500" />
            Question History
          </h3>
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
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Export as Markdown
                </button>
                <button
                  onClick={() => exportQuestions('html')}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Export as HTML
                </button>
                <button
                  onClick={() => exportQuestions('json')}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              </div>
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Clear All
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {allTags.map(tag => (
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            Loading questions...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            {searchQuery || filterFavorites || selectedCategory || selectedTags.length > 0 
              ? 'No questions match your filters' 
              : 'No questions yet'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                onClick={() => onSelectQuestion(question)}
                className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  currentQuestionId === question.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 flex-1 mr-2">
                    {question.query}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(question.id, question.isFavorite || false)
                    }}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-yellow-500 transition-colors"
                  >
                    {question.isFavorite ? (
                      <StarIconSolid className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <ClockIcon className="w-3 h-3" />
                  <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                  {question.confidence && (
                    <>
                      <span>•</span>
                      <span>{Math.round(question.confidence * 100)}% confidence</span>
                    </>
                  )}
                </div>

                {(question.tags && question.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {question.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {question.tags.length > 3 && (
                      <span className="text-xs text-slate-400">+{question.tags.length - 3} more</span>
                    )}
                  </div>
                )}

                {question.category && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FolderIcon className="w-3 h-3" />
                    <span>{question.category}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionHistory
