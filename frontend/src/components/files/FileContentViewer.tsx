'use client'

import { FileItem } from './types'
import { getLanguageForHighlighter } from './FileIconUtils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'

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
  const [isFlipped, setIsFlipped] = useState(false)
  
  if (!selectedFile) {
    return (
      <div className="relative h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full">            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-emerald-200 to-blue-200 dark:from-emerald-800 dark:to-blue-800 animate-pulse"
                style={{
                  width: Math.random() * 100 + 20 + 'px',
                  height: Math.random() * 100 + 20 + 'px',
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 5 + 's',
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
              Choose Your Adventure
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Select a file from the explorer to unlock its secrets and discover what lies within...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingContent) {
    return (
      <div className="relative h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Custom loading animation */}
            <div className="relative mb-8">
              <div className="w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Decoding {selectedFile.name}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Analyzing file structure and content...
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasContent = !!fileContent
  const hasSummary = !!selectedFile.summary

  return (
    <div className="space-y-4">
      {/* Unique Control Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-slate-800 dark:via-purple-800 dark:to-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasContent ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-white text-sm font-medium">
                {selectedFile.name}
              </span>
            </div>
            {selectedFile.language && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30">
                {selectedFile.language}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-600">
              {[
                { mode: 'split', icon: '⚡', label: 'Split View' },
                { mode: 'code', icon: '🔧', label: 'Raw Code' },
                { mode: 'summary', icon: '🧠', label: 'AI Summary' }
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={label}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Flip Button for Split View */}
            {viewMode === 'split' && (
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition-all duration-200"
              >
                🔄 Flip
              </button>
            )}

            {selectedFile?.downloadUrl && (
              <a
                href={selectedFile.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                📥 Download
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-[600px] overflow-hidden">
        {viewMode === 'split' ? (
          // Split View - Side by Side or Flipped
          <div className={`h-full flex ${isFlipped ? 'flex-col' : 'flex-row'} gap-4`}>
            {/* Code Panel */}
            <div className={`${isFlipped ? 'h-1/2' : 'w-1/2'} flex flex-col`}>
              <div className="bg-slate-800 text-white px-4 py-2 rounded-t-xl flex items-center gap-2 border-b border-slate-600">
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm font-mono">source_code.{selectedFile.language}</span>
              </div>
              <div className="flex-1 bg-slate-900 rounded-b-xl overflow-hidden">
                {hasContent ? (
                  selectedFile.language && ['javascript', 'typescript', 'python', 'java', 'css', 'html', 'json', 'xml', 'yaml', 'markdown'].includes(selectedFile.language.toLowerCase()) ? (
                    <SyntaxHighlighter
                      language={getLanguageForHighlighter(selectedFile.language)}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        height: '100%',
                        fontSize: '13px',
                        lineHeight: '1.4',
                      }}
                      showLineNumbers
                      wrapLines
                    >
                      {fileContent}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="p-4 h-full overflow-auto">
                      <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {fileContent}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-400">
                      <div className="w-12 h-12 mx-auto mb-3 opacity-50">
                        📄
                      </div>
                      <p className="text-sm">No content available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary Panel */}
            <div className={`${isFlipped ? 'h-1/2' : 'w-1/2'} flex flex-col`}>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-t-xl flex items-center gap-2">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  🧠
                </div>
                <span className="text-sm font-medium">AI Analysis</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs opacity-75">Live</span>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-b-xl overflow-hidden">
                {hasSummary ? (
                  <div className="p-4 h-full overflow-auto">
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                        <pre className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                          {selectedFile.summary}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-500">
                      <div className="w-12 h-12 mx-auto mb-3 opacity-50">
                        🤖
                      </div>
                      <p className="text-sm">AI summary processing...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'code' ? (
          // Code Only View
          <div className="h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 border-b border-slate-600">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-sm font-mono flex-1">{selectedFile.name}</span>
              <div className="text-xs bg-slate-700 px-2 py-1 rounded">
                {fileContent?.split('\n').length || 0} lines
              </div>
            </div>
            <div className="h-full">
              {hasContent ? (
                selectedFile.language && ['javascript', 'typescript', 'python', 'java', 'css', 'html', 'json', 'xml', 'yaml', 'markdown'].includes(selectedFile.language.toLowerCase()) ? (
                  <SyntaxHighlighter
                    language={getLanguageForHighlighter(selectedFile.language)}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      height: 'calc(100% - 52px)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                    }}
                    showLineNumbers
                    wrapLines
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                ) : (
                  <div className="p-6 h-full overflow-auto">
                    <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
                      {fileContent}
                    </pre>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <div className="text-4xl mb-4">📄</div>
                    <p>No content available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Summary Only View
          <div className="h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                🧠
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{selectedFile.name}</h3>
                <p className="text-xs opacity-75">AI-Generated Analysis</p>
              </div>
              <div className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Ready
              </div>
            </div>
            <div className="p-6 h-full overflow-auto">
              {hasSummary ? (
                <div className="max-w-none">
                  <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-purple-200 dark:border-purple-700 shadow-lg">
                    <pre className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedFile.summary}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-500">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="font-semibold mb-2">AI Analysis In Progress</h3>
                    <p className="text-sm">The AI is currently analyzing this file...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
