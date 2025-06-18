'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  SparklesIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'

interface ThinkingProcessProps {
  repositoryId?: string
  question: string
  isVisible: boolean
  onClose?: () => void
  className?: string
}

interface ThinkingBlock {
  id: string
  content: string
  timestamp: number
  isComplete: boolean
}

export default function ThinkingProcess({ 
  repositoryId, 
  question, 
  isVisible, 
  onClose,
  className = '' 
}: ThinkingProcessProps) {
  const [isThinking, setIsThinking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([])
  const [currentThought, setCurrentThought] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const thoughtContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (shouldAutoScrollRef.current && thoughtContainerRef.current) {
      thoughtContainerRef.current.scrollTop = thoughtContainerRef.current.scrollHeight
    }
  }, [thinkingBlocks, currentThought])

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (thoughtContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = thoughtContainerRef.current
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10
      shouldAutoScrollRef.current = isAtBottom
    }
  }, [])

  const startThinking = useCallback(async () => {
    if (!repositoryId || !question.trim()) return

    setIsThinking(true)
    setError(null)
    setThinkingBlocks([])
    setCurrentThought('')
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          question,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentBlockId = ''
      let currentBlockContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        if (isPaused) {
          await new Promise(resolve => {
            const checkPause = () => {
              if (!isPaused) resolve(void 0)
              else setTimeout(checkPause, 100)
            }
            checkPause()
          })
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'thinking_start') {
                currentBlockId = data.block_id || `block_${Date.now()}`
                currentBlockContent = ''
              } else if (data.type === 'thinking_chunk') {
                currentBlockContent += data.content || ''
                setCurrentThought(currentBlockContent)
              } else if (data.type === 'thinking_complete') {
                // Complete the current thinking block
                if (currentBlockContent.trim()) {
                  setThinkingBlocks(prev => [
                    ...prev,
                    {
                      id: currentBlockId,
                      content: currentBlockContent.trim(),
                      timestamp: Date.now(),
                      isComplete: true
                    }
                  ])
                }
                setCurrentThought('')
                currentBlockContent = ''
              } else if (data.type === 'error') {
                setError(data.message || 'An error occurred during thinking')
                break
              } else if (data.type === 'done') {
                break
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Thinking process error:', error)
        setError(error.message || 'Failed to connect to thinking service')
      }
    } finally {
      setIsThinking(false)
      setCurrentThought('')
    }
  }, [repositoryId, question, isPaused])

  const stopThinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsThinking(false)
    setCurrentThought('')
  }, [])

  const clearThoughts = useCallback(() => {
    setThinkingBlocks([])
    setCurrentThought('')
    setError(null)
  }, [])

  // Auto-start thinking when component becomes visible
  useEffect(() => {
    if (isVisible && repositoryId && question.trim() && !isThinking) {
      startThinking()
    }
  }, [isVisible, repositoryId, question, isThinking, startThinking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <CpuChipIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              AI Thinking Process
              {isThinking && (
                <SparklesIcon className="w-4 h-4 text-purple-500 animate-pulse" />
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deep reasoning for: "{question.slice(0, 50)}{question.length > 50 ? '...' : ''}"
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          {isThinking && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isPaused ? 'Resume thinking' : 'Pause thinking'}
            >
              {isPaused ? (
                <PlayIcon className="w-4 h-4" />
              ) : (
                <PauseIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* Collapse/Expand */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </button>
          
          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close thinking process"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Status bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-2 ${
                isThinking ? 'text-purple-600 dark:text-purple-400' : 
                error ? 'text-red-600 dark:text-red-400' : 
                'text-green-600 dark:text-green-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isThinking ? 'bg-purple-500 animate-pulse' : 
                  error ? 'bg-red-500' : 
                  'bg-green-500'
                }`} />
                <span>
                  {isThinking ? (isPaused ? 'Paused' : 'Thinking...') : 
                   error ? 'Error' : 
                   thinkingBlocks.length > 0 ? 'Complete' : 'Ready'}
                </span>
              </div>
              
              {thinkingBlocks.length > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {thinkingBlocks.length} reasoning {thinkingBlocks.length === 1 ? 'block' : 'blocks'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isThinking && !error && (
                <button
                  onClick={startThinking}
                  className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Restart Thinking
                </button>
              )}
              
              {(thinkingBlocks.length > 0 || currentThought) && (
                <button
                  onClick={clearThoughts}
                  className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Thinking content */}
          <div 
            ref={thoughtContainerRef}
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-800 rounded-lg p-4"
          >
            {/* Completed thinking blocks */}
            {thinkingBlocks.map((block, index) => (
              <div 
                key={block.id}
                className="animate-in slide-in-from-bottom duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {block.content}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Current thinking (streaming) */}
            {currentThought && (
              <div className="animate-in slide-in-from-bottom duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {currentThought}
                        <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}            {!isThinking && thinkingBlocks.length === 0 && !currentThought && !error && (
              <div className="text-center py-8">
                <CpuChipIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  AI thinking process will appear here
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                  Start by asking a question to see deep reasoning
                </p>
              </div>
            )}

            {/* Thinking indicator */}
            {isThinking && !currentThought && (
              <div className="flex items-center gap-3 py-4">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  Starting to think about your question...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
