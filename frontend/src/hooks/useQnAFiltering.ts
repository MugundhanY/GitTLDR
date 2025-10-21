'use client'

import { useState, useCallback, useMemo } from 'react'
import { QuestionAttachment } from '@/types/attachments'
import { useDebounce } from './useDebounce'

export interface Question {
  id: string
  query: string
  answer?: string
  repositoryId: string
  repositoryName: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
  tags?: string[]
  category?: string
  relevantFiles?: (string | any)[] // Can be strings or objects with path properties
  confidence?: number
  isFavorite?: boolean
  questionAttachments?: QuestionAttachment[]
  feedback?: 'LIKE' | 'DISLIKE' | null
  feedbackAt?: string | null
}

export interface FileContent {
  content: string
  language: string
  type: string
}

interface UseQnAFilteringProps {
  questions: Question[]
  selectedRepositoryId?: string
}

interface UseQnAFilteringReturn {
  // Filtered data
  filteredQuestions: Question[]
  categories: string[]
  allTags: string[]
  allFileTypes: string[]
  
  // Filter state
  searchQuery: string
  filterFavorites: boolean
  selectedCategory: string
  selectedTags: string[]
  selectedFileTypes: string[]
  minConfidence: number
  maxConfidence: number
  useConfidenceFilter: boolean
  showFilters: boolean
  
  // Actions
  setSearchQuery: (query: string) => void
  setFilterFavorites: (favorites: boolean) => void
  setSelectedCategory: (category: string) => void
  toggleTag: (tag: string) => void
  toggleFileType: (fileType: string) => void
  setMinConfidence: (confidence: number) => void
  setMaxConfidence: (confidence: number) => void
  setUseConfidenceFilter: (use: boolean) => void
  setShowFilters: (show: boolean) => void
  clearAllFilters: () => void
  handleConfidenceChange: (min: number, max: number) => void
}

export function useQnAFiltering({ 
  questions, 
  selectedRepositoryId 
}: UseQnAFilteringProps): UseQnAFilteringReturn {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce search for better performance
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [minConfidence, setMinConfidence] = useState<number>(0)
  const [maxConfidence, setMaxConfidence] = useState<number>(1)
  const [useConfidenceFilter, setUseConfidenceFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  // Computed values for filtering
  const categories = useMemo(() => 
    Array.from(new Set(questions.map(q => q.category).filter((cat): cat is string => Boolean(cat)))), 
    [questions]
  )
  
  const allTags = useMemo(() => 
    Array.from(new Set(questions.flatMap(q => q.tags || []))), 
    [questions]
  )
  // Get unique file types/extensions from relevant files
  const allFileTypes = useMemo(() => {
    const extensions = new Set<string>()
    questions.forEach(q => {
      if (q.relevantFiles && Array.isArray(q.relevantFiles)) {
        q.relevantFiles.forEach(filePath => {
          // Handle different possible formats of filePath
          let pathString: string | undefined
          
          if (typeof filePath === 'string') {
            pathString = filePath
          } else if (filePath && typeof filePath === 'object') {
            // Handle case where filePath might be an object with path property
            pathString = (filePath as any).path || (filePath as any).name || (filePath as any).fileName
          }
          
          if (pathString && typeof pathString === 'string') {
            const extension = pathString.split('.').pop()?.toLowerCase()
            if (extension) {
              extensions.add(extension)
            }
          }
        })
      }
    })
    return Array.from(extensions).sort()
  }, [questions])

  // Enhanced filtering logic
  const filteredQuestions = useMemo(() => {
    let filtered = selectedRepositoryId 
      ? questions.filter(q => q?.repositoryId === selectedRepositoryId)
      : questions

    // Apply search filter (using debounced query for better performance)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
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
    }    // Apply file type filter
    if (selectedFileTypes.length > 0) {
      filtered = filtered.filter(q => {
        if (!q.relevantFiles || q.relevantFiles.length === 0) {
          return false // No relevant files, so it doesn't match any file type filter
        }
        return q.relevantFiles.some(filePath => {
          // Handle different possible formats of filePath
          let pathString: string | undefined
          
          if (typeof filePath === 'string') {
            pathString = filePath
          } else if (filePath && typeof filePath === 'object') {
            // Handle case where filePath might be an object with path property
            pathString = (filePath as any).path || (filePath as any).name || (filePath as any).fileName
          }
          
          if (pathString && typeof pathString === 'string') {
            const extension = pathString.split('.').pop()?.toLowerCase()
            return extension && selectedFileTypes.includes(extension)
          }
          
          return false
        })
      })
    }

    // Apply confidence level filter
    if (useConfidenceFilter) {
      filtered = filtered.filter(q => {
        const confidence = q.confidence || 0
        return confidence >= minConfidence && confidence <= maxConfidence
      })
    }
    
    return filtered
  }, [
    questions, 
    selectedRepositoryId, 
    debouncedSearchQuery, // Use debounced query in dependencies
    filterFavorites, 
    selectedCategory, 
    selectedTags, 
    selectedFileTypes, 
    useConfidenceFilter, 
    minConfidence, 
    maxConfidence
  ])

  // Filter utility functions
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  const toggleFileType = useCallback((fileType: string) => {
    setSelectedFileTypes(prev => 
      prev.includes(fileType) 
        ? prev.filter(t => t !== fileType)
        : [...prev, fileType]
    )
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setFilterFavorites(false)
    setSelectedCategory('')
    setSelectedTags([])
    setSelectedFileTypes([])
    setUseConfidenceFilter(false)
    setMinConfidence(0)
    setMaxConfidence(1)
  }, [])

  const handleConfidenceChange = useCallback((min: number, max: number) => {
    setMinConfidence(min)
    setMaxConfidence(max)
  }, [])

  return {
    // Filtered data
    filteredQuestions,
    categories,
    allTags,
    allFileTypes,
    
    // Filter state
    searchQuery,
    filterFavorites,
    selectedCategory,
    selectedTags,
    selectedFileTypes,
    minConfidence,
    maxConfidence,
    useConfidenceFilter,
    showFilters,
    
    // Actions
    setSearchQuery,
    setFilterFavorites,
    setSelectedCategory,
    toggleTag,
    toggleFileType,
    setMinConfidence,
    setMaxConfidence,
    setUseConfidenceFilter,
    setShowFilters,
    clearAllFilters,
    handleConfidenceChange
  }
}
