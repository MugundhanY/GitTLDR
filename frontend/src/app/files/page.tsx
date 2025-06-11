'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
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
const AnimatedHeaderStats = ({ stats }: { stats: FileStats }) => {
  const filesCounter = useAnimatedCounter(stats.totalFiles, 1200, 100)
  const languagesCounter = useAnimatedCounter(stats.languages.length, 800, 300)

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
      <span className="flex items-center gap-2 transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 cursor-pointer">
        <div className={`w-2 h-2 bg-blue-500 rounded-full transition-all duration-500 ${
          filesCounter.isVisible ? 'animate-pulse scale-100' : 'scale-0'
        }`} style={{ transitionDelay: '200ms' }}></div>
        <span className={`transition-all duration-500 ${
          filesCounter.isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`} style={{ transitionDelay: '200ms' }}>
          {formatFileSize(stats.totalSize)}
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
  const [files, setFiles] = useState<FileItem[]>([])
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalSize: 0,
    totalDirectories: 0,
    languages: []
  })
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)  
  
  const [advancedFilteredFiles, setAdvancedFilteredFiles] = useState<FileItem[]>([])
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(false)
  
  // Performance optimizations
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Optimized fetchFiles with request cancellation
  const fetchFiles = useCallback(async (path: string, searchTerm = '', language = 'all') => {
    if (!selectedRepository) return
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        path,
        ...(searchTerm && { search: searchTerm }),
        ...(language !== 'all' && { language })
      })
      
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files?${params}`, {
        signal: controller.signal
      })
      
      // Check if request was cancelled
      if (controller.signal.aborted) {
        return
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Only update state if this is still the current request
      if (!controller.signal.aborted) {
        setFiles(data.files || [])
        setStats(data.stats || { totalFiles: 0, totalSize: 0, totalDirectories: 0, languages: [] })
        setBreadcrumbs(data.breadcrumbs || [])
        setCurrentPath(data.currentPath || '/')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      
      console.error('Error fetching files:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch files')
      setFiles([])
      setStats({ totalFiles: 0, totalSize: 0, totalDirectories: 0, languages: [] })
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [selectedRepository])

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
  }, [])  // Initial load
  useEffect(() => {
    if (selectedRepository) {
      fetchFiles(currentPath, searchQuery, selectedLanguage)
    }
  }, [selectedRepository, currentPath, fetchFiles])

  // Optimized file content fetching
  const fetchFileContent = useCallback(async (file: FileItem) => {
    if (!selectedRepository) return
    
    setIsLoadingContent(true)
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files/${file.id}/content`)
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        setFileContent(null)
      } else {
        setFileContent(data.content)
        if (data.file) {
          setSelectedFile(prev => prev ? { ...prev, ...data.file } : data.file)
        }
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContent(null)
    } finally {
      setIsLoadingContent(false)
    }
  }, [selectedRepository])

  // Optimized search handler with proper debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchFiles(currentPath, value, selectedLanguage)
    }, 300)
  }, [currentPath, selectedLanguage, fetchFiles])

  // Immediate search clear handler
  const handleSearchClear = useCallback(() => {
    setSearchQuery('')
    
    // Clear timeout and cancel any pending requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Immediately fetch without search
    fetchFiles(currentPath, '', selectedLanguage)
  }, [currentPath, selectedLanguage, fetchFiles])  // Language filter handler
  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language)
    fetchFiles(currentPath, searchQuery, language)
  }, [currentPath, searchQuery, fetchFiles])

  // File click handler
  const handleFileClick = useCallback((file: FileItem) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path)
      setSelectedFile(null)
      setFileContent(null)
    } else {
      setSelectedFile(file)
      fetchFileContent(file)
    }
  }, [fetchFileContent])

  // Breadcrumb click handler
  const handleBreadcrumbClick = useCallback((path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
    setFileContent(null)
  }, [])
  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchFiles(currentPath, searchQuery, selectedLanguage)
  }, [currentPath, searchQuery, selectedLanguage, fetchFiles])

  // Advanced search handler
  const handleAdvancedSearch = useCallback((filteredFiles: FileItem[]) => {
    setAdvancedFilteredFiles(filteredFiles)
    setUseAdvancedFilters(true)
  }, [])
  // Clear advanced search handler
  const handleClearAdvancedSearch = useCallback(() => {
    setUseAdvancedFilters(false)
    setAdvancedFilteredFiles([])
  }, [])
  // Client-side filtering for better performance
  const filteredFiles = useAdvancedFilters 
    ? advancedFilteredFiles 
    : files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLanguage = selectedLanguage === 'all' || file.language === selectedLanguage
        return matchesSearch && matchesLanguage
      })

  const availableLanguages = stats.languages.map(lang => lang.name).filter(Boolean)

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
  return (
    <>
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 -z-50 animate-gradient-x"></div>
      
      <DashboardLayout>
        <div className="min-h-screen relative z-0">
          {/* Header */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 animate-in slide-in-from-top duration-700">
            <div className="max-w-7xl mx-auto px-8 py-6">
              <div className="flex items-center justify-between">                <div className="flex items-center gap-6">
                  <div className="relative group">
                    {selectedRepository.owner?.avatar_url ? (
                      <Image
                        src={selectedRepository.owner.avatar_url}
                        alt={`${selectedRepository.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in duration-500"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl animate-in zoom-in duration-500">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                  </div>
                    <div className="animate-in slide-in-from-left duration-700 delay-200">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-200">
                      {selectedRepository.name}
                    </h1>
                    <AnimatedHeaderStats stats={stats} />
                  </div>
                </div>
                  <button
                  onClick={handleRefresh}
                  className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 animate-in slide-in-from-right duration-700 delay-300"
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
          <div className="max-w-7xl mx-auto p-8">            <div className="grid grid-cols-12 gap-6 auto-rows-max">              {/* Search & Controls */}
              <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 hover:shadow-2xl transition-shadow duration-300">                  <FileSearchAndFilters
                    searchQuery={searchQuery}
                    selectedLanguage={selectedLanguage}
                    availableLanguages={availableLanguages}
                    files={files}
                    onSearchChange={handleSearchChange}
                    onSearchClear={handleSearchClear}
                    onLanguageChange={handleLanguageChange}
                    onAdvancedFiltersApply={handleAdvancedSearch}
                    onAdvancedFiltersClear={handleClearAdvancedSearch}
                  />
                </div>
              </div>              {/* File Explorer */}
              <div className="col-span-4 animate-in fade-in slide-in-from-left duration-600 delay-200">
                <div className="h-[110vh] bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
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
                  <div className="h-[calc(100%-4rem)]">
                    <FileBrowser
                      files={files}
                      filteredFiles={filteredFiles}
                      selectedFile={selectedFile}
                      isLoading={isLoading}
                      currentPath={currentPath}
                      onFileClick={handleFileClick}
                    />
                  </div>
                </div>
              </div>              {/* File Content Viewer */}
              <div className="col-span-8 animate-in fade-in slide-in-from-right duration-600 delay-300">
                <div className="h-[110vh] bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
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
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedFile.name}</h2>                          <div className="ml-auto flex items-center gap-2">
                            {fileContent && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full animate-in fade-in duration-500 delay-100 hover:scale-105 transition-transform cursor-pointer">
                                {fileContent.split('\n').length.toLocaleString()} lines
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
                  <div className="h-[calc(100%-4rem)]">
                    <FileContentViewer
                      selectedFile={selectedFile}
                      fileContent={fileContent}
                      isLoadingContent={isLoadingContent}
                    />
                  </div>
                </div>
              </div>              {/* Language Distribution */}
              {stats.languages.length > 0 && (
                <div className="col-span-12 animate-in fade-in slide-in-from-bottom duration-700 delay-400">
                  <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Language Distribution</h2>
                      </div>
                    </div>
                    <div className="p-6">
                      <LanguageDistribution stats={stats} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>          {/* Error Display */}
          {error && (
            <div className="fixed bottom-8 left-8 right-8 max-w-md mx-auto z-50 animate-in slide-in-from-bottom duration-300">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-red-200 dark:border-red-800 rounded-2xl shadow-2xl">
                <ErrorDisplay error={error} onRetry={handleRefresh} />
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}
