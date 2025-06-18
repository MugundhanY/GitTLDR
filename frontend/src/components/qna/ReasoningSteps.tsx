'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  LinkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'
import StreamingText from '@/components/ui/StreamingText'

export interface ReasoningStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  type: 'analysis' | 'search' | 'connection' | 'synthesis'
  files?: string[]
  code?: string
  confidence?: number
  timestamp: number
  duration?: number
}

interface ReasoningStepsProps {
  steps: ReasoningStep[]
  isProcessing: boolean
  showByDefault?: boolean
  className?: string
}

const stepIcons = {
  analysis: MagnifyingGlassIcon,
  search: DocumentTextIcon,
  connection: LinkIcon,
  synthesis: CodeBracketIcon
}

const stepColors = {
  analysis: 'blue',
  search: 'green',
  connection: 'purple',
  synthesis: 'orange'
}

export default function ReasoningSteps({ 
  steps, 
  isProcessing, 
  showByDefault = false, 
  className = '' 
}: ReasoningStepsProps) {
  const [isExpanded, setIsExpanded] = useState(showByDefault)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // Auto-expand when processing starts
  useEffect(() => {
    if (isProcessing && !isExpanded) {
      setIsExpanded(true)
    }
  }, [isProcessing, isExpanded])

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status: ReasoningStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-slate-400" />
      case 'failed':
        return <div className="w-4 h-4 bg-red-500 rounded-full" />
      default:
        return <div className="w-4 h-4 bg-slate-300 rounded-full" />
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return ''
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`
  }

  if (steps.length === 0 && !isProcessing) {
    return null
  }

  return (
    <div className={`bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors rounded-t-lg"
      >        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <CodeBracketIcon className="w-3 h-3 text-white" />
          </div>          <h3 className="font-medium text-slate-900 dark:text-white">
            AI Thinking Process
          </h3>
          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
            {steps.filter(s => s.status === 'completed').length}/{steps.length} steps
          </span>
          {isProcessing && (            <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              Thinking...
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-slate-500" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-slate-500" />
        )}
      </button>

      {/* Steps Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.type]
              const color = stepColors[step.type]
              const isStepExpanded = expandedSteps.has(step.id)
              
              return (
                <div key={step.id} className="relative">
                  {/* Timeline line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-px bg-slate-200 dark:bg-slate-600" />
                  )}
                  
                  <div className="flex gap-3">
                    {/* Step icon with status */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          color === 'green' ? 'text-green-600 dark:text-green-400' :
                          color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          'text-orange-600 dark:text-orange-400'
                        }`} />
                      </div>
                      {/* Status indicator */}
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5">
                        {getStatusIcon(step.status)}
                      </div>
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => toggleStepExpansion(step.id)}
                        className="w-full text-left group"
                      >                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {step.title}
                            </h4>                            <div className="mt-1">
                              <StreamingText
                                text={step.description}
                                className="text-sm text-slate-600 dark:text-slate-400"
                                delay={step.status === 'processing' && isProcessing ? 15 : 0}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {step.confidence && (
                              <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                                {Math.round(step.confidence * 100)}%
                              </span>
                            )}
                            {step.duration && (
                              <span>{formatDuration(step.duration)}</span>
                            )}
                            {step.files && step.files.length > 0 && (
                              <span className="flex items-center gap-1">
                                <DocumentTextIcon className="w-3 h-3" />
                                {step.files.length}
                              </span>
                            )}
                            {isStepExpanded ? (
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded step details */}
                      {isStepExpanded && (
                        <div className="mt-3 space-y-3 animate-in slide-in-from-top duration-200">
                          {/* Files involved */}
                          {step.files && step.files.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Files Analyzed:
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {step.files.map((file, fileIndex) => (
                                  <span
                                    key={fileIndex}
                                    className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                                  >
                                    {file}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Code snippet */}
                          {step.code && (
                            <div>
                              <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Key Code:
                              </h5>
                              <pre className="text-xs bg-slate-900 dark:bg-slate-950 text-green-400 p-3 rounded-lg overflow-x-auto">
                                <code>{step.code}</code>
                              </pre>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-3 py-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    Analyzing...
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Building comprehensive understanding
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
