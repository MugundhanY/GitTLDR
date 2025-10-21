'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Question, FileContent } from './useQnAFiltering'

interface UseQnAActionsProps {
  selectedRepository?: { id: string; name: string }
  userId?: string  // NEW: Pass actual user ID
  onQuestionsUpdate: (questions: Question[] | Question) => void
  incrementQuestionCount: () => void
  triggerStatsRefreshOnCompletion?: () => void
  refetchQuestions?: () => Promise<void>  // NEW: Callback to refetch questions from server
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
}

export function useQnAActions({ 
  selectedRepository, 
  userId,  // NEW: Get actual user ID
  onQuestionsUpdate,
  incrementQuestionCount,
  triggerStatsRefreshOnCompletion,
  refetchQuestions  // NEW: Callback to refetch questions
}: UseQnAActionsProps): UseQnAActionsReturn {
  
  const [isAsking, setIsAsking] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({})
  const [fileContents, setFileContents] = useState<{ [key: string]: FileContent }>({})
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({})
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
  
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

  // Helper function to process attachments for Q&A API
  const processAttachmentsForQNA = async (attachments: any[]) => {
    const processedAttachments = []
    
    for (const attachment of attachments) {
      try {
        const fileName = attachment.fileName || attachment.originalFileName || attachment.name
        console.log(`🔄 Q&A: Processing attachment for Q&A: ${fileName}`)
        
        // Get B2 file key for download
        const b2FileKey = attachment.fileName || attachment.fileKey || attachment.backblazeFileId
        
        if (b2FileKey) {
          console.log(`🔄 Q&A: Getting direct download for Q&A attachment: ${b2FileKey}`)
          
          // Use the new direct download endpoint to get content
          const response = await fetch('/api/attachments/download-direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: b2FileKey
            })
          })
          
          console.log(`🔄 Q&A: Download response status: ${response?.status}, OK: ${response?.ok}`)
          
          if (response && response.ok) {
          const base64Content = await response.text()
          console.log(`✅ Q&A: Fetched base64 content for Q&A attachment ${fileName}:`, base64Content.length, 'characters')
          
          // For PDFs and binary files, keep the content as base64 for the backend to decode properly
          // For text files, decode it here
          let content = ''
          const extension = fileName.split('.').pop()?.toLowerCase()
          const isBinaryFile = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'].includes(extension || '')
          
          // ALWAYS keep as base64 and let backend decode
          // Backend Python has proper base64 decoding that handles any file size
          // Browser's atob() and fetch() data URLs both have size limitations for large files
          content = base64Content
          console.log(`✅ Q&A: Keeping ${fileName} as base64 (${content.length} chars) for backend processing`)
                      // Create processed attachment with content included
            const processedAttachment = {
              ...attachment, // Keep all original properties
              content: content // Add the decoded content
            }
            
            processedAttachments.push(processedAttachment)
            console.log(`✅ Q&A: Successfully processed Q&A attachment ${fileName} with content`)
          } else {
            // Try to get error details
            let errorDetails = 'Unknown error'
            try {
              errorDetails = await response.text()
            } catch (e) {
              console.error('🔄 Q&A: Could not read error response:', e)
            }
            
            console.warn(`❌ Q&A: Failed to fetch Q&A attachment content for ${fileName}:`, response?.status, response?.statusText, errorDetails)
            // Include attachment without content as fallback
            processedAttachments.push(attachment)
            console.log(`⚠️ Q&A: Including Q&A attachment ${fileName} without content due to download failure`)
          }
        } else {
          console.warn(`❌ Q&A: No B2 file key found for Q&A attachment ${fileName}`)
          // Include attachment as-is if no file key
          processedAttachments.push(attachment)
        }
      } catch (error) {
        console.error(`❌ Q&A: Error processing Q&A attachment ${attachment.fileName || attachment.name}:`, error)
        // Include attachment as-is if processing fails
        processedAttachments.push(attachment)
        console.log(`⚠️ Q&A: Including Q&A attachment ${attachment.fileName || attachment.name} as-is due to processing error`)
      }
    }
    
    console.log('📊 Q&A: Processed Q&A attachments:', processedAttachments.length)
    processedAttachments.forEach(att => {
      console.log(`📄 Q&A: - ${att.fileName || att.originalFileName || att.name}: ${att.content ? att.content.length + ' chars' : 'no content'}`)
    })
    
    return processedAttachments
  }

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
    if (!questionText.trim() || !selectedRepository?.id || !userId) return

    setIsAsking(true)
    
    try {
      // Process attachments to download content before sending to Q&A API
      console.log('Processing attachments for Q&A...')
      const processedAttachments = await processAttachmentsForQNA(attachments || [])
      console.log('Attachment processing completed, sending to Q&A API...')
      
      const response = await fetch('/api/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          question: questionText.trim(),
          userId: userId,
          attachments: processedAttachments
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Question submitted successfully:', data);
        
        // Check if this is API mode with immediate answer
        if (data.mode === 'api' && data.status === 'completed' && data.answer) {
          console.log('🚀 API Mode: Answer received immediately!');
          console.log('📁 Frontend: Received data from API:', data);
          console.log('📁 Frontend: data.relevantFiles =', data.relevantFiles);
          
          // Create completed question with answer and relevant files
          const completedQuestion: Question = {
            id: data.questionId,
            query: questionText,
            answer: data.answer,
            repositoryId: selectedRepository.id,
            repositoryName: selectedRepository.name,
            createdAt: new Date().toISOString(),
            status: 'completed',
            relevantFiles: data.relevantFiles || [],
            questionAttachments: attachments,
            confidence: data.confidence,
            category: data.category || undefined,
            tags: data.tags || []
          };
          
          console.log(`📁 Relevant files count: ${completedQuestion.relevantFiles?.length || 0}`);
          console.log(`📁 Relevant files array:`, completedQuestion.relevantFiles);
          console.log(`🏷️ Category: ${completedQuestion.category}, Tags: ${completedQuestion.tags?.join(', ')}`);
          
          // Add completed question to the list immediately
          onQuestionsUpdate(completedQuestion);
          
          // Update question count
          incrementQuestionCount();
          
          // Auto-scroll to the new question after a brief delay
          setTimeout(() => {
            const questionElement = document.querySelector(`[data-question-id="${data.questionId}"]`);
            if (questionElement) {
              questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
          
          // No polling needed for API mode!
          setIsAsking(false);
          return;
        }
        
        // WORKER mode or API mode without immediate answer - use polling
        const pendingQuestion: Question = {
          id: data.questionId,
          query: questionText,
          answer: undefined,
          repositoryId: selectedRepository.id,
          repositoryName: selectedRepository.name,
          createdAt: new Date().toISOString(),
          status: 'pending',
          questionAttachments: attachments
        };
        
        // Add the pending question to the list immediately
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
              const pollResponse = await fetch(`/api/qna?repositoryId=${selectedRepository.id}&userId=${userId}&questionId=${data.questionId}`)
              if (pollResponse.ok) {
                const pollData = await pollResponse.json()
                const questions = pollData.questions || []
                
                console.log(`🔍 Poll result for question ${data.questionId}: found ${questions.length} questions`);
                if (questions.length > 0) {
                  const q = questions[0];
                  console.log(`📋 Question ${q.id}: answer=${!!q.answer}, answerLength=${q.answer?.length || 0}, status=${q.status}`);
                  console.log(`📁 Relevant files in poll result:`, q.relevantFiles);
                  console.log(`🏷️ Category: ${q.category}, Tags:`, q.tags);
                }
                
                // Find our specific question
                const completedQuestion = questions.find((q: Question) => q.id === data.questionId)
                  if (completedQuestion && completedQuestion.answer && completedQuestion.status === 'completed') {
                  console.log(`✅ Question ${data.questionId} completed, updating UI`)
                  console.log(`📁 Relevant files count: ${completedQuestion.relevantFiles?.length || 0}`)
                  console.log(`📁 Relevant files data:`, completedQuestion.relevantFiles)
                  console.log(`🏷️ Category: ${completedQuestion.category}, Tags:`, completedQuestion.tags)
                  
                  // Update just this specific question
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
      alert('Failed to ask question. Please try again.')
    } finally {
      setIsAsking(false)
    }
  }, [selectedRepository, userId, onQuestionsUpdate, incrementQuestionCount])
  
  const handleQuestionUpdate = useCallback(async (updatedQuestion: Question) => {
    // This would typically make an API call to update the question
    onQuestionsUpdate(updatedQuestion)
  }, [onQuestionsUpdate])

  // Export functionality
  const exportQuestions = useCallback(async (format: 'markdown' | 'json' | 'html', filters: any) => {
    if (!selectedRepository?.id || !userId) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: userId,
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
  }, [selectedRepository?.id, userId])

  // Advanced search with confidence filtering
  const performAdvancedSearch = useCallback(async (filters: any) => {
    if (!selectedRepository?.id || !filters.useConfidenceFilter || !userId) return

    try {
      const params = new URLSearchParams({
        repositoryId: selectedRepository.id,
        userId: userId,
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
  }, [selectedRepository?.id, userId, onQuestionsUpdate])

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
    handleSelectFollowUp
  }
}
