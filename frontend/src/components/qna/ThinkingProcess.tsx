'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  SparklesIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon,
  SpeakerWaveIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'

interface ThinkingProcessProps {
  repositoryId?: string
  question: string
  isVisible: boolean
  onClose?: () => void
  onAnswerSubmitted?: (answer: string) => void
  onClearThinking?: () => void // Add this prop
  attachments?: Array<{
    id: string
    fileName: string
    originalFileName: string
    fileType: string
    fileSize: number
    uploadUrl: string
  }>
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
  onAnswerSubmitted,
  onClearThinking,
  attachments = [],
  className = '' 
}: ThinkingProcessProps) {const [isThinking, setIsThinking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([])
  const [currentThought, setCurrentThought] = useState('')
  const [finalAnswer, setFinalAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [stepFeedback, setStepFeedback] = useState<{ [id: string]: 'like' | 'dislike' }>({})
  const [stepFeedbackLoading, setStepFeedbackLoading] = useState<{ [id: string]: boolean }>({})
  const [finalFeedback, setFinalFeedback] = useState<'like' | 'dislike' | null>(null)
  const [finalFeedbackLoading, setFinalFeedbackLoading] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const thoughtContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastRequestRef = useRef<{ repositoryId?: string; question: string } | null>(null)
  const lastRequestTimeRef = useRef<number>(0)

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
    }  }, [])
  // Helper function to process attachments for thinking API
  const processAttachmentsForThinking = async (attachments: any[]) => {
    const processedAttachments = []
    
    for (const attachment of attachments) {
      try {
        const fileName = attachment.fileName || attachment.originalFileName || attachment.name
        console.log(`Processing attachment: ${fileName}`)
        console.log(`Attachment object:`, attachment)
          let response = null        
        // UPDATED: Use direct download endpoint for B2 file paths
        const b2FileKey = attachment.fileName || attachment.fileKey || attachment.backblazeFileId
        
        if (b2FileKey) {
          console.log(`Getting direct download for B2 file: ${b2FileKey}`)
          
          // Use the new direct download endpoint
          response = await fetch('/api/attachments/download-direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: b2FileKey
            })
          })
          
          console.log(`Direct download response status: ${response?.status}, OK: ${response?.ok}`)
        } else {
          console.warn(`No B2 file key found for attachment ${fileName}`)
        }
        
        console.log(`Response status: ${response?.status}, OK: ${response?.ok}`)
        
        if (response && response.ok) {
          const content = await response.text()
          console.log(`Fetched content for ${fileName}:`, content.length, 'characters')
          
          // Determine file type based on file extension
          const extension = fileName.split('.').pop()?.toLowerCase()
          let type = 'document'
          if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'yaml', 'yml'].includes(extension || '')) {
            type = 'code'
          } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension || '')) {
            type = 'image'
          }
          
          const processedAttachment = {
            type,
            name: fileName,
            content: type === 'image' ? '' : content // Don't include content for images
          }
          
          processedAttachments.push(processedAttachment)
          console.log(`Successfully processed ${fileName} as ${type}`)
        } else {
          console.warn(`Failed to fetch attachment content for ${fileName}:`, response?.status, response?.statusText)
          // Don't treat attachment failure as a critical error - continue processing
          console.log(`Continuing without this attachment...`)
        }
      } catch (error) {
        console.error(`Error processing attachment ${attachment.fileName || attachment.name}:`, error)
        // Don't treat attachment failure as a critical error - continue processing
        console.log(`Continuing without this attachment...`)
      }
    }
    
    console.log('Processed attachments for thinking:', processedAttachments.length)
    processedAttachments.forEach(att => {
      console.log(`- ${att.name} (${att.type}): ${att.content.length} chars`)
    })
    
    return processedAttachments
  }
    const startThinking = useCallback(async () => {
    if (!repositoryId || !question.trim()) return

    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current

    // Debug: Log attachments received by ThinkingProcess
    console.log('🔥 THINKING PROCESS DEBUG:')
    console.log('🔥 Attachments received:', attachments)
    console.log('🔥 Attachments length:', attachments?.length)
    console.log('🔥 Attachments type:', typeof attachments)
    if (attachments && attachments.length > 0) {
      attachments.forEach((att, index) => {
        console.log(`🔥 Attachment ${index}:`, att)
      })
    } else {
      console.log('🚨 NO ATTACHMENTS RECEIVED BY THINKING PROCESS!')
    }

    // Rate limiting: prevent requests within 3 seconds of each other
    if (timeSinceLastRequest < 3000) {
      console.log('Rate limit active, ignoring duplicate request within 3 seconds')
      return
    }

    // Prevent duplicate requests for the same parameters
    const currentRequest = { repositoryId, question: question.trim() }
    if (lastRequestRef.current && 
        lastRequestRef.current.repositoryId === currentRequest.repositoryId &&
        lastRequestRef.current.question === currentRequest.question &&
        isThinking) {
      console.log('Duplicate request detected for same question while thinking, skipping')
      return
    }

    // Check if we're already thinking about this exact question
    if (isThinking && 
        lastRequestRef.current &&
        lastRequestRef.current.question === currentRequest.question) {
      console.log('Already thinking about this question, skipping duplicate')
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    console.log('Starting thinking process with:', currentRequest)
    lastRequestRef.current = currentRequest
    lastRequestTimeRef.current = now

    setIsThinking(true)
    setError(null)
    setThinkingBlocks([])
    setCurrentThought('')
    setHasCompleted(false) // Reset completion flag for new request    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Process attachments to get content for thinking
      console.log('Processing attachments before thinking...')
      const processedAttachments = await processAttachmentsForThinking(attachments || [])
      console.log('Attachment processing completed, starting thinking API call...')
      
      const response = await fetch('/api/thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId,
          question,
          attachments: processedAttachments,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      console.log('Thinking API response status:', response.status, response.ok)

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
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'thinking_start') {
                currentBlockId = data.block_id || `block_${Date.now()}`
                currentBlockContent = ''
              } else if (data.type === 'thinking_chunk') {
                const content = data.content || ''
                // DeepSeek: buffer until logical break, Gemini: push immediately
                const isDeepSeek = (data.id || currentBlockId || `block_${Date.now()}`).toLowerCase().includes('deepseek') || (data.provider === 'DeepSeek')
                if (isDeepSeek) {
                  currentBlockContent += content
                  // Logical break: double newline or markdown step header
                  if (/\n\n|\*\*Step \d+:/.test(currentBlockContent)) {
                    const blocks = currentBlockContent.split(/(\n\n|\*\*Step \d+:)/)
                    let buffer = ''
                    for (let i = 0; i < blocks.length; i++) {
                      buffer += blocks[i]
                      // If this is a break or last block, push
                      if (/^\*\*Step \d+:/.test(blocks[i]) || i === blocks.length - 1) {
                        if (buffer.trim().length > 0) {
                          const blockToAdd = {
                            id: (data.id || currentBlockId || `block_${Date.now()}`) + '-' + i,
                            content: buffer.trim(),
                            timestamp: Date.now(),
                            isComplete: true
                          }
                          setThinkingBlocks(prev => [...prev, blockToAdd])
                        }
                        buffer = ''
                      }
                    }
                    currentBlockContent = ''
                  }
                  setCurrentThought(currentBlockContent)
                } else {
                  // Gemini: push each chunk as a step
                  if (content.trim()) {
                    const blockToAdd = {
                      id: data.id || currentBlockId || `block_${Date.now()}`,
                      content: content.trim(),
                      timestamp: Date.now(),
                      isComplete: true
                    }
                    setThinkingBlocks(prev => [...prev, blockToAdd])
                  }
                  setCurrentThought('')
                }
              } else if (data.type === 'answer_submitted') {
                // Finalize and push the current reasoning block if it has content
                if (currentBlockContent.trim()) {
                  const blockToAdd = {
                    id: currentBlockId,
                    content: currentBlockContent.trim(),
                    timestamp: Date.now(),
                    isComplete: true
                  }
                  setThinkingBlocks(prev => {
                    const exists = prev.some(block => 
                      block.content.trim() === blockToAdd.content.trim()
                    )
                    if (!exists) {
                      return [...prev, blockToAdd]
                    }
                    return prev
                  })
                  currentBlockContent = ''
                  setCurrentThought('')
                }
                // Handle answer submission notification
                const finalAnswer = data.final_answer || ''
                if (finalAnswer && onAnswerSubmitted) {
                  onAnswerSubmitted(finalAnswer)
                }
                // Optionally, display the submission message as a separate block (not required)
                // const content = data.content || 'Answer submitted to Q&A database'
                // setCurrentThought(content)
              } else if (data.type === 'thinking_complete') {
                // Complete the current thinking block
                if (currentBlockContent.trim()) {
                  const blockToAdd = {
                    id: currentBlockId,
                    content: currentBlockContent.trim(),
                    timestamp: Date.now(),
                    isComplete: true
                  }
                  
                  // Check for duplicates before adding the final block
                  setThinkingBlocks(prev => {
                    const exists = prev.some(block => 
                      block.content.trim() === blockToAdd.content.trim()
                    )
                    if (!exists) {
                      return [...prev, blockToAdd]
                    }
                    return prev
                  })
                }
                setCurrentThought('')
                currentBlockContent = ''
                setHasCompleted(true) // Mark as completed to prevent restart
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
  }, [repositoryId, question, isPaused, attachments])

  const stopThinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsThinking(false)
    setCurrentThought('')  }, [])

  const clearThoughts = useCallback(() => {
    setThinkingBlocks([])
    setCurrentThought('')
    setFinalAnswer('')
    setError(null)
    setHasCompleted(false) // Reset completion flag so thinking can start again
    if (onClearThinking) onClearThinking(); // Notify parent to clear currentThinkingQuestion
  }, [onClearThinking])

  // NOTE: Removed auto-start thinking to prevent unwanted auto-triggering
  // Users must manually click "Start Deep Thinking" button to begin the process

  // Reset completion flag when question changes
  useEffect(() => {
    setHasCompleted(false)
  }, [question])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Auto-trigger startThinking when question or isVisible changes and not already thinking
  useEffect(() => {
    if (
      isVisible &&
      question &&
      !isThinking &&
      !hasCompleted &&
      !error &&
      thinkingBlocks.length === 0 &&
      currentThought === ''
    ) {
      // Use a microtask to ensure the component is fully mounted before starting
      Promise.resolve().then(() => startThinking());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, question])

  // Voice output for reasoning steps and final answer
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
  const handleStopSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
  const handleStepFeedback = async (stepId: string, value: 'like' | 'dislike') => {
    setStepFeedbackLoading(f => ({ ...f, [stepId]: true }))
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepId,
        type: 'step',
        value,
        userId: '1',
      })
    })
    setStepFeedback(f => ({ ...f, [stepId]: value }))
    setStepFeedbackLoading(f => ({ ...f, [stepId]: false }))
  }
  const handleFinalFeedback = async (value: 'like' | 'dislike') => {
    setFinalFeedbackLoading(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'deep',
        value,
        userId: '1',
      })
    })
    setFinalFeedback(value)
    setFinalFeedbackLoading(false)
  }

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
              Deep reasoning for: &quot;{question.slice(0, 50)}{question.length > 50 ? '...' : ''}&quot;
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
                {(thinkingBlocks.length > 0 || finalAnswer) && (
                <span className="text-slate-500 dark:text-slate-400">
                  {thinkingBlocks.length} reasoning {thinkingBlocks.length === 1 ? 'step' : 'steps'}
                  {finalAnswer && ' + final answer'}
                </span>
              )}
            </div>
              <div className="flex items-center gap-2">
              
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
            {thinkingBlocks.map((block, index) => {
              // Try to extract provider and step number from block.id or block.content
              let provider = null;
              let stepNumber = index + 1;
              if (block.id && block.id.startsWith('gemini-thinking-')) provider = 'Gemini';
              if (block.id && block.id.startsWith('thinking-')) provider = 'DeepSeek';
              if (block.id && block.id.startsWith('deepseek-thinking-')) provider = 'DeepSeek';
              if (block.id && block.id.startsWith('fallback-')) provider = 'Gemini';
              if (block.id && block.id.startsWith('answer-submitted')) provider = 'Gemini';
              if (block.id && block.id.startsWith('step-')) provider = 'DeepSeek';
              if (block.id && block.id.startsWith('gemini-complete')) provider = 'Gemini';
              if (block.id && block.id.startsWith('gemini-error')) provider = 'Gemini';
              if (block.id && block.id.startsWith('thinking_complete')) provider = 'DeepSeek';

              return (
                <div 
                  key={block.id}
                  className="animate-in slide-in-from-bottom duration-300 border-l-4 pl-6 pr-4 py-5 mb-4 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-900/40 dark:to-slate-900/60 rounded-xl shadow-md border-purple-400 relative group transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                      {stepNumber}
                    </div>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Step {stepNumber}</span>
                    {provider && (
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${provider === 'Gemini' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                        {provider}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSpeak(block.content)}
                      className="ml-2 p-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors shadow-sm"
                      title="Read step aloud"
                    >
                      <SpeakerWaveIcon className="w-5 h-5 text-purple-600" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStopSpeak}
                      className="ml-1 flex items-center justify-center p-2 w-10 h-10 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Stop reading"
                    >
                      <svg viewBox="0 0 32 32" fill="currentColor" className="w-8 h-8 text-red-600">
                        <rect x="8" y="8" width="16" height="16" rx="4" />
                      </svg>
                    </button>
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{new Date(block.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-slate-900 dark:text-white leading-relaxed">
                      {block.content.split('\n').map((line, lineIndex) => {
                        if (line.startsWith('## ')) {
                          return (
                            <h3 key={lineIndex} className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-4 mb-2 first:mt-0">
                              {line.replace('## ', '')}
                            </h3>
                          )
                        } else if (line.startsWith('# ')) {
                          return (
                            <h2 key={lineIndex} className="text-xl font-bold text-purple-800 dark:text-purple-200 mt-4 mb-2 first:mt-0">
                              {line.replace('# ', '')}
                            </h2>
                          )
                        } else if (line.trim() === '') {
                          return <br key={lineIndex} />
                        } else {
                          return (
                            <p key={lineIndex} className="mb-2 last:mb-0">
                              {line}
                            </p>
                          )
                        }
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Current thinking (streaming) */}
            {currentThought && (
              <div className="animate-in slide-in-from-bottom duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>                  <div className="flex-1 min-w-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-slate-900 dark:text-white leading-relaxed">
                        {/* Render current thought with basic markdown formatting */}
                        {currentThought.split('\n').map((line, lineIndex) => {
                          if (line.startsWith('## ')) {
                            return (
                              <h3 key={lineIndex} className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-4 mb-2 first:mt-0">
                                {line.replace('## ', '')}
                              </h3>
                            )
                          } else if (line.startsWith('# ')) {
                            return (
                              <h2 key={lineIndex} className="text-xl font-bold text-purple-800 dark:text-purple-200 mt-4 mb-2 first:mt-0">
                                {line.replace('# ', '')}
                              </h2>
                            )
                          } else if (line.trim() === '') {
                            return <br key={lineIndex} />
                          } else {
                            return (
                              <p key={lineIndex} className="mb-2 last:mb-0">
                                {line}
                              </p>
                            )
                          }
                        })}
                        <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>            )}

            {/* Final Answer Section */}
            {finalAnswer && (
              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                    Final Answer
                  </h3>
                  <span className="flex items-center ml-2">
                    <button
                      type="button"
                      onClick={() => handleSpeak(finalAnswer)}
                      className="p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="Read answer aloud"
                    >
                      <SpeakerWaveIcon className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStopSpeak}
                      className="ml-1 p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Stop reading"
                    >
                      <span className="w-5 h-5 block text-red-600">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><rect x="4" y="4" width="12" height="12" rx="2" /></svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalFeedback('like')}
                      disabled={finalFeedbackLoading || finalFeedback === 'like'}
                      className={`ml-2 p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors ${finalFeedback === 'like' ? 'bg-green-200 dark:bg-green-800' : ''}`}
                      title="Like answer"
                    >
                      <HandThumbUpIcon className="w-5 h-5 text-green-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalFeedback('dislike')}
                      disabled={finalFeedbackLoading || finalFeedback === 'dislike'}
                      className={`ml-1 p-2 rounded-full border border-slate-200 dark:border-green-600 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${finalFeedback === 'dislike' ? 'bg-red-200 dark:bg-red-800' : ''}`}
                      title="Dislike answer"
                    >
                      <HandThumbDownIcon className="w-5 h-5 text-red-600" />
                    </button>
                    {finalFeedback && (
                      <span className={`ml-2 text-xs ${finalFeedback === 'like' ? 'text-green-600' : 'text-red-600'}`}>{finalFeedback === 'like' ? 'Thanks for your feedback!' : 'We appreciate your feedback!'}</span>
                    )}
                  </span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-slate-900 dark:text-white leading-relaxed">
                      {finalAnswer.split('\n').map((line, lineIndex) => {
                        if (line.trim() === '') {
                          return <br key={lineIndex} />
                        } else {
                          return (
                            <p key={lineIndex} className="mb-2 last:mb-0">
                              {line}
                            </p>
                          )
                        }
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}{!isThinking && thinkingBlocks.length === 0 && !currentThought && !error && (
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
