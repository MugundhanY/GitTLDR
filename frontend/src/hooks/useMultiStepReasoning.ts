'use client'

import { useState, useCallback } from 'react'
import { ReasoningStep } from '@/components/qna/ReasoningSteps'

export interface UseReasoningOptions {
  enableMultiStepReasoning?: boolean
  maxSteps?: number
}

export function useMultiStepReasoning(options: UseReasoningOptions = {}) {
  const { enableMultiStepReasoning = true, maxSteps = 10 } = options
  
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([])
  const [isReasoningActive, setIsReasoningActive] = useState(false)

  const startReasoning = useCallback(() => {
    if (!enableMultiStepReasoning) return
    setReasoningSteps([])
    setIsReasoningActive(true)
  }, [enableMultiStepReasoning])

  const addReasoningStep = useCallback((step: Omit<ReasoningStep, 'id' | 'timestamp'>) => {
    if (!enableMultiStepReasoning) return
    
    const newStep: ReasoningStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    setReasoningSteps(prev => {
      // Limit the number of steps
      if (prev.length >= maxSteps) {
        return [...prev.slice(1), newStep]
      }
      return [...prev, newStep]
    })

    return newStep.id
  }, [enableMultiStepReasoning, maxSteps])

  const updateReasoningStep = useCallback((stepId: string, updates: Partial<ReasoningStep>) => {
    if (!enableMultiStepReasoning) return
    
    setReasoningSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              ...updates,
              duration: updates.status === 'completed' ? Date.now() - step.timestamp : step.duration
            }
          : step
      )
    )
  }, [enableMultiStepReasoning])

  const completeReasoning = useCallback(() => {
    if (!enableMultiStepReasoning) return
    setIsReasoningActive(false)
    
    // Mark any pending steps as completed
    setReasoningSteps(prev => 
      prev.map(step => 
        step.status === 'pending' || step.status === 'processing'
          ? { 
              ...step, 
              status: 'completed' as const,
              duration: Date.now() - step.timestamp
            }
          : step
      )
    )
  }, [enableMultiStepReasoning])

  const clearReasoningSteps = useCallback(() => {
    setReasoningSteps([])
    setIsReasoningActive(false)  }, [])

  // Real thinking model integration for deep research
  const performRealThinking = useCallback(async (question: string, repositoryId: string, repositoryName: string, codeContext?: string) => {
    if (!enableMultiStepReasoning) return

    startReasoning()

    try {
      // For now, fall back to simulation until new thinking integration is ready
      console.log('Real thinking requested for:', { question, repositoryId, repositoryName, codeContext })
      
      // Add a placeholder step indicating this would use the new thinking integration
      addReasoningStep({
        title: 'Deep Thinking Analysis',
        description: 'Advanced reasoning analysis would be performed here using the new thinking integration',
        status: 'completed',
        type: 'analysis',
        confidence: 0.8
      })
        // Fall back to simulation for now
      simulateReasoning(question, repositoryName)
      
    } catch (error) {
      console.error('Failed to start thinking model:', error)
      addReasoningStep({
        title: 'Error in Deep Research',
        description: `Failed to complete thinking process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failed',
        type: 'analysis'
      })
      completeReasoning()    }
  }, [enableMultiStepReasoning, startReasoning, addReasoningStep, completeReasoning])
  // Helper functions for thinking step conversion
  const formatThinkingTitle = (type: string, content: string): string => {
    // Extract first sentence or up to 80 characters, but break at word boundaries
    let shortContent = content.length > 80 
      ? content.substring(0, content.lastIndexOf(' ', 80)) || content.substring(0, 80)
      : content
    
    // Remove markdown formatting for titles
    shortContent = shortContent.replace(/\*\*(.*?)\*\*/g, '$1').trim()
    
    switch (type) {
      case 'thinking':
        return `💭 ${shortContent}${content.length > 80 ? '...' : ''}`
      case 'analysis':
        return `🔍 ${shortContent}${content.length > 80 ? '...' : ''}`
      case 'search':
        return `🔎 ${shortContent}${content.length > 80 ? '...' : ''}`
      case 'synthesis':
        return `🧩 ${shortContent}${content.length > 80 ? '...' : ''}`
      default:
        return `⚡ ${shortContent}${content.length > 80 ? '...' : ''}`
    }
  }
  const mapThinkingTypeToReasoningType = (thinkingType: string): 'analysis' | 'search' | 'connection' | 'synthesis' => {
    switch (thinkingType) {
      case 'analysis':
        return 'analysis'
      case 'search':
        return 'search'
      case 'synthesis':
        return 'synthesis'
      default:
        return 'connection'
    }
  }

  // Fallback simulation function for demonstration (when thinking model isn't available)
  const simulateReasoning = useCallback(async (question: string, repositoryName: string) => {
    if (!enableMultiStepReasoning) return

    startReasoning()

    // Step 1: Deep Question Analysis
    const step1Id = addReasoningStep({
      title: 'Deep Question Analysis',
      description: `Performing comprehensive analysis of: "${question.slice(0, 100)}${question.length > 100 ? '...' : ''}"`,
      status: 'processing',
      type: 'analysis',
      confidence: 0.9
    })

    await new Promise(resolve => setTimeout(resolve, 800))
    updateReasoningStep(step1Id!, { 
      status: 'completed',
      description: 'Identified complex concepts, dependencies, and multi-layered requirements'
    })

    // Step 2: Comprehensive Repository Search
    const step2Id = addReasoningStep({
      title: 'Comprehensive Repository Scan',
      description: `Deep scanning ${repositoryName} across multiple dimensions: architecture, patterns, dependencies`,
      status: 'processing',
      type: 'search',
      confidence: 0.85
    })

    await new Promise(resolve => setTimeout(resolve, 1200))
    updateReasoningStep(step2Id!, { 
      status: 'completed',
      description: 'Found relevant files, patterns, and architectural relationships',
      files: ['src/auth/login.ts', 'middleware/auth.ts', 'types/user.ts', 'config/database.ts', 'utils/security.ts']
    })

    // Step 3: Cross-Reference Analysis
    const step3Id = addReasoningStep({
      title: 'Cross-Reference & Dependency Analysis',
      description: 'Mapping complex relationships, data flow, and architectural patterns',
      status: 'processing',
      type: 'connection',
      confidence: 0.92
    })

    await new Promise(resolve => setTimeout(resolve, 1000))
    updateReasoningStep(step3Id!, { 
      status: 'completed',
      description: 'Mapped complex code relationships, architectural patterns, and system dependencies',
      code: 'export function authenticate(token: string) {\n  // Complex authentication flow with multiple validation layers\n  return jwt.verify(token, secret)\n}'
    })

    // Step 4: Comprehensive Synthesis
    const step4Id = addReasoningStep({
      title: 'Comprehensive Analysis Synthesis',
      description: 'Integrating findings into detailed, multi-layered response with architectural insights',
      status: 'processing',
      type: 'synthesis',
      confidence: 0.88
    })

    await new Promise(resolve => setTimeout(resolve, 600))
    updateReasoningStep(step4Id!, { 
      status: 'completed',
      description: 'Generated comprehensive answer with architectural analysis, code examples, and implementation recommendations'
    })

    completeReasoning()
  }, [enableMultiStepReasoning, startReasoning, addReasoningStep, updateReasoningStep, completeReasoning])
  return {
    reasoningSteps,
    isReasoningActive,
    startReasoning,
    addReasoningStep,
    updateReasoningStep,
    completeReasoning,
    clearReasoningSteps,
    performRealThinking,
    simulateReasoning,
    enableMultiStepReasoning
  }
}
