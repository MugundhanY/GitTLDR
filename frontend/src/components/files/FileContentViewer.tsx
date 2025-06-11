'use client'

import { FileItem } from './types'
import { getLanguageForHighlighter } from './FileIconUtils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { toast } from 'react-toastify'
import QuickActions from './QuickActions'

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Progress loader component with file size-based animation
const FileLoadingProgress = ({ selectedFile }: { selectedFile: FileItem }) => {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    // Calculate loading duration based on file size
    const fileSize = selectedFile.size || 1000 // Default to 1KB if size not available
    const baseDuration = 800 // Base duration in ms
    const sizeFactor = Math.min(fileSize / (100 * 1024), 3) // Scale factor based on file size
    const totalDuration = baseDuration + (sizeFactor * 300)
    
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progressValue = Math.min((elapsed / totalDuration) * 100, 100)
      const easeOutProgress = 100 * (1 - Math.pow(1 - progressValue / 100, 3))
      
      setProgress(easeOutProgress)
      
      if (progressValue < 100) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [selectedFile.size])
  
  return (
    <div className="h-full bg-white dark:bg-slate-900 flex items-center justify-center animate-in fade-in duration-500">
      <div className="text-center">
        {/* Progress Circle */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
              className="text-emerald-500 transition-all duration-200 ease-out"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* File Name */}
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 animate-in slide-in-from-bottom duration-500 delay-200">
          Loading {selectedFile.name}
        </h3>
        
        {/* Simple message */}
        <p className="text-slate-600 dark:text-slate-400 text-sm animate-in slide-in-from-bottom duration-500 delay-300">
          Reading file content...
        </p>
      </div>
    </div>
  )
}

interface FileContentViewerProps {
  selectedFile: FileItem | null
  fileContent: string | null
  isLoadingContent: boolean
}

export default function FileContentViewer({
  selectedFile,
  fileContent,
  isLoadingContent
}: FileContentViewerProps) {
  const [viewMode, setViewMode] = useState<'split-horizontal' | 'split-vertical' | 'code' | 'summary'>('split-horizontal')
  const { actualTheme } = useTheme()
  const isDarkMode = actualTheme === 'dark'  // Copy content to clipboard
  const handleCopyContent = async () => {
    if (!fileContent) return
    
    try {
      await navigator.clipboard.writeText(fileContent)
      toast.success('Code copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy content:', err)
      toast.error('Failed to copy code')
    }
  }  // Copy AI summary to clipboard
  const handleCopySummary = async () => {
    if (!selectedFile?.summary) return
    
    try {
      await navigator.clipboard.writeText(selectedFile.summary)
      toast.success('AI summary copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy AI summary:', err)
      toast.error('Failed to copy AI summary')
    }
  }
  // Download AI summary
  const handleDownloadSummary = () => {
    if (!selectedFile?.summary || !selectedFile) return
    
    try {
      const blob = new Blob([selectedFile.summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedFile.name}_summary.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`AI summary for "${selectedFile.name}" downloaded successfully!`)
    } catch (err) {
      console.error('Failed to download AI summary:', err)
      toast.error('Failed to download AI summary')
    }
  }  // Download file content
  const handleDownloadContent = () => {
    if (!fileContent || !selectedFile) return
    
    try {
      const blob = new Blob([fileContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = selectedFile.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`File "${selectedFile.name}" downloaded successfully!`)
    } catch (err) {
      console.error('Failed to download file:', err)
      toast.error('Failed to download file')
    }
  }
  if (!selectedFile) {
    return (
      <div className="h-full bg-white dark:bg-slate-900 flex items-center justify-center animate-in fade-in duration-500">
        <div className="text-center max-w-sm animate-in slide-in-from-bottom duration-700 delay-200">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center animate-in zoom-in duration-500 delay-300">
            <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 animate-in slide-in-from-bottom duration-500 delay-400">
            No File Selected
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed animate-in slide-in-from-bottom duration-500 delay-500">
            Select a file from the explorer to view its content and AI-powered insights
          </p>
        </div>
      </div>
    )
  }  if (isLoadingContent) {
    return <FileLoadingProgress selectedFile={selectedFile} />
  }

  const language = getLanguageForHighlighter(selectedFile.language || 'text')
  const hasContent = fileContent && fileContent.trim().length > 0

  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col">      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 p-4 border-b border-slate-200 dark:border-slate-700">        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('split-horizontal')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'split-horizontal' || viewMode === 'split-vertical'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Split
            </div>
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'code'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code
            </div>
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'summary'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI
            </div>
          </button>
        </div>        {/* Split View Options */}
        {(viewMode === 'split-horizontal' || viewMode === 'split-vertical') && (
          <div className="flex items-center gap-1 ml-3">
            <div className="flex bg-slate-50 dark:bg-slate-700 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('split-horizontal')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'split-horizontal'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Horizontal Split"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="8" height="18" rx="1" strokeWidth={2}/>
                  <rect x="13" y="3" width="8" height="18" rx="1" strokeWidth={2}/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('split-vertical')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'split-vertical'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Vertical Split"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="8" rx="1" strokeWidth={2}/>
                  <rect x="3" y="13" width="18" height="8" rx="1" strokeWidth={2}/>
                </svg>
              </button>
            </div>
          </div>        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {!hasContent ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Content Not Available
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                This file might be empty, binary, or too large to display. 
                {selectedFile.size && selectedFile.size > 1000000 && 
                  ' Large files are not shown for performance reasons.'
                }
              </p>
            </div>
          </div>        ) : viewMode === 'split-horizontal' ? (
          <div className="h-full flex">
            {/* Code Panel */}
            <div className="flex-1 min-w-0 border-r border-slate-200 dark:border-slate-700 flex flex-col">
              {/* Code Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Source Code
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopyContent}
                    disabled={!fileContent}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy code to clipboard"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={handleDownloadContent}
                    disabled={!fileContent}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download file"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  <QuickActions
                    selectedFile={selectedFile}
                    fileContent={fileContent}
                    onDownloadFile={handleDownloadContent}
                    onCopyContent={handleCopyContent}
                    onCopySummary={handleCopySummary}
                    onDownloadSummary={handleDownloadSummary}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto"><SyntaxHighlighter
                  language={language}
                  style={isDarkMode ? vscDarkPlus : prism}
                  showLineNumbers={true}
                  wrapLines={true}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                  lineNumberStyle={{
                    minWidth: fileContent && fileContent.split('\n').length > 999 ? '4em' : '3em',
                    paddingRight: '1em',
                    color: isDarkMode ? '#64748b' : '#94a3b8',
                    fontSize: '12px',
                    userSelect: 'none'
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              </div>
            </div>            {/* AI Summary Panel */}
            <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Summary
                  </h3>
                  {selectedFile?.summary && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleCopySummary}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Copy AI summary"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button 
                        onClick={handleDownloadSummary}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Download AI summary"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div><div className="flex-1 p-4 overflow-auto">
                {selectedFile?.summary ? (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                      {selectedFile.summary}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Summary Coming Soon</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      This file hasn't been analyzed yet. AI summary will appear here once processing is complete.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>        ) : viewMode === 'split-vertical' ? (
          <div className="h-full flex flex-col">
            {/* Code Panel */}
            <div className="flex-1 border-b border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
              {/* Code Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Source Code
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopyContent}
                    disabled={!fileContent}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy code to clipboard"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={handleDownloadContent}
                    disabled={!fileContent}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download file"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto"><SyntaxHighlighter
                  language={language}
                  style={isDarkMode ? vscDarkPlus : prism}
                  showLineNumbers={true}
                  wrapLines={true}                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    height: '100%'
                  }}
                  lineNumberStyle={{
                    minWidth: fileContent && fileContent.split('\n').length > 999 ? '4em' : '3em',
                    paddingRight: '1em',
                    color: isDarkMode ? '#64748b' : '#94a3b8',
                    fontSize: '12px',                    userSelect: 'none'
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              </div>
            </div>              {/* AI Summary Panel */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-800 flex flex-col min-h-[200px] max-h-[400px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between">                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Summary
                  </h3>
                  {selectedFile?.summary && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleCopySummary}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Copy AI summary"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      <button 
                        onClick={handleDownloadSummary}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Download AI summary"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="h-full">
                  {selectedFile?.summary ? (
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                        {selectedFile.summary}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1 text-sm">AI Summary Pending</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Summary will appear here once complete.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>        ) : viewMode === 'code' ? (
          <div className="h-full flex flex-col">
            {/* Code Header with Actions */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Source Code
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyContent}
                  disabled={!fileContent}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy code to clipboard"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                
                <button 
                  onClick={handleDownloadContent}
                  disabled={!fileContent}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                <QuickActions
                  selectedFile={selectedFile}
                  fileContent={fileContent}
                  onDownloadFile={handleDownloadContent}
                  onCopyContent={handleCopyContent}
                  onCopySummary={handleCopySummary}
                  onDownloadSummary={handleDownloadSummary}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto"><SyntaxHighlighter
              language={language}
              style={isDarkMode ? vscDarkPlus : prism}
              showLineNumbers={true}
              wrapLines={true}              customStyle={{
                margin: 0,
                padding: '1.5rem',
                background: 'transparent',
                fontSize: '14px',                lineHeight: '1.6',
                height: '100%'
              }}
              lineNumberStyle={{
                minWidth: fileContent && fileContent.split('\n').length > 999 ? '4em' : '3em',
                paddingRight: '1em',
                color: isDarkMode ? '#64748b' : '#94a3b8',
                fontSize: '12px',
                userSelect: 'none'
              }}
            >
              {fileContent}
            </SyntaxHighlighter>
            </div>
          </div>) : (          <div className="h-full overflow-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Summary
                </h3>
                {selectedFile?.summary && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopySummary}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Copy AI summary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleDownloadSummary}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Download AI summary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8">
                {selectedFile?.summary ? (
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-base leading-relaxed">
                        {selectedFile.summary}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">AI Analysis Pending</h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                      This file is still being processed. AI-powered analysis and summary will appear here once complete.
                    </p>
                  </div>                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
