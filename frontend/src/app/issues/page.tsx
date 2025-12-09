'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import DashboardLayout from '@/components/layout/DashboardLayout'
import TestLocallyGuide from '@/components/modals/TestLocallyGuide'
import ClarificationModal from '@/components/modals/ClarificationModal'
import { useRepository } from '@/contexts/RepositoryContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useUserData } from '@/hooks/useUserData'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  LinkIcon,
  CalendarIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  TagIcon
} from '@heroicons/react/24/outline'

interface GitHubIssue {
  number: number
  title: string
  body: string
  html_url: string
  state: string
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  comments: number
  created_at: string
  updated_at: string
}

interface IssueFix {
  id: string
  issueNumber: number
  issueTitle: string
  status: string
  analysis?: any
  proposedFix?: {
    operations?: any[]
    files?: any[]
    diff?: string
  }
  explanation?: string
  confidence?: number
  prUrl?: string
  prNumber?: number
  errorMessage?: string
}

export default function IssuesPage() {
  const { selectedRepository } = useRepository()
  const { isCollapsed } = useSidebar()
  const { userData } = useUserData()
  const queryClient = useQueryClient()

  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null)
  const [processingIssues, setProcessingIssues] = useState<Set<number>>(new Set())
  const [showFixModal, setShowFixModal] = useState(false)
  const [currentFix, setCurrentFix] = useState<IssueFix | null>(null)
  const [pollingJobId, setPollingJobId] = useState<string | null>(null)

  // PR editing state
  const [editMode, setEditMode] = useState(false)
  const [editedPRTitle, setEditedPRTitle] = useState('')
  const [editedPRDescription, setEditedPRDescription] = useState('')
  const [editedFiles, setEditedFiles] = useState<any[]>([])
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [isDownloadingPackage, setIsDownloadingPackage] = useState(false)
  const [showTestGuide, setShowTestGuide] = useState(false)
  const [showClarificationModal, setShowClarificationModal] = useState(false)
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([])
  const [clarificationAmbiguities, setClarificationAmbiguities] = useState<string[]>([])

  // Fetch GitHub issues
  const {
    data: issuesData,
    isLoading: issuesLoading,
    error: issuesError,
    refetch: refetchIssues
  } = useQuery({
    queryKey: ['github-issues', selectedRepository?.id],
    queryFn: async () => {
      if (!selectedRepository?.id) return { issues: [] }
      const response = await fetch(`/api/issues/list?repositoryId=${selectedRepository.id}`)
      if (!response.ok) throw new Error('Failed to fetch issues')
      return await response.json()
    },
    enabled: !!selectedRepository?.id,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Poll for fix status
  useEffect(() => {
    if (!pollingJobId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/issues/fix-status/${pollingJobId}`)
        if (!response.ok) throw new Error('Failed to fetch fix status')

        const data = await response.json()

        if (data.fix) {
          setCurrentFix(data.fix)

          // Stop polling if completed, failed, or ready for review
          if (['COMPLETED', 'FAILED', 'READY_FOR_REVIEW', 'CANCELLED'].includes(data.fix.status)) {
            setPollingJobId(null)
            setProcessingIssues(prev => {
              const next = new Set(prev)
              next.delete(data.fix.issueNumber)
              return next
            })
          }
        }
      } catch (error) {
        console.error('Error polling fix status:', error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [pollingJobId])

  const handleAutoFix = async (issue: GitHubIssue) => {
    if (!selectedRepository?.id) return

    setProcessingIssues(prev => new Set(prev).add(issue.number))
    setSelectedIssue(issue)

    try {
      const response = await fetch('/api/issues/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueBody: issue.body || '',
          issueUrl: issue.html_url
        })
      })

      if (!response.ok) throw new Error('Failed to start analysis')

      const data = await response.json()
      setPollingJobId(data.jobId)
      setShowFixModal(true)
    } catch (error) {
      console.error('Error starting auto-fix:', error)
      setProcessingIssues(prev => {
        const next = new Set(prev)
        next.delete(issue.number)
        return next
      })
    }
  }

  const handleCreatePR = async () => {
    if (!currentFix) return

    try {
      const response = await fetch('/api/issues/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueFixId: currentFix.id,
          // Send edited data if in edit mode
          customTitle: editMode ? editedPRTitle : undefined,
          customDescription: editMode ? editedPRDescription : undefined,
          customFiles: editMode ? editedFiles : undefined
        })
      })

      if (!response.ok) throw new Error('Failed to create PR')

      const data = await response.json()
      setCurrentFix(prev => prev ? { ...prev, prUrl: data.prUrl, prNumber: data.prNumber, status: 'COMPLETED' } : null)
      setEditMode(false)
      refetchIssues()
    } catch (error) {
      console.error('Error creating PR:', error)
    }
  }

  const handleTestLocally = async () => {
    if (!currentFix || !selectedRepository) return

    setIsDownloadingPackage(true)
    try {
      // Download test package with Docker, tests, and .git folder
      const response = await fetch('/api/issues/generate-test-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueFixId: currentFix.id,
          repositoryId: selectedRepository.id,
          includeGit: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate test package')
      }

      // Download the zip file
      const blob = await response.blob()

      // Check if blob is empty
      if (blob.size === 0) {
        throw new Error('Received empty file from server')
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedRepository.name}-issue-${currentFix.issueNumber}-test-package.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Show success message
      alert(`Test package downloaded successfully! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
    } catch (error) {
      console.error('Error generating test package:', error)
      alert(`Failed to generate test package: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDownloadingPackage(false)
    }
  }

  const handleClarificationSubmit = async (answers: Array<{ question: string; answer: string }>) => {
    if (!currentFix) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL}/clarification/submit-clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_fix_id: currentFix.id,
          answers
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to submit clarification')
      }

      // Close modal and refresh issue fixes
      setShowClarificationModal(false)
      alert('Clarification submitted successfully! The fix will be regenerated with your answers.')

      // Refresh to show updated status
      queryClient.invalidateQueries({ queryKey: ['issue-fixes', selectedRepository?.id] })
    } catch (error) {
      console.error('Error submitting clarification:', error)
      throw error // Re-throw to let modal handle error display
    }
  }

  // Initialize edit mode when fix is ready
  useEffect(() => {
    if (currentFix?.status === 'READY_FOR_REVIEW' && currentFix.proposedFix) {
      const operations = currentFix.proposedFix.operations || currentFix.proposedFix.files || []
      setEditedFiles(operations)
      setEditedPRTitle(`Fix: ${currentFix.issueTitle}`)
      setEditedPRDescription(currentFix.explanation || '')
      setSelectedFileIndex(0)
    }
  }, [currentFix?.status, currentFix?.proposedFix, currentFix?.issueTitle, currentFix?.explanation])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs"><ClockIcon className="w-3 h-3" />Queued</span>
      case 'ANALYZING':
        return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs"><ArrowPathIcon className="w-3 h-3 animate-spin" />Analyzing...</span>
      case 'RETRIEVING_CODE':
        return <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs"><CodeBracketIcon className="w-3 h-3" />Finding code...</span>
      case 'GENERATING_FIX':
        return <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs"><SparklesIcon className="w-3 h-3" />Generating fix...</span>
      case 'VALIDATING':
        return <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs"><CheckCircleIcon className="w-3 h-3" />Validating...</span>
      case 'READY_FOR_REVIEW':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs"><CheckCircleIcon className="w-3 h-3" />Ready</span>
      case 'CREATING_PR':
        return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs"><ArrowPathIcon className="w-3 h-3 animate-spin" />Creating PR...</span>
      case 'COMPLETED':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs"><CheckCircleIcon className="w-3 h-3" />Completed</span>
      case 'NEEDS_CLARIFICATION':
        return <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs"><ExclamationTriangleIcon className="w-3 h-3" />Needs Clarification</span>
      case 'FAILED':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs"><XCircleIcon className="w-3 h-3" />Failed</span>
      default:
        return <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs">{status}</span>
    }
  }

  const issues = issuesData?.issues || []

  if (!selectedRepository) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No repository selected</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a repository from the sidebar to view issues</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SparklesIcon className="w-7 h-7 text-emerald-500" />
                Auto-Fix Issues
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                AI-powered issue analysis and automatic fix generation for {selectedRepository.name}
              </p>
            </div>
            <button
              onClick={() => refetchIssues()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {issuesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ArrowPathIcon className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading issues...</p>
              </div>
            </div>
          ) : issuesError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to load issues</h3>
                <p className="text-slate-600 dark:text-slate-400">{(issuesError as Error).message}</p>
              </div>
            </div>
          ) : issues.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No open issues!</h3>
                <p className="text-slate-600 dark:text-slate-400">This repository has no open issues to fix.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {issues.map((issue: GitHubIssue) => (
                <div
                  key={issue.number}
                  className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Issue Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">#{issue.number}</span>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{issue.title}</h3>
                          </div>

                          {/* Issue Body Preview */}
                          {issue.body && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                              {issue.body}
                            </p>
                          )}

                          {/* Issue Metadata */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" />
                              {issue.user.login}
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {new Date(issue.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                              {issue.comments} comments
                            </div>
                            <a
                              href={issue.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              View on GitHub
                            </a>
                          </div>

                          {/* Labels */}
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {issue.labels.map((label) => (
                                <span
                                  key={label.name}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: `#${label.color}20`,
                                    color: `#${label.color}`
                                  }}
                                >
                                  <TagIcon className="w-3 h-3" />
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleAutoFix(issue)}
                      disabled={processingIssues.has(issue.number)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${processingIssues.has(issue.number)
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md hover:shadow-lg'
                        }`}
                    >
                      {processingIssues.has(issue.number) ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4" />
                          Auto-Fix
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fix Status Modal */}
        {showFixModal && currentFix && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Issue #{currentFix.issueNumber}: {currentFix.issueTitle}</h2>
                  <div className="mt-2">{getStatusBadge(currentFix.status)}</div>
                </div>
                <button
                  onClick={() => {
                    setShowFixModal(false)
                    setCurrentFix(null)
                    setPollingJobId(null)
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <XCircleIcon className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* NEEDS_CLARIFICATION Status Display */}
                {currentFix.status === 'NEEDS_CLARIFICATION' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">❓ Clarification Needed</h3>
                      {currentFix.errorMessage && (
                        <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{currentFix.errorMessage}</p>
                      )}
                      {!currentFix.errorMessage && (
                        <p className="text-sm text-amber-700 dark:text-amber-300">The AI needs more information to generate an accurate fix.</p>
                      )}
                    </div>

                    {/* Answer Questions Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          // Fetch clarification questions
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL}/clarification/clarification-questions/${currentFix.id}`)
                            if (response.ok) {
                              const data = await response.json()
                              setClarificationQuestions(data.clarifying_questions || [])
                              setClarificationAmbiguities(data.ambiguities || [])
                              setShowClarificationModal(true)
                            } else {
                              alert('Failed to load clarification questions')
                            }
                          } catch (error) {
                            console.error('Error loading clarification questions:', error)
                            alert('Failed to load clarification questions')
                          }
                        }}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                        Answer Questions
                      </button>
                      <button
                        onClick={() => {
                          setShowFixModal(false)
                          setCurrentFix(null)
                        }}
                        className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* FAILED Status Display */}
                {currentFix.status === 'FAILED' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">❌ Fix Generation Failed</h3>
                      {currentFix.errorMessage && (
                        <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">{currentFix.errorMessage}</p>
                      )}
                      {!currentFix.errorMessage && (
                        <p className="text-sm text-red-700 dark:text-red-300">The automated fix failed validation. This could be due to:</p>
                      )}
                      <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
                        <li>API rate limiting (too many requests)</li>
                        <li>Incomplete or incorrect code generation</li>
                        <li>Missing required dependencies or context</li>
                      </ul>
                    </div>

                    {/* Retry Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowFixModal(false)
                          setCurrentFix(null)
                          // Trigger retry by calling handleAutoFix again
                          const issue = issuesData?.issues?.find((i: GitHubIssue) => i.number === currentFix.issueNumber)
                          if (issue) {
                            setTimeout(() => handleAutoFix(issue), 500)
                          }
                        }}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        Retry Auto-Fix
                      </button>
                      <button
                        onClick={() => {
                          setShowFixModal(false)
                          setCurrentFix(null)
                        }}
                        className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {currentFix.status === 'READY_FOR_REVIEW' && (
                  <>
                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditMode(false)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!editMode
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          📊 Preview
                        </button>
                        <button
                          onClick={() => setEditMode(true)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editMode
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          ✏️ Edit PR
                        </button>
                      </div>
                    </div>

                    {!editMode ? (
                      <>
                        {/* Preview Mode - Analysis */}
                        {currentFix.analysis && (
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Analysis</h3>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
                              <p className="text-slate-700 dark:text-slate-300"><strong>Root Cause:</strong> {currentFix.analysis.root_cause}</p>
                              <p className="text-slate-700 dark:text-slate-300"><strong>Strategy:</strong> {currentFix.analysis.fix_strategy}</p>
                              <p className="text-slate-700 dark:text-slate-300"><strong>Risk Level:</strong> {currentFix.analysis.risk_level}</p>
                            </div>
                          </div>
                        )}

                        {/* Confidence Score */}
                        {currentFix.confidence !== undefined && currentFix.confidence !== null && (
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Confidence Score</h3>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all ${currentFix.confidence >= 0.8 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                    currentFix.confidence >= 0.5 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                      'bg-gradient-to-r from-red-500 to-red-600'
                                    }`}
                                  style={{ width: `${currentFix.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(currentFix.confidence * 100)}%</span>
                            </div>
                            {currentFix.confidence < 0.5 && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                ⚠️ Low confidence - manual review highly recommended
                              </p>
                            )}
                          </div>
                        )}

                        {/* PR Description Preview */}
                        {currentFix.explanation && (
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">PR Description</h3>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{currentFix.explanation}</p>
                            </div>
                          </div>
                        )}

                        {/* File Changes Preview */}
                        {currentFix.proposedFix && (
                          <>
                            {/* Show unified diff if available (PRIMARY format - RECOMMENDED VIEW) */}
                            {currentFix.proposedFix.diff && (
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                  Unified Diff
                                  <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                                    Recommended View
                                  </span>
                                </h3>
                                <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto">
                                  <pre className="text-xs text-slate-100 font-mono whitespace-pre">
                                    {currentFix.proposedFix.diff.split('\n').map((line: string, idx: number) => (
                                      <div
                                        key={idx}
                                        className={
                                          line.startsWith('+') && !line.startsWith('+++')
                                            ? 'bg-green-900/30 text-green-300'
                                            : line.startsWith('-') && !line.startsWith('---')
                                              ? 'bg-red-900/30 text-red-300'
                                              : line.startsWith('@@')
                                                ? 'text-cyan-400 font-semibold'
                                                : line.startsWith('diff') || line.startsWith('---') || line.startsWith('+++')
                                                  ? 'text-yellow-400'
                                                  : 'text-slate-300'
                                        }
                                      >
                                        {line || ' '}
                                      </div>
                                    ))}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* Show operations if available (LEGACY fallback - only shown if no unified diff) */}
                            {!currentFix.proposedFix.diff && (currentFix.proposedFix.operations || currentFix.proposedFix.files) && (
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                                  File Changes ({(currentFix.proposedFix?.operations || currentFix.proposedFix?.files || []).length} files)
                                </h3>
                                <div className="space-y-3">
                                  {(currentFix.proposedFix?.operations || currentFix.proposedFix?.files || []).map((file: any, idx: number) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${file.type === 'create'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                          }`}>
                                          {file.type || 'modify'}
                                        </span>
                                        <CodeBracketIcon className="w-4 h-4 text-emerald-500" />
                                        <span className="font-mono text-sm text-slate-900 dark:text-white">{file.path}</span>
                                      </div>
                                      {file.reason && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{file.reason}</p>
                                      )}

                                      {/* NEW: Show file in unified diff format like VS Code git diff */}
                                      {file.type === 'edit' && file.edits ? (
                                        <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                                          <div className="bg-slate-900 dark:bg-slate-950">
                                            <pre className="text-xs p-3 overflow-x-auto max-h-96">
                                              {file.edits.map((edit: any, editIdx: number) => {
                                                const lines: React.JSX.Element[] = [];

                                                // Add context about the edit
                                                if (edit.description || edit.explanation) {
                                                  lines.push(
                                                    <div key={`header-${editIdx}`} className="text-cyan-400 font-semibold mb-2">
                                                      @@ {edit.description || edit.explanation} @@
                                                    </div>
                                                  );
                                                }

                                                // SMART DISPLAY: If old_code/new_code are very large (>100 lines),
                                                // show a collapsed summary instead of rendering thousands of lines
                                                const oldCode = edit.old_code || edit.search || '';
                                                const newCode = edit.new_code || edit.replace || '';
                                                const oldLines = oldCode.split('\\n');
                                                const newLines = newCode.split('\\n');

                                                // Check if this is a complete file replacement (large edit)
                                                const isLargeEdit = oldLines.length > 100 || newLines.length > 100;

                                                if (isLargeEdit) {
                                                  // Show summary for large files instead of full content
                                                  lines.push(
                                                    <div key={`large-edit-${editIdx}`} className="text-yellow-400 bg-yellow-900/20 p-3 rounded my-2">
                                                      ⚠️ Large file edit detected ({oldLines.length} → {newLines.length} lines)
                                                      <br />
                                                      See the &quot;Unified Diff&quot; section above for detailed changes.
                                                      <br />
                                                      <span className="text-xs text-slate-400">
                                                        Tip: The unified diff shows only the changed lines, making it easier to review.
                                                      </span>
                                                    </div>
                                                  );
                                                } else {
                                                  // Show full diff for small edits
                                                  // Show removed lines (old_code)
                                                  if (oldCode) {
                                                    oldLines.forEach((line: string, lineIdx: number) => {
                                                      lines.push(
                                                        <div key={`old-${editIdx}-${lineIdx}`} className="bg-red-900/30 text-red-300">
                                                          - {line}
                                                        </div>
                                                      );
                                                    });
                                                  }

                                                  // Show added lines (new_code)
                                                  if (newCode) {
                                                    newLines.forEach((line: string, lineIdx: number) => {
                                                      lines.push(
                                                        <div key={`new-${editIdx}-${lineIdx}`} className="bg-green-900/30 text-green-300">
                                                          + {line}
                                                        </div>
                                                      );
                                                    });
                                                  }
                                                } return lines;
                                              })}
                                            </pre>
                                          </div>
                                        </div>
                                      ) : (
                                        // Show full content for "create" operations
                                        <pre className="text-xs bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded overflow-x-auto max-h-64">
                                          <code>{file.content || file.modified || '(No content)'}</code>
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Edit Mode */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Edit PR Title</h3>
                          <input
                            type="text"
                            value={editedPRTitle}
                            onChange={(e) => setEditedPRTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="PR title..."
                          />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Edit PR Description</h3>
                          <textarea
                            value={editedPRDescription}
                            onChange={(e) => setEditedPRDescription(e.target.value)}
                            rows={10}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                            placeholder="PR description..."
                          />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Edit File Changes</h3>
                          {editedFiles.length > 0 && (
                            <>
                              {/* File Tabs */}
                              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {editedFiles.map((file, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedFileIndex(idx)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedFileIndex === idx
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      }`}
                                  >
                                    {file.path}
                                  </button>
                                ))}
                              </div>

                              {/* Selected File Editor */}
                              {editedFiles[selectedFileIndex] && (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={editedFiles[selectedFileIndex].path}
                                    onChange={(e) => {
                                      const newFiles = [...editedFiles]
                                      newFiles[selectedFileIndex].path = e.target.value
                                      setEditedFiles(newFiles)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                                    placeholder="File path..."
                                  />
                                  <textarea
                                    value={editedFiles[selectedFileIndex].content || editedFiles[selectedFileIndex].modified}
                                    onChange={(e) => {
                                      const newFiles = [...editedFiles]
                                      if ('content' in newFiles[selectedFileIndex]) {
                                        newFiles[selectedFileIndex].content = e.target.value
                                      } else {
                                        newFiles[selectedFileIndex].modified = e.target.value
                                      }
                                      setEditedFiles(newFiles)
                                    }}
                                    rows={20}
                                    className="w-full px-4 py-2 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg font-mono text-xs"
                                    placeholder="File content..."
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={handleTestLocally}
                        disabled={isDownloadingPackage}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isDownloadingPackage ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Test Locally
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCreatePR}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        {editMode ? 'Create PR with Edits' : 'Create Pull Request'}
                      </button>
                      <button
                        onClick={() => {
                          setShowFixModal(false)
                          setCurrentFix(null)
                          setPollingJobId(null)
                          setEditMode(false)
                        }}
                        className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {currentFix.status === 'COMPLETED' && currentFix.prUrl && (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pull Request Created!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">PR #{currentFix.prNumber} has been created successfully</p>
                    <a
                      href={currentFix.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <LinkIcon className="w-5 h-5" />
                      View Pull Request
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Locally Guide Modal */}
      {showTestGuide && selectedRepository && currentFix && (
        <TestLocallyGuide
          isOpen={showTestGuide}
          onClose={() => setShowTestGuide(false)}
          repoName={selectedRepository.name}
          issueNumber={currentFix.issueNumber}
        />
      )}

      {/* Clarification Modal */}
      {showClarificationModal && currentFix && (
        <ClarificationModal
          isOpen={showClarificationModal}
          onClose={() => setShowClarificationModal(false)}
          issueFixId={currentFix.id}
          questions={clarificationQuestions}
          ambiguities={clarificationAmbiguities}
          confidence={currentFix.confidence || 0}
          onSubmit={handleClarificationSubmit}
        />
      )}
    </DashboardLayout>
  )
}
