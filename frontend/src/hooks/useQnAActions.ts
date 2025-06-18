'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Question, FileContent } from './useQnAFiltering'
import { useMultiStepReasoning } from './useMultiStepReasoning'

interface UseQnAActionsProps {
  selectedRepository?: { id: string; name: string }
  onQuestionsUpdate: (questions: Question[] | Question) => void
  incrementQuestionCount: () => void
  triggerStatsRefreshOnCompletion?: () => void
}

interface UseQnAActionsReturn {
  // Question management
  isAsking: boolean
  handleAskQuestion: (questionText: string, attachments?: import('@/types/attachments').QuestionAttachment[]) => Promise<void>
  handleQuestionUpdate: (updatedQuestion: Question) => void
  
  // File content management
  expandedFiles: { [key: string]: boolean }
  loadingFiles: { [key: string]: boolean }
  fileContents: { [key: string]: FileContent }
  copiedStates: { [key: string]: boolean }
  toggleFileExpansion: (filePath: string) => void
  copyToClipboard: (text: string, filePath: string) => void
  
  // Export functionality
  exportQuestions: (format: 'markdown' | 'json' | 'html', filters: any) => Promise<void>
  
  // Advanced search
  performAdvancedSearch: (filters: any) => Promise<void>
  
  // Follow-up questions
  getFollowUpSuggestions: (question: Question) => string[]
  handleSelectFollowUp: (originalQuestion: Question, followUpText: string, onQuestionChange: (text: string) => void) => void
  
  // Multi-step reasoning
  multiStepReasoning: ReturnType<typeof useMultiStepReasoning>
}

export function useQnAActions({ 
  selectedRepository, 
  onQuestionsUpdate,
  incrementQuestionCount,
  triggerStatsRefreshOnCompletion
}: UseQnAActionsProps): UseQnAActionsReturn {
  
  const [isAsking, setIsAsking] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({})
  const [fileContents, setFileContents] = useState<{ [key: string]: FileContent }>({})
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({})
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
    // Multi-step reasoning hook
  const multiStepReasoning = useMultiStepReasoning({ 
    enableMultiStepReasoning: true // This will be overridden in the main component
  })
    // Store active polling timeouts for cleanup
  const pollingTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())
  // Cleanup effect - clear all polling timeouts when component unmounts or dependencies change
  useEffect(() => {
    return () => {
      // Call all cleanup functions first
      const cleanups = (pollingTimeouts.current as any)._cleanups || []
      cleanups.forEach((cleanup: () => void) => {
        try {
          cleanup()
        } catch (error) {
          console.error('Error during polling cleanup:', error)
        }
      })
      
      // Clear all active polling timeouts
      pollingTimeouts.current.forEach(timeoutId => {
        clearTimeout(timeoutId)
      })
      pollingTimeouts.current.clear()
      
      // Clear cleanup functions
      ;(pollingTimeouts.current as any)._cleanups = []
      
      console.log('🧹 Cleaned up all polling timeouts and cleanup functions')
    }
  }, [selectedRepository?.id]) // Clean up when repository changes

  const fetchFileContent = useCallback(async (filePath: string) => {
    if (!selectedRepository?.id) return

    // Check if already loaded or loading to prevent duplicate requests
    if (fileContents[filePath] || loadingFiles[filePath]) {
      return
    }
    
    setLoadingFiles(prev => ({ ...prev, [filePath]: true }))
    
    try {
      // First, find the file by path to get its ID
      const filesResponse = await fetch(`/api/repositories/${selectedRepository.id}/files?path=${encodeURIComponent(filePath)}`)
      if (!filesResponse.ok) {
        throw new Error(`Failed to find file: ${filesResponse.status}`)
      }
      
      const filesData = await filesResponse.json()
      const file = filesData.files?.find((f: any) => f.path === filePath)
      
      if (!file) {
        throw new Error('File not found in repository')
      }
      
      // Now fetch the file content using the file ID
      const contentResponse = await fetch(`/api/repositories/${selectedRepository.id}/files/${file.id}/content`)
      if (!contentResponse.ok) {
        throw new Error(`Failed to fetch file content: ${contentResponse.status}`)
      }
      
      const contentData = await contentResponse.json()
      
      setFileContents(prev => ({
        ...prev,
        [filePath]: {
          content: contentData.content || '',
          language: contentData.language || 'text',
          type: contentData.type || 'file'
        }
      }))
    } catch (error) {
      console.error('Error fetching file content:', error)
      setFileContents(prev => ({
        ...prev,
        [filePath]: {
          content: 'Error loading file content',
          language: 'text',
          type: 'error'
        }
      }))
    } finally {
      setLoadingFiles(prev => ({ ...prev, [filePath]: false }))
    }
  }, [selectedRepository?.id, fileContents, loadingFiles])

  const toggleFileExpansion = useCallback((filePath: string) => {
    setExpandedFiles(prev => {
      const isExpanding = !prev[filePath]
      const newState = { ...prev, [filePath]: isExpanding }
      
      // Only fetch if expanding and content doesn't exist yet
      if (isExpanding && !fileContents[filePath] && !loadingFiles[filePath]) {
        // Use setTimeout to defer the API call and prevent blocking the UI
        setTimeout(() => fetchFileContent(filePath), 0)
      }
      
      return newState
    })
  }, [fetchFileContent, fileContents, loadingFiles])
  
  const copyToClipboard = useCallback(async (text: string, filePath: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [filePath]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [filePath]: false }))
      }, 2000)    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [])
  
  const handleAskQuestion = useCallback(async (questionText: string, attachments: import('@/types/attachments').QuestionAttachment[] = []) => {
    if (!questionText.trim() || !selectedRepository?.id) return

    setIsAsking(true)
    
    // Start deep research thinking process if enabled
    if (multiStepReasoning.enableMultiStepReasoning) {
      try {
        // Try to use real thinking model first
        await multiStepReasoning.performRealThinking(questionText, selectedRepository.id, selectedRepository.name)
      } catch (error) {
        console.warn('Real thinking model failed, falling back to simulation:', error)
        // Fallback to simulation if thinking model fails
        await multiStepReasoning.simulateReasoning(questionText, selectedRepository.name)
      }
      
      // For thinking mode, we don't submit to the regular Q&A endpoint
      // The thinking process handles the question directly
      setIsAsking(false)
      return
    }
    
    try {
      const response = await fetch('/api/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          question: questionText.trim(),
          userId: '1',
          attachments
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Question submitted successfully:', data);
        
        const pendingQuestion: Question = {
          id: data.questionId,
          query: questionText,
          answer: undefined,
          repositoryId: selectedRepository.id,
          repositoryName: selectedRepository.name,
          createdAt: new Date().toISOString(),
          status: 'pending',
          reasoningSteps: multiStepReasoning.reasoningSteps,
          hasMultiStepReasoning: multiStepReasoning.enableMultiStepReasoning,          questionAttachments: attachments
        };        // Add the pending question to the list immediately
        onQuestionsUpdate(pendingQuestion);
        
        // Update question count without triggering stats refresh during polling
        incrementQuestionCount();

        // Set up optimized polling to check for the answer
        // NOTE: This runs asynchronously and doesn't block the function completion
        const setupPolling = () => {
          let attempts = 0
          const maxAttempts = 18 // Reduced from 20 to 18 attempts (1.8 minutes instead of 2)
          let isPolling = true
          let pollInterval = 4000 // Start with 4 seconds, will increase over time
          
          const poll = async () => {
            if (!isPolling) {
              console.log(`🛑 Polling stopped for question ${data.questionId}`)
              return
            }

            try {
              console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts} for question ${data.questionId}`)
              
              // Use a more specific endpoint to reduce data transfer
              const pollResponse = await fetch(`/api/qna?repositoryId=${selectedRepository.id}&userId=1&questionId=${data.questionId}`)
              if (pollResponse.ok) {
                const pollData = await pollResponse.json()
                const questions = pollData.questions || []
                
                // Find our specific question
                const completedQuestion = questions.find((q: Question) => q.id === data.questionId)
                  if (completedQuestion && completedQuestion.answer && completedQuestion.status === 'completed') {
                  console.log(`✅ Question ${data.questionId} completed, updating UI`)
                  onQuestionsUpdate(completedQuestion)
                    // Only trigger stats refresh very occasionally and with throttling
                  const shouldTriggerRefresh = Math.random() < 0.1; // Reduced to only 10% chance to trigger refresh
                  if (shouldTriggerRefresh && triggerStatsRefreshOnCompletion) {
                    console.log('📊 [Q&A] Triggering stats refresh for completed question');
                    triggerStatsRefreshOnCompletion();
                  } else {
                    console.log('📊 [Q&A] Skipping stats refresh (throttled)');
                  }
                  
                  isPolling = false
                  return
                }
              }
                attempts++
              if (attempts < maxAttempts && isPolling) {
                // Implement exponential backoff - increase poll interval over time
                if (attempts > 4) pollInterval = 7000  // 7 seconds after 4 attempts
                if (attempts > 8) pollInterval = 12000 // 12 seconds after 8 attempts
                if (attempts > 12) pollInterval = 20000 // 20 seconds after 12 attempts
                
                const newTimeoutId = setTimeout(poll, pollInterval)
                pollingTimeouts.current.add(newTimeoutId)
                
                // Cleanup timeout reference
                setTimeout(() => {
                  pollingTimeouts.current.delete(newTimeoutId)
                }, pollInterval + 100)
              } else {
                console.log(`⏰ Polling completed for question ${data.questionId} - ${isPolling ? 'max attempts reached' : 'stopped'}`)
                if (isPolling) {
                  onQuestionsUpdate({ ...pendingQuestion, status: 'failed' })
                }
                isPolling = false
              }
            } catch (error) {
              console.error(`❌ Error polling for question ${data.questionId}:`, error)
              attempts++
              if (attempts < maxAttempts && isPolling) {
                const newTimeoutId = setTimeout(poll, pollInterval)
                pollingTimeouts.current.add(newTimeoutId)
                
                setTimeout(() => {
                  pollingTimeouts.current.delete(newTimeoutId)
                }, pollInterval + 100)
              } else {
                isPolling = false
              }
            }
          }
          
          // Start polling after a delay
          const initialTimeoutId = setTimeout(() => {
            pollingTimeouts.current.delete(initialTimeoutId)
            poll()
          }, 2000) // Reduced initial delay from 3s to 2s
          pollingTimeouts.current.add(initialTimeoutId)
          
          // Store cleanup function for this specific question's polling
          const cleanupPolling = () => {
            isPolling = false
            console.log('Cleanup called for question', data.questionId)
          }
          
          // Store cleanup in a way that the useEffect can access it
          // This is a bit of a hack, but necessary for proper cleanup
          const currentCleanups = (pollingTimeouts.current as any)._cleanups || []
          currentCleanups.push(cleanupPolling)
          ;(pollingTimeouts.current as any)._cleanups = currentCleanups
        }

        // Start polling asynchronously (don't await this)
        setupPolling();
        
      } else {
        throw new Error('Failed to ask question')
      }
    } catch (error) {
      console.error('Error asking question:', error)
      alert('Failed to ask question. Please try again.')    } finally {
      setIsAsking(false)
    }
  }, [selectedRepository, onQuestionsUpdate, incrementQuestionCount, multiStepReasoning])
  const handleQuestionUpdate = useCallback(async (updatedQuestion: Question) => {
    // This would typically make an API call to update the question
    onQuestionsUpdate(updatedQuestion)
  }, [onQuestionsUpdate])

  // Export functionality
  const exportQuestions = useCallback(async (format: 'markdown' | 'json' | 'html', filters: any) => {
    if (!selectedRepository?.id) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: '1',
        format,
        ...(filters.filterFavorites && { favoritesOnly: 'true' }),
        ...(filters.selectedCategory && { category: filters.selectedCategory }),
        ...(filters.selectedFileTypes.length > 0 && { fileTypes: filters.selectedFileTypes.join(',') })
      })

      const response = await fetch(`/api/qna/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `qna-export.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting questions:', error)
    }
  }, [selectedRepository?.id])

  // Advanced search with confidence filtering
  const performAdvancedSearch = useCallback(async (filters: any) => {
    if (!selectedRepository?.id || !filters.useConfidenceFilter) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: '1',
        ...(filters.searchQuery && { query: filters.searchQuery }),
        ...(filters.selectedCategory && { category: filters.selectedCategory }),
        ...(filters.selectedTags.length > 0 && { tags: filters.selectedTags.join(',') }),
        ...(filters.selectedFileTypes.length > 0 && { fileTypes: filters.selectedFileTypes.join(',') }),
        ...(filters.filterFavorites && { favoritesOnly: 'true' }),
        minConfidence: filters.minConfidence.toString(),
        maxConfidence: filters.maxConfidence.toString()
      })

      const response = await fetch(`/api/qna/search?${params}`)
      if (response.ok) {
        const data = await response.json()
        const searchedQuestions = data.questions || []
        onQuestionsUpdate(searchedQuestions)
      }
    } catch (error) {
      console.error('Error performing advanced search:', error)
    }
  }, [selectedRepository?.id, onQuestionsUpdate])

  // Generate follow-up question suggestions based on question category and content
  const getFollowUpSuggestions = useCallback((question: Question): string[] => {
    const category = question.category?.toLowerCase()
    const baseQuestions = []

    // Category-specific follow-ups
    switch (category) {
      case 'architecture':
        baseQuestions.push(
          "How would this scale with increased load?",
          "What are the security implications?",
          "Can you explain the data flow?"
        )
        break
      case 'implementation':
        baseQuestions.push(
          "Are there any edge cases to consider?",
          "How can this be optimized?",
          "What are alternative approaches?"
        )
        break
      case 'debugging':
        baseQuestions.push(
          "What debugging steps would you recommend?",
          "How can I prevent this issue?",
          "Are there related issues to watch for?"
        )
        break
      case 'configuration':
        baseQuestions.push(
          "What are the recommended settings?",
          "How do I troubleshoot configuration issues?",
          "What security considerations apply?"
        )
        break
      default:
        baseQuestions.push(
          "Can you provide more details?",
          "What are the best practices here?",
          "How does this relate to other parts of the codebase?"
        )
    }

    // Add generic follow-ups
    baseQuestions.push(
      "Show me examples of this pattern",
      "What documentation exists for this?"
    )

    return baseQuestions.slice(0, 4) // Limit to 4 suggestions to avoid UI clutter
  }, [])

  // Handle selecting a follow-up question
  const handleSelectFollowUp = useCallback((originalQuestion: Question, followUpText: string, onQuestionChange: (text: string) => void) => {
    // Create a contextual follow-up question
    const contextualQuestion = `Regarding "${originalQuestion.query.slice(0, 50)}${originalQuestion.query.length > 50 ? '...' : ''}", ${followUpText.toLowerCase()}`
    onQuestionChange(contextualQuestion)
    
    // Scroll to question input
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What does this code do"]') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(contextualQuestion.length, contextualQuestion.length)
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [])
  return {
    // Question management
    isAsking,
    handleAskQuestion,
    handleQuestionUpdate,
    
    // File content management
    expandedFiles,
    loadingFiles,
    fileContents,
    copiedStates,
    toggleFileExpansion,
    copyToClipboard,
    
    // Export functionality
    exportQuestions,
    
    // Advanced search
    performAdvancedSearch,
    
    // Follow-up questions
    getFollowUpSuggestions,
    handleSelectFollowUp,
    
    // Multi-step reasoning
    multiStepReasoning
  }
}
