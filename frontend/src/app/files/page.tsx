'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  FileSearchAndFilters,
  FileBrowser,
  FileContentViewer,
  LanguageDistribution,
  ErrorDisplay,
  formatFileSize,
  getFileIcon,
  FileItem,
  FileStats,
  Breadcrumb
} from '@/components/files'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1000, delay: number = 0) => {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const countRef = useRef<HTMLSpanElement>(null)
  const lastEndRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  // Separate effect to handle animation when visible and end value changes
  useEffect(() => {
    // Only animate if visible, end value changed, and not currently animating
    if (isVisible && end !== lastEndRef.current && !isAnimating) {
      setIsAnimating(true)
      
      const timeoutId = setTimeout(() => {
        const startTime = Date.now()
        const startValue = count
        
        const updateCount = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          const easeOutCubic = 1 - Math.pow(1 - progress, 3)
          const currentCount = Math.floor(startValue + (end - startValue) * easeOutCubic)
          
          setCount(currentCount)
          
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(updateCount)
          } else {
            setCount(end)
            lastEndRef.current = end
            setIsAnimating(false)
            animationFrameRef.current = null
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(updateCount)
      }, delay)

      return () => {
        clearTimeout(timeoutId)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        setIsAnimating(false)
      }
    }
  }, [isVisible, end, duration, delay]) // Removed count, lastEnd, and isAnimating from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return { count, ref: countRef, isVisible }
}

// Animated Header Stats Component
const AnimatedHeaderStats = ({ stats }: { stats?: FileStats }) => {
  if (!stats) return null;
  const filesCounter = useAnimatedCounter(stats.totalFiles, 1200, 100)
  const sizeCounter = useAnimatedCounter(stats.totalSize, 1000, 200)
  const languagesCounter = useAnimatedCounter(stats.languages.length, 800, 300)

  // Helper function to format animated size counter
  const formatAnimatedSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = bytes / Math.pow(k, i)
    
    // For animation, we want to show incremental values
    return `${size.toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`
  }

  return (
    <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 mt-1">
      <span 
        ref={filesCounter.ref}
        className="flex items-center gap-2 transition-all duration-300 hover:text-green-600 dark:hover:text-green-400 hover:scale-105 cursor-pointer"
      >
        <div className={`w-2 h-2 bg-green-500 rounded-full transition-all duration-500 ${
          filesCounter.isVisible ? 'animate-pulse scale-100' : 'scale-0'
        }`}></div>
        <span className={`transition-all duration-500 ${
          filesCounter.isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`}>
          {filesCounter.count.toLocaleString()} files
        </span>
      </span>
      <span 
        ref={sizeCounter.ref}
        className="flex items-center gap-2 transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 cursor-pointer"
      >
        <div className={`w-2 h-2 bg-blue-500 rounded-full transition-all duration-500 ${
          sizeCounter.isVisible ? 'animate-pulse scale-100' : 'scale-0'
        }`} style={{ transitionDelay: '200ms' }}></div>
        <span className={`transition-all duration-500 ${
          sizeCounter.isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`} style={{ transitionDelay: '200ms' }}>
          {formatAnimatedSize(sizeCounter.count)}
        </span>
      </span>
      <span 
        ref={languagesCounter.ref}
        className="flex items-center gap-2 transition-all duration-300 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 cursor-pointer"
      >
        <div className={`w-2 h-2 bg-purple-500 rounded-full transition-all duration-500 ${
          languagesCounter.isVisible ? 'animate-pulse scale-100' : 'scale-0'
        }`} style={{ transitionDelay: '400ms' }}></div>
        <span className={`transition-all duration-500 ${
          languagesCounter.isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`} style={{ transitionDelay: '400ms' }}>
          {languagesCounter.count} {languagesCounter.count === 1 ? 'language' : 'languages'}
        </span>
      </span>
    </div>
  )
}

export default function FilesPage() {
  const { selectedRepository } = useRepository()
  const { isCollapsed } = useSidebar()
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [error, setError] = useState<string | null>(null)  
  
  // Consolidated search state - single source of truth
  const [searchState, setSearchState] = useState({
    // Basic search
    query: '',
    language: 'all',
    
    // Advanced search modes
    mode: 'normal' as 'normal' | 'regex' | 'exact',
    caseSensitive: false,
    searchInSummaries: false,
    
    // File filters
    minFileSize: '',
    maxFileSize: '',
    selectedExtensions: [] as string[],
    
    // Advanced filter state
    useAdvancedFilters: false,
    advancedFilteredFiles: [] as FileItem[]
  })
  
  // Performance optimizations
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // React Query: Fetch files, stats, breadcrumbs
  const {
    data: filesData,
    isLoading: isFilesLoading,
    error: filesError,
    refetch: refetchFiles
  } = useQuery({
    queryKey: [
      'files',
      selectedRepository?.id,
      searchState.query,
      selectedLanguage,
      searchState.searchInSummaries
    ],
    queryFn: async () => {
      if (!selectedRepository) return null
      const params = new URLSearchParams({
        ...(searchState.query && { search: searchState.query }),
        ...(selectedLanguage !== 'all' && { language: selectedLanguage }),
        ...(searchState.searchInSummaries && { searchInSummaries: 'true' })
      })
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files?${params}`)
      if (!response.ok) throw new Error('Failed to fetch files')
      return await response.json()
    },
    enabled: !!selectedRepository,
    staleTime: 1000 * 60 // 1 minute
  })

  // React Query: Fetch file content
  const {
    data: fileContentData,
    isLoading: isFileContentLoading,
    refetch: refetchFileContent
  } = useQuery({
    queryKey: [
      'fileContent',
      selectedRepository?.id,
      selectedFile?.id
    ],
    queryFn: async () => {
      if (!selectedRepository || !selectedFile) return null
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files/${selectedFile.id}/content`)
      if (!response.ok) throw new Error('Failed to fetch file content')
      return await response.json()
    },
    enabled: !!selectedRepository && !!selectedFile,
    staleTime: 1000 * 60 // 1 minute
  })

  // Cleanup function
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Client-side filtering for better performance
  const filteredFiles = useMemo(() => {
    if (searchState.useAdvancedFilters) {
      // Perform advanced search with current search query and settings
      let filtered = filesData?.files || []

      // Apply search query using the same logic as the child component
      const hasSearchQuery = searchState.query.trim()
      const shouldApplySearchFilter = hasSearchQuery || searchState.mode === 'exact'
      
      if (shouldApplySearchFilter) {
        filtered = filtered.filter((file: FileItem) => {
          // If no search query and in exact mode, match nothing
          if (!hasSearchQuery && searchState.mode === 'exact') {
            return false
          }
          
          // If no search query and not in exact mode, match everything
          if (!hasSearchQuery) {
            return true
          }
          
          let searchTarget = file.name
          if (searchState.searchInSummaries && file.summary) {
            searchTarget += ' ' + file.summary
          }

          if (!searchState.caseSensitive) {
            searchTarget = searchTarget.toLowerCase()
          }

          const query = searchState.caseSensitive ? searchState.query : searchState.query.toLowerCase()

          switch (searchState.mode) {
            case 'regex':
              try {
                const regex = new RegExp(query, searchState.caseSensitive ? 'g' : 'gi')
                return regex.test(searchTarget)
              } catch {
                return false
              }
            case 'exact':
              return searchTarget === query
            default:
              return searchTarget.includes(query)
          }
        })
      }

      // Apply file size filters
      if (searchState.minFileSize) {
        const parseFileSize = (sizeStr: string): number => {
          if (!sizeStr) return 0
          const num = parseFloat(sizeStr)
          const unit = sizeStr.toLowerCase().slice(-2)
          
          switch (unit) {
            case 'kb': return num * 1024
            case 'mb': return num * 1024 * 1024
            case 'gb': return num * 1024 * 1024 * 1024
            default: return num
          }
        }
        const minBytes = parseFileSize(searchState.minFileSize)
        filtered = filtered.filter((file: FileItem) => (file.size || 0) >= minBytes)
      }

      if (searchState.maxFileSize) {
        const parseFileSize = (sizeStr: string): number => {
          if (!sizeStr) return 0
          const num = parseFloat(sizeStr)
          const unit = sizeStr.toLowerCase().slice(-2)
          
          switch (unit) {
            case 'kb': return num * 1024
            case 'mb': return num * 1024 * 1024
            case 'gb': return num * 1024 * 1024 * 1024
            default: return num
          }
        }
        const maxBytes = parseFileSize(searchState.maxFileSize)
        filtered = filtered.filter((file: FileItem) => (file.size || 0) <= maxBytes)
      }

      // Apply extension filters
      if (searchState.selectedExtensions.length > 0) {
        filtered = filtered.filter((file: FileItem) => {
          if (file.type === 'dir') return true
          const ext = file.name.split('.').pop()?.toLowerCase()
          return ext && searchState.selectedExtensions.includes(ext)
        })
      }

      return filtered
    } else {
      // Use server-filtered results directly when not using advanced filters
      return filesData?.files || []
    }
  }, [
    searchState.useAdvancedFilters,
    searchState.query,
    searchState.mode,
    searchState.caseSensitive,
    searchState.searchInSummaries,
    searchState.minFileSize,
    searchState.maxFileSize,
    searchState.selectedExtensions,
    filesData
  ])

  // Use filesData?.stats for stats
  const stats = filesData?.stats
  const availableLanguages = stats?.languages?.map((lang: { name: string }) => lang.name).filter(Boolean) || []

  // Effect to automatically re-run advanced search when search query changes
  useEffect(() => {
    if (searchState.useAdvancedFilters && searchState.query !== searchState.query) {
      // Update the search state query to match the current search
      setSearchState(prev => ({ ...prev, query: searchState.query }))
      
      // Trigger a re-run of advanced search with the updated query
      // We'll need to call the advanced search function from the child component
      // For now, we can simulate this by temporarily disabling advanced filters
      // and letting the user re-apply them, or by re-running the logic here
    }
  }, [searchState.query, searchState.useAdvancedFilters, searchState.query])

  // Restore all handler callbacks for UI controls
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
  }
  const handleAdvancedSearch = () => {
    setSearchState(prev => ({ ...prev, useAdvancedFilters: true }))
  }
  const handleClearAdvancedSearch = () => {
    setSearchState(prev => ({
      ...prev,
      useAdvancedFilters: false,
      advancedFilteredFiles: [],
      mode: 'normal',
      caseSensitive: false,
      searchInSummaries: false,
      minFileSize: '',
      maxFileSize: '',
      selectedExtensions: []
    }))
  }
  const handleSearchModeChange = (mode: 'normal' | 'regex' | 'exact', caseSensitive: boolean, searchInContent: boolean) => {
    setSearchState(prev => ({
      ...prev,
      mode,
      caseSensitive,
      searchInSummaries: searchInContent
    }))
  }
  const handleFileFiltersChange = (filters: {
    minFileSize?: string,
    maxFileSize?: string,
    selectedExtensions?: string[]
  }) => {
    setSearchState(prev => ({ ...prev, ...filters }))
  }
  const handleFileClick = (file: FileItem) => {
    if (file.type === 'dir') {
      // Use refetchFiles with new path
      refetchFiles()
    } else {
      // Use React Query to fetch file content
      // selectedFile is still needed for query key
      setSelectedFile(file)
    }
  }

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Explorer</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">No repository selected</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                Select a Repository
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Choose a repository from the navigation above to explore files and folders in your codebase.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  // Wrap main return in a fragment to ensure a single parent
  return (
    <>
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 -z-50 animate-gradient-x"></div>
      
      <DashboardLayout>
        <div className="min-h-screen relative z-0">
          {/* Header */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 animate-in slide-in-from-top duration-700">
            <div className={`mx-auto px-8 py-[30px] transition-all duration-300 ${
              isCollapsed ? 'max-w-none' : 'max-w-7xl'
            } md:px-8 md:py-[30px] sm:px-4 sm:py-3`}>
              <div className="flex flex-row items-center justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
                <div className="flex items-center gap-6 max-sm:gap-3">
                  <div className="relative group">
                    {selectedRepository.owner?.avatar_url ? (
                      <Image
                        src={selectedRepository.owner.avatar_url}
                        alt={`${selectedRepository.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in max-sm:w-10 max-sm:h-10"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in max-sm:w-10 max-sm:h-10">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                  </div>
                  <div className="animate-in slide-in-from-left duration-700 delay-200">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-200 max-sm:text-lg">
                      {selectedRepository.name}
                    </h1>
                    {/* Only render AnimatedHeaderStats if stats is defined */}
                    {filesData?.stats && <AnimatedHeaderStats stats={filesData.stats} />}
                  </div>
                </div>
                <button
                  onClick={() => refetchFiles()}
                  className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 animate-in slide-in-from-right max-sm:w-full max-sm:justify-center max-sm:px-4 max-sm:py-2 max-sm:text-sm"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Refresh</span>
                </button>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className={`mx-auto p-8 transition-all duration-300 ${
            isCollapsed ? 'max-w-none' : 'max-w-7xl'
          }`}>  
            {/* Desktop/Tablet: Grid Layout (only for large screens and above) */}
            <div className="hidden lg:grid grid-cols-12 gap-6 auto-rows-max">
              {/* Search & Controls */}
              <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 hover:shadow-2xl transition-shadow duration-300">
                  <FileSearchAndFilters
                    searchQuery={searchState.query}
                    selectedLanguage={selectedLanguage}
                    availableLanguages={availableLanguages}
                    files={filesData?.files || []}
                    onSearchChange={query => setSearchState(prev => ({ ...prev, query }))}
                    onSearchClear={() => setSearchState(prev => ({ ...prev, query: '' }))}
                    onLanguageChange={handleLanguageChange}
                    onAdvancedFiltersApply={handleAdvancedSearch}
                    onAdvancedFiltersClear={handleClearAdvancedSearch}
                    onSearchModeChange={handleSearchModeChange}
                    onFileFiltersChange={handleFileFiltersChange}
                    searchMode={searchState.mode}
                    caseSensitive={searchState.caseSensitive}
                    searchInContent={searchState.searchInSummaries}
                    minFileSize={searchState.minFileSize}
                    maxFileSize={searchState.maxFileSize}
                    selectedExtensions={searchState.selectedExtensions}
                  />
                </div>
              </div>
              {/* File Explorer */}
              <div className="col-span-4 animate-in fade-in slide-in-from-left duration-600 delay-200">
                <div className="h-[110vh] bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">File Explorer</h2>
                      <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full transition-colors duration-200">
                        {filteredFiles.length} items
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <FileBrowser
                      files={filesData?.files || []}
                      filteredFiles={filteredFiles}
                      selectedFile={selectedFile}
                      isLoading={isFilesLoading}
                      currentPath={filesData?.currentPath || '/'}
                      onFileClick={handleFileClick}
                    />
                  </div>
                </div>
              </div>
              {/* File Content Viewer */}
              <div className="col-span-8 animate-in fade-in slide-in-from-right duration-600 delay-300">
                <div className="h-[110vh] bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      {selectedFile ? (
                        <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left duration-300">
                          {getFileIcon(selectedFile)}
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedFile.name}</h2>
                          <div className="ml-auto flex items-center gap-2">
                            {fileContentData?.content && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full animate-in fade-in duration-500 delay-100 hover:scale-105 transition-transform cursor-pointer">
                                {fileContentData.content.split('\n').length.toLocaleString()} lines
                              </span>
                            )}
                            {selectedFile.size && (
                              <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full animate-in fade-in duration-500 delay-200 hover:scale-105 transition-transform cursor-pointer">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full animate-in fade-in duration-500 delay-300 hover:scale-105 transition-transform cursor-pointer">
                              {selectedFile.language || 'Text'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <h2 className="text-lg font-semibold text-slate-500 dark:text-slate-400">Select a file to view</h2>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <FileContentViewer
                      selectedFile={selectedFile}
                      fileContent={fileContentData?.content}
                      isLoadingContent={isFileContentLoading}
                    />
                  </div>
                </div>
              </div>
              {/* Language Distribution */}
              {stats?.languages?.length > 0 && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                  <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Language Distribution</h2>
                      </div>
                    </div>
                    <div className="p-6 rounded-b-2xl">
                      <LanguageDistribution stats={stats} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Mobile/Tablet Portrait: File Explorer above File Viewer (visible up to md) */}
            <div className="flex flex-col gap-4 mt-0 lg:hidden">
              {/* Search Bar for mobile/tablet */}
              <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 mt-0 hover:shadow-2xl transition-shadow duration-300">
                <FileSearchAndFilters
                  searchQuery={searchState.query}
                  selectedLanguage={selectedLanguage}
                  availableLanguages={availableLanguages}
                  files={filesData?.files || []}
                  onSearchChange={query => setSearchState(prev => ({ ...prev, query }))}
                  onSearchClear={() => setSearchState(prev => ({ ...prev, query: '' }))}
                  onLanguageChange={handleLanguageChange}
                  onAdvancedFiltersApply={handleAdvancedSearch}
                  onAdvancedFiltersClear={handleClearAdvancedSearch}
                  onSearchModeChange={handleSearchModeChange}
                  onFileFiltersChange={handleFileFiltersChange}
                  searchMode={searchState.mode}
                  caseSensitive={searchState.caseSensitive}
                  searchInContent={searchState.searchInSummaries}
                  minFileSize={searchState.minFileSize}
                  maxFileSize={searchState.maxFileSize}
                  selectedExtensions={searchState.selectedExtensions}
                />
              </div>
              {/* File Explorer */}
              <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center animate-pulse">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">File Explorer</h2>
                    <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full transition-colors duration-200">
                      {filteredFiles.length} items
                    </div>
                  </div>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                  <FileBrowser
                    files={filesData?.files || []}
                    filteredFiles={filteredFiles}
                    selectedFile={selectedFile}
                    isLoading={isFilesLoading}
                    currentPath={filesData?.currentPath || '/'}
                    onFileClick={handleFileClick}
                  />
                </div>
              </div>
              {/* File Content Viewer */}
              <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 min-h-[40vh] max-h-[80vh]">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-row items-center gap-3 sm:flex-row sm:gap-3 xs:flex-col xs:items-start xs:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 xs:mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {selectedFile ? (
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate max-w-[60vw] sm:max-w-none">{selectedFile.name}</h2>
                    ) : (
                      <h2 className="text-base font-semibold text-slate-500 dark:text-slate-400">Select a file to view</h2>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="flex flex-wrap gap-1 sm:ml-auto xs:ml-0">
                      {fileContentData?.content && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full animate-in fade-in duration-500 delay-100 hover:scale-105 transition-transform cursor-pointer">
                          {fileContentData.content.split('\n').length.toLocaleString()} lines
                        </span>
                      )}
                      {selectedFile.size && (
                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full animate-in fade-in duration-500 delay-200 hover:scale-105 transition-transform cursor-pointer">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full animate-in fade-in duration-500 delay-300 hover:scale-105 transition-transform cursor-pointer">
                        {selectedFile.language || 'Text'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-h-[40vh] max-h-[80vh] overflow-y-auto px-1 sm:px-4">
                  <FileContentViewer
                    selectedFile={selectedFile}
                    fileContent={fileContentData?.content}
                    isLoadingContent={isFileContentLoading}
                  />
                </div>
              </div>
              {/* Language Distribution for mobile/tablet */}
              {stats?.languages?.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                  <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-3">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Language Distribution</h2>
                      </div>
                    </div>
                    <div className="p-4 rounded-b-2xl">
                      <LanguageDistribution stats={stats} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Error Display */}
            {error && (
              <div className="fixed bottom-8 left-8 right-8 max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-red-200 dark:border-red-800 rounded-2xl shadow-2xl">
                  <ErrorDisplay error={error} onRetry={refetchFiles} />
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
