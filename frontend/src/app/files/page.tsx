'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useRepository } from '@/contexts/RepositoryContext'

interface FileItem {
  name: string
  type: 'file' | 'dir'
  path: string
  size?: number
  lastModified?: string
  language?: string
}

export default function FilesPage() {
  const { selectedRepository } = useRepository()
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('all')

  useEffect(() => {
    fetchFiles(currentPath)
  }, [selectedRepository, currentPath])

  const fetchFiles = async (path: string) => {
    setIsLoading(true)
    try {
      // Mock data for demonstration - replace with actual API call
      const mockFiles: FileItem[] = [
        {
          name: 'src',
          type: 'dir',
          path: '/src',
          lastModified: '2024-01-15T10:30:00Z'
        },
        {
          name: 'components',
          type: 'dir',
          path: '/src/components',
          lastModified: '2024-01-14T15:20:00Z'
        },
        {
          name: 'utils',
          type: 'dir',
          path: '/src/utils',
          lastModified: '2024-01-13T09:45:00Z'
        },
        {
          name: 'package.json',
          type: 'file',
          path: '/package.json',
          size: 1245,
          language: 'json',
          lastModified: '2024-01-16T11:00:00Z'
        },
        {
          name: 'README.md',
          type: 'file',
          path: '/README.md',
          size: 3420,
          language: 'markdown',
          lastModified: '2024-01-15T14:30:00Z'
        },
        {
          name: 'index.tsx',
          type: 'file',
          path: '/src/index.tsx',
          size: 2156,
          language: 'typescript',
          lastModified: '2024-01-14T16:45:00Z'
        },
        {
          name: 'App.tsx',
          type: 'file',
          path: '/src/App.tsx',
          size: 4567,
          language: 'typescript',
          lastModified: '2024-01-13T12:20:00Z'
        },
        {
          name: '.gitignore',
          type: 'file',
          path: '/.gitignore',
          size: 234,
          lastModified: '2024-01-12T08:15:00Z'
        }
      ]
      
      setFiles(selectedRepository ? mockFiles : [])
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'dir') {
      return (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'md':
      case 'mdx':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'json':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLanguage = selectedLanguage === 'all' || file.language === selectedLanguage
    return matchesSearch && matchesLanguage
  })

  const languages = Array.from(new Set(files.map(f => f.language).filter(Boolean)))

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Select a Repository</h3>
          <p className="text-gray-400">Choose a repository from the dropdown above to browse files.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Repository Header */}
        <div className="border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Files</h1>
              <p className="text-gray-400">{selectedRepository.full_name}</p>
            </div>
          </div>
          <p className="text-gray-300">
            Browse and explore the files in your repository. Use the search and filter options to find what you need.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <button
            onClick={() => setCurrentPath('/')}
            className="hover:text-white transition-colors"
          >
            {selectedRepository.name}
          </button>
          {currentPath !== '/' && (
            <>
              <span>/</span>
              <span className="text-white">{currentPath.slice(1)}</span>
            </>
          )}
        </div>

        {/* Files List */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-400">Loading files...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No files found</h4>
              <p className="text-gray-400">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredFiles.map((file) => (
                <div key={file.path} className="flex items-center justify-between p-4 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div>
                      <button
                        onClick={() => file.type === 'dir' && setCurrentPath(file.path)}
                        className="text-white hover:text-blue-400 transition-colors font-medium"
                      >
                        {file.name}
                      </button>
                      {file.language && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                            {file.language}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    {file.size && (
                      <span>{formatFileSize(file.size)}</span>
                    )}
                    <span>{formatDate(file.lastModified)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-300 font-medium">Total Files</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {files.filter(f => f.type === 'file').length}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-gray-300 font-medium">Directories</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {files.filter(f => f.type === 'dir').length}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-gray-300 font-medium">Languages</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {languages.length}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
