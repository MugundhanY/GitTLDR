'use client'

import { FileItem } from './types'
import { getLanguageForHighlighter } from './FileIconUtils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

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
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'summary'>('split')
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('vertical')
  const { actualTheme } = useTheme()
  const isDarkMode = actualTheme === 'dark'

  if (!selectedFile) {
    return (
      <div className="h-full bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
            No File Selected
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Select a file from the explorer to view its content and AI-powered insights
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingContent) {
    return (
      <div className="h-full bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Loading {selectedFile.name}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Reading file content...
          </p>
        </div>
      </div>
    )
  }

  const language = getLanguageForHighlighter(selectedFile.language || 'text')
  const hasContent = fileContent && fileContent.trim().length > 0

  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col">      {/* View Mode Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('split')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Split View
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
              Source Code
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
              AI Summary
            </div>
          </button>
        </div>

        {/* Split Orientation Controls - Only show when in split mode */}
        {viewMode === 'split' && (
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setSplitOrientation('vertical')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                splitOrientation === 'vertical'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Vertical Split"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => setSplitOrientation('horizontal')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                splitOrientation === 'horizontal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Horizontal Split"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9V5a2 2 0 012-2h6a2 2 0 012 2v4m-9 0h10M7 9v10a2 2 0 002 2h6a2 2 0 002-2V9" />
              </svg>
            </button>
          </div>
        )}
        
        {/* File Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {fileContent ? `${fileContent.split('\n').length} lines` : 'No content'}
          </span>
          
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
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
          </div>
        ) : viewMode === 'split' ? (
          <div className="h-full flex">
            {/* Code Panel */}
            <div className="flex-1 border-r border-slate-200 dark:border-slate-700">
              <div className="h-full overflow-auto">                <SyntaxHighlighter
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
                    minWidth: '3em',
                    paddingRight: '1em',
                    color: isDarkMode ? '#64748b' : '#94a3b8',
                    fontSize: '12px'
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              </div>
            </div>
            
            {/* AI Summary Panel */}
            <div className="w-80 bg-slate-50 dark:bg-slate-800 flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Insights
                </h3>
              </div>              <div className="flex-1 p-4 overflow-auto">
                {selectedFile?.summary ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        AI Summary
                      </h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-wrap">
                        {selectedFile.summary}
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          File Type
                        </h4>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          {selectedFile.language || 'Unknown'} • {fileContent ? `${fileContent.split('\n').length} lines` : 'No content'}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                          <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Quick Info
                        </h4>
                        <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                          <div>Size: {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown'}</div>
                          <div>Path: <span className="font-mono text-xs">{selectedFile.path}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Analysis Coming Soon</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        This file hasn't been analyzed yet. AI summaries will appear here once processing is complete.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">File Info</h4>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          <div>Type: {selectedFile?.language || 'Unknown'}</div>
                          <div>Lines: {fileContent ? fileContent.split('\n').length : 'Unknown'}</div>
                          <div>Size: {selectedFile?.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'code' ? (
          <div className="h-full overflow-auto">            <SyntaxHighlighter
              language={language}
              style={isDarkMode ? vscDarkPlus : prism}
              showLineNumbers={true}
              wrapLines={true}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                background: 'transparent',
                fontSize: '14px',
                lineHeight: '1.6',
                height: '100%'
              }}
              lineNumberStyle={{
                minWidth: '3em',
                paddingRight: '1em',
                color: isDarkMode ? '#64748b' : '#94a3b8',
                fontSize: '12px'
              }}
            >
              {fileContent}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="h-full p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  AI-Powered Analysis
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Comprehensive insights for {selectedFile.name}
                </p>
              </div>
              
              <div className="grid gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">File Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Type:</span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white">{selectedFile.language || 'Unknown'}</span>
                    </div>                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Lines:</span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white">{fileContent ? fileContent.split('\n').length : 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Size:</span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white">{fileContent ? `${(fileContent.length / 1024).toFixed(1)} KB` : (selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Path:</span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white text-xs">{selectedFile.path}</span>
                    </div>
                  </div>
                </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Summary
                  </h3>
                  {selectedFile?.summary ? (
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {selectedFile.summary}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Analysis Pending</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        This file is still being processed. AI-powered analysis and summary will appear here once complete.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
