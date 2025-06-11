'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const fetchFiles = useCallback(async (path: string) => {
    if (!selectedRepository) return
    
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        path,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedLanguage !== 'all' && { language: selectedLanguage })
      })
      
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
        const data = await response.json()
      console.log('Files API response:', { 
        files: data.files?.length || 0, 
        stats: data.stats,
        repository: data.repository 
      })
      
      // Debug: Log first few file paths to understand the structure
      if (data.files && data.files.length > 0) {
        console.log('Sample file paths:', data.files.slice(0, 10).map((f: any) => ({
          name: f.name,
          path: f.path,
          type: f.type
        })))
      }
      
      setFiles(data.files || [])
      setStats(data.stats || { totalFiles: 0, totalSize: 0, totalDirectories: 0, languages: [] })
      setBreadcrumbs(data.breadcrumbs || [])
      setCurrentPath(data.currentPath || '/')
    } catch (error) {
      console.error('Error fetching files:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch files')
      setFiles([])
      setStats({ totalFiles: 0, totalSize: 0, totalDirectories: 0, languages: [] })
    } finally {
      setIsLoading(false)
    }
  }, [selectedRepository, searchQuery, selectedLanguage])

  useEffect(() => {
    if (selectedRepository) {
      fetchFiles(currentPath)
      
      // If no files found, set up periodic refresh to check for processing completion
      const checkForFiles = () => {
        if (files.length === 0 && !isLoading) {
          console.log('No files found, checking again in 5 seconds...')
          setTimeout(() => {
            fetchFiles(currentPath)
          }, 5000)
        }
      }
      
      // Initial check
      setTimeout(checkForFiles, 1000)
    }
  }, [selectedRepository, currentPath, fetchFiles])
  const fetchFileContent = async (file: FileItem) => {
    if (!selectedRepository) return
    
    console.log('Fetching content for file:', { 
      id: file.id, 
      name: file.name, 
      hasContent: file.hasContent,
      type: file.type 
    })
    
    setIsLoadingContent(true)
    try {
      const response = await fetch(`/api/repositories/${selectedRepository.id}/files/${file.id}/content`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('File content API error:', response.status, errorText)
        throw new Error(`Failed to fetch file content: ${response.status}`)
      }      const data = await response.json()
      console.log('File content API response:', { 
        hasContent: !!data.content, 
        contentLength: data.content?.length || 0,
        downloadUrl: data.file?.downloadUrl,
        summary: data.file?.summary,
        error: data.error,
        message: data.message
      })
      
      if (data.error) {
        console.warn('File content error:', data.error, data.message)
        setFileContent(null)
      } else {
        setFileContent(data.content)
        // Update the selected file with the complete data from API (including summary)
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
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path)
      setSelectedFile(null)
      setFileContent(null)
    } else {
      setSelectedFile(file)
      fetchFileContent(file)
    }
  }
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchFiles(currentPath)
    }, 300)
    
    setSearchTimeout(timeout)
  }, [searchTimeout, fetchFiles, currentPath])
  
  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language)
    fetchFiles(currentPath)
  }, [fetchFiles, currentPath])

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
    setFileContent(null)
  }

  const handleRefresh = () => {
    fetchFiles(currentPath)
  }
  const handleRetry = () => {
    fetchFiles(currentPath)
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLanguage = selectedLanguage === 'all' || file.language === selectedLanguage
    return matchesSearch && matchesLanguage
  })

  const availableLanguages = stats.languages.map(lang => lang.name).filter(Boolean)

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          {/* Empty state header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-medium text-slate-900 dark:text-white">Explorer</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">No repository selected</p>
              </div>
            </div>
          </div>

          {/* Empty state content */}
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
  }  return (
    <>
      {/* Full-screen gradient background */}
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 -z-50"></div>
      
      <DashboardLayout>        <div className="min-h-screen relative z-0">
        {/* Modern Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">                <div className="relative">
                  {selectedRepository.owner?.avatar_url ? (
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-2xl blur opacity-20"></div>
                      <Image
                        src={selectedRepository.owner.avatar_url}
                        alt={`${selectedRepository.name} avatar`}
                        width={48}
                        height={48}
                        className="relative w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-white/20"
                        onError={(e) => {
                          // Fallback to gradient icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur opacity-20"></div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {selectedRepository.name}
                  </h1>
                  <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {stats.totalFiles.toLocaleString()} files
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {formatFileSize(stats.totalSize)}
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      {stats.languages.length} languages
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleRefresh}
                className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium text-slate-700 dark:text-slate-300">Refresh</span>
              </button>
            </div>
          </div>
        </div>        {/* Bento Grid Layout */}
        <div className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">            {/* Search & Controls - Top Full Width */}
            <div className="col-span-12 row-span-1">
              <div className="h-full bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-4">
                <FileSearchAndFilters
                  searchQuery={searchQuery}
                  selectedLanguage={selectedLanguage}
                  availableLanguages={availableLanguages}
                  breadcrumbs={breadcrumbs}
                  onSearchChange={handleSearchChange}
                  onLanguageChange={handleLanguageChange}
                  onRefresh={handleRefresh}
                  onBreadcrumbClick={handleBreadcrumbClick}
                />
              </div>
            </div>            {/* File Explorer - Left Side */}
            <div className="col-span-5 row-span-2">
              <div className="h-full bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">File Explorer</h2>
                    <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">
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
            </div>            {/* File Content Viewer - Right Side */}
            <div className="col-span-7 row-span-2">
              <div className="h-full bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {selectedFile ? (
                      <div className="flex items-center gap-2 flex-1">
                        {getFileIcon(selectedFile)}
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedFile.name}</h2>
                        <div className="ml-auto">
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
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
            </div>            {/* Language Distribution - Bottom */}
            {stats.languages.length > 0 && (
              <div className="col-span-12">
                <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Language Distribution</h2>
                  </div>
                  <LanguageDistribution stats={stats} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Error Display */}
        {error && (
          <div className="fixed bottom-8 left-8 right-8 max-w-md mx-auto z-50">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-red-200 dark:border-red-800 rounded-2xl shadow-2xl">
              <ErrorDisplay error={error} onRetry={handleRetry} />
            </div>
          </div>        )}
        </div>
      </DashboardLayout>
    </>
  )
}
