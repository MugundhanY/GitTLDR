'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'
import {
  FileHeader,
  FileSearchAndFilters,
  FileStatistics,
  FileBrowser,
  FileContentViewer,
  LanguageDistribution,
  ErrorDisplay,
  formatFileSize,
  FileItem,
  FileStats,
  RepositoryInfo,
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
        error: data.error,
        message: data.message
      })
      
      if (data.error) {
        console.warn('File content error:', data.error, data.message)
        setFileContent(null)
      } else {
        setFileContent(data.content)
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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Select a Repository</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Choose a repository from the dropdown above to explore its file structure and browse content.
              </p>
              <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl max-w-md mx-auto">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Tip</span>
                </div>
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                  Use the repository selector in the top navigation to choose a repository and start exploring its files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <FileHeader selectedRepository={selectedRepository} />

        {/* Search and Filters */}
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

        {/* Error Display */}
        {error && (
          <ErrorDisplay error={error} onRetry={handleRetry} />
        )}

        {/* Statistics */}
        <FileStatistics stats={stats} formatFileSize={formatFileSize} />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* File Browser */}
          <div className="xl:col-span-1">
            <FileBrowser
              files={files}
              filteredFiles={filteredFiles}
              selectedFile={selectedFile}
              isLoading={isLoading}
              currentPath={currentPath}
              onFileClick={handleFileClick}
            />
          </div>

          {/* File Content Viewer */}
          <div className="xl:col-span-2">
            <FileContentViewer
              selectedFile={selectedFile}
              fileContent={fileContent}
              isLoadingContent={isLoadingContent}
            />
          </div>
        </div>

        {/* Language Distribution */}
        <LanguageDistribution stats={stats} />
      </div>
    </DashboardLayout>
  )
}
